import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../services/chatbot.service';
import { trigger, state, style, animate, transition } from '@angular/animations';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [ChatbotService],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
  animations: [
    trigger('slideInOut', [
      state('in', style({
        transform: 'translateY(0)',
        opacity: 1
      })),
      state('out', style({
        transform: 'translateY(100%)',
        opacity: 0
      })),
      transition('in => out', animate('200ms ease-in-out')),
      transition('out => in', animate('200ms ease-in-out'))
    ]),
    trigger('fadeInOut', [
      state('in', style({
        opacity: 1
      })),
      state('out', style({
        opacity: 0
      })),
      transition('in <=> out', animate('200ms ease-in-out'))
    ])
  ]
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;
  
  isOpen = false;
  isLoading = false;
  isServerAvailable = false;
  messages: Message[] = [];
  userInput = '';
  unreadMessages = 0;
  
  private clickListener: (event: MouseEvent) => void;
  private statusSubscription: Subscription | null = null;

  constructor(private chatbotService: ChatbotService) {
    console.log('ChatbotComponent construído');
    this.clickListener = (event: MouseEvent) => this.handleClickOutside(event);
  }

  ngOnInit(): void {
    console.log('ChatbotComponent inicializado');
    
    // Initial welcome message (will be updated after status check)
    this.addBotMessage('Inicializando assistente virtual...');
    
    // Subscribe to server status changes
    this.statusSubscription = this.chatbotService.serverStatus$.subscribe({
      next: (isAvailable) => {
        const wasAvailable = this.isServerAvailable;
        this.isServerAvailable = isAvailable;
        
        // Add status change message when component is already initialized
        if (this.messages.length > 0 && wasAvailable !== isAvailable) {
          const statusMessage = isAvailable 
            ? '✅ Conexão restabelecida! Como posso ajudar?'
            : '⚠️ Conexão perdida. Algumas funcionalidades podem estar limitadas.';
          this.addBotMessage(statusMessage);
        }
      },
      error: (error) => {
        console.error('Error in status subscription:', error);
        this.isServerAvailable = false;
      }
    });
    
    // Initial status check
    this.checkServerStatus();
  }
  
  private checkServerStatus(): void {
    console.log('Iniciando verificação de status do servidor...');
    this.chatbotService.checkServerStatus()
      .then(isAvailable => {
        console.log('Status do servidor recebido:', isAvailable ? 'online' : 'offline');
        this.isServerAvailable = isAvailable;
        const welcomeMessage = isAvailable
          ? '👋 Olá! Eu sou o assistente virtual. Como posso ajudar você hoje?'
          : '⚠️ Olá! Estou com limitações no momento. Algumas funcionalidades podem não estar disponíveis.';
          
        // Replace the loading message with the welcome message
        if (this.messages.length > 0 && this.messages[0].text === 'Inicializando assistente virtual...') {
          this.messages[0].text = welcomeMessage;
        } else {
          this.addBotMessage(welcomeMessage);
        }
      })
      .catch(error => {
        console.error('Error checking server status:', error);
        this.isServerAvailable = false;
        if (this.messages.length > 0 && this.messages[0].text === 'Inicializando assistente virtual...') {
          this.messages[0].text = '⚠️ Não foi possível conectar ao servidor. Tentando novamente...';
        }
      });
  }

  ngOnDestroy(): void {
    // Remove o event listener ao destruir o componente
    document.removeEventListener('click', this.clickListener);
    
    // Clean up subscriptions
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
  }

  toggleChat(event?: MouseEvent): void {
    // Se o evento veio de um clique, previne a propagação
    if (event) {
      event.stopPropagation();
    }
    
    const wasOpen = this.isOpen;
    this.isOpen = !wasOpen;
    
    if (this.isOpen) {
      // Zera as notificações não lidas ao abrir o chat
      this.unreadMessages = 0;
      
      // Adiciona o event listener quando o chat é aberto
      setTimeout(() => {
        document.addEventListener('click', this.clickListener);
        this.focusInput();
        this.scrollToBottom();
      }, 100);
    } else {
      // Remove o event listener quando o chat é fechado
      document.removeEventListener('click', this.clickListener);
    }
  }
  
  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  /**
   * Handles quick action button clicks
   * @param action The action to be performed
   */
  quickAction(action: string): void {
    if (!action) return;
    
    // Adiciona a mensagem do usuário diretamente sem chamar sendMessage
    this.addUserMessage(action);
    
    // Processa a ação rápida
    switch (action.toLowerCase()) {
      case 'ajuda com compras':
        this.processShoppingHelp();
        break;
      case 'dúvidas sobre pagamento':
        this.processPaymentHelp();
        break;
      case 'problemas com minha conta':
        this.processAccountHelp();
        break;
      default:
        this.addBotMessage('Como posso ajudar com isso?');
    }
  }

  private processShoppingHelp(): void {
    this.isLoading = true;
    setTimeout(() => {
      this.addBotMessage('Para ajudar com compras, você pode navegar pelos produtos disponíveis na nossa loja. Precisa de ajuda para encontrar algo específico?');
      this.isLoading = false;
    }, 1000);
  }

  private processPaymentHelp(): void {
    this.isLoading = true;
    setTimeout(() => {
      this.addBotMessage('Para dúvidas sobre pagamento, você pode verificar as formas de pagamento aceitas na página do seu carrinho. Posso te ajudar com algo mais?');
      this.isLoading = false;
    }, 1000);
  }

  private processAccountHelp(): void {
    this.isLoading = true;
    setTimeout(() => {
      this.addBotMessage('Para problemas com sua conta, você pode acessar as configurações do seu perfil ou entrar em contato com nosso suporte. Posso te ajudar com mais alguma coisa?');
      this.isLoading = false;
    }, 1000);
  }
  
  private focusInput(): void {
    if (this.messageInput) {
      this.messageInput.nativeElement.focus();
    }
  }
  
  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch(err) { 
      console.error('Erro ao rolar para baixo:', err);
    }
  }

  sendMessage(event?: Event | MouseEvent): void {
    // Se o evento veio de um formulário ou clique, previne o comportamento padrão
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const message = this.userInput.trim();
    if (!message) return;

    // Adiciona a mensagem do usuário
    this.addUserMessage(message);
    this.userInput = '';
    
    // Se o servidor não estiver disponível, responde com mensagem local
    if (!this.isServerAvailable) {
      this.addBotMessage('Desculpe, nosso serviço de chat está temporariamente indisponível. Por favor, tente novamente mais tarde.');
      return;
    }
    
    this.isLoading = true;

    // Envia a mensagem para o serviço do chatbot
    this.chatbotService.sendMessage(message).subscribe({
      next: (response) => {
        this.addBotMessage(response.reply);
        this.isLoading = false;
        
        // Verifica se o servidor continua disponível após a resposta
        this.chatbotService.checkServerStatus().then(available => {
          this.isServerAvailable = available;
        });
      },
      error: (error) => {
        console.error('Erro ao enviar mensagem:', error);
        this.isServerAvailable = false;
        this.addBotMessage('Desculpe, estou com dificuldades técnicas. Por favor, tente novamente mais tarde.');
        this.isLoading = false;
      }
    });
  }

  private addUserMessage(text: string): void {
    this.messages.push({
      text,
      isUser: true,
      timestamp: new Date()
    });
    this.scrollToBottom();
    
    // Incrementa notificações não lidas se o chat estiver fechado
    if (!this.isOpen) {
      this.unreadMessages++;
    }
  }

  private addBotMessage(text: string): void {
    this.messages.push({
      text,
      isUser: false,
      timestamp: new Date()
    });
    this.scrollToBottom();
  }



  @HostListener('document:keydown.enter', ['$event'])
  onEnterKey(event: Event): void {
    // Converte o evento para KeyboardEvent e verifica se é um evento de teclado
    const keyboardEvent = event as KeyboardEvent;
    
    // Verifica se o chat está aberto e se o foco está em um input
    if (this.isOpen && 
        keyboardEvent.target instanceof HTMLInputElement && 
        !(keyboardEvent.target as HTMLInputElement).type.includes('textarea')) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const chatButton = target.closest('.chatbot-button');
    const chatContainer = target.closest('.chatbot-container');
    
    // Fecha o chat se o clique foi fora do chat e do botão
    if (!chatButton && !chatContainer && this.isOpen) {
      this.isOpen = false;
      document.removeEventListener('click', this.clickListener);
    }
  }
}
