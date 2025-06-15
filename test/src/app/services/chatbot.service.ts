import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl = 'http://localhost:3000/api/chatbot'; // Ajuste a URL conforme necessário

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<any> {
    // Respostas padrão para mensagens comuns
    const defaultResponses: {[key: string]: string} = {
      'oi': 'Olá! Como posso ajudar você hoje?',
      'olá': 'Olá! Como posso ajudar você hoje?',
      'ajuda': 'Posso te ajudar com informações sobre produtos, compras, vendas e mais. O que você gostaria de saber?',
      'comprar': 'Para comprar um produto, navegue até a página do produto desejado e clique em "Comprar".',
      'vender': 'Para vender um produto, acesse seu inventário e clique em "Adicionar Item".',
      'preço': 'Os preços são definidos pelos vendedores. Você pode negociar diretamente com o vendedor na página do produto.',
      'entrega': 'O prazo de entrega varia de acordo com o método de envio escolhido. Normalmente entre 2 a 10 dias úteis.',
      'pagamento': 'Aceitamos várias formas de pagamento, incluindo cartão de crédito, boleto e PIX.'
    };

    const lowerMessage = message.toLowerCase().trim();
    
    // Verifica se há uma resposta padrão
    for (const [key, response] of Object.entries(defaultResponses)) {
      if (lowerMessage.includes(key)) {
        return of({ reply: response });
      }
    }

    // Se não houver resposta padrão, envia para a API
    return this.http.post(this.apiUrl, { message })
      .pipe(
        catchError(error => {
          console.error('Erro ao enviar mensagem para o chatbot:', error);
          return of({ reply: 'Desculpe, estou tendo dificuldades para me conectar. Por favor, tente novamente mais tarde.' });
        })
      );
  }
}
