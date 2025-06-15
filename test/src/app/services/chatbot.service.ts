import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, Subscription, interval } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService implements OnDestroy {
  private apiUrl = 'http://localhost:5000/api/chat';
  private statusCheckInterval = 30000; // 30 seconds
  private statusCheckSubscription: Subscription | null = null;
  
  private serverStatusSubject = new BehaviorSubject<boolean>(false);
  serverStatus$ = this.serverStatusSubject.asObservable();
  
  get isServerAvailable(): boolean {
    return this.serverStatusSubject.value;
  }

  constructor(private http: HttpClient) {
    this.startStatusChecks();
  }
  
  private startStatusChecks(): void {
    // Initial check
    this.checkServerStatus().then();
    
    // Set up periodic checks
    this.statusCheckSubscription = interval(this.statusCheckInterval).pipe(
      switchMap(() => this.checkServerStatus())
    ).subscribe();
  }
  
  ngOnDestroy(): void {
    if (this.statusCheckSubscription) {
      this.statusCheckSubscription.unsubscribe();
    }
  }

  sendMessage(message: string): Observable<{ reply: string }> {
    const lowerMessage = message.toLowerCase().trim();
    
    // Verifica se a mensagem é de saudação simples
    if (['oi', 'olá', 'ola', 'eae', 'e aí', 'ola!', 'olá!'].includes(lowerMessage)) {
      const greetings = [
        'Olá! Como posso ajudar você hoje?',
        'Oi! Em que posso ajudar?',
        'Olá! Estou aqui para te ajudar.'
      ];
      return of({ reply: greetings[Math.floor(Math.random() * greetings.length)] });
    }

    // Se o servidor não estiver disponível, retorna uma mensagem de erro
    if (!this.isServerAvailable) {
      return of({ 
        reply: '⚠️ Desculpe, estou com dificuldades técnicas. Por favor, tente novamente mais tarde.' 
      });
    }

    // Envia a mensagem para a API do chatbot_simples
    return this.http.post<{ reply: string }>(
      this.apiUrl, 
      { message },
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    ).pipe(
      catchError((error: any) => {
        console.error('Erro ao enviar mensagem para o chatbot:', error);
        this.serverStatusSubject.next(false);
        return of({ 
          reply: '⚠️ Não foi possível processar sua mensagem. Estou verificando a conexão...' 
        });
      })
    );
  }

  // Verifica se o servidor do chatbot está disponível
  async checkServerStatus(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:5000/health', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const isAvailable = data?.status === 'online';
      
      if (!isAvailable) {
        console.warn('Server responded but status is not online', data);
      }
      
      this.serverStatusSubject.next(isAvailable);
      return isAvailable;
      
    } catch (error) {
      console.error('Error checking server status:', error);
      this.serverStatusSubject.next(false);
      return false;
    }
  }
}
