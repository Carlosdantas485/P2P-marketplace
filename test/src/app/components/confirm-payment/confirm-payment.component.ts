import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { InventoryService } from '../../services/inventory.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

interface ItemCompra {
  id: number | string;
  nome?: string;
  title?: string;
  preco: number;
  imagem?: string;
  float?: number;
  fromWishlist?: boolean;
}

interface ResultadoCompra {
  item: ItemCompra;
  sucesso: boolean;
  erro?: string;
}

interface DadosPagamento {
  metodo: 'saldo' | 'cartao' | 'pix' | 'boleto';
  cartao?: {
    numero: string;
    nome: string;
    validade: string;
    cvv: string;
  };
  pixCode?: string;
  boleto?: string;
}

// Define o tipo Timer para melhor tipagem
type Timer = ReturnType<typeof setTimeout>;

@Component({
  selector: 'app-confirm-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, NgClass],
  templateUrl: './confirm-payment.component.html',
  styleUrls: ['./confirm-payment.component.css']
})
export class ConfirmPaymentComponent implements OnInit, OnDestroy {
  // Gerenciamento de assinaturas e timers
  private timers: Timer[] = [];
  private subscriptions: Subscription[] = [];
  
  // Dados do formulário
  formData = {
    nomeTitular: '',
    numeroCartao: '',
    validade: '',
    cvv: ''
  };

  // Estados do componente
  resultados: ResultadoCompra[] = [];
  items: ItemCompra[] = [];
  total: number = 0;
  loading = false;
  successMsg = '';
  errorMsg = '';
  metodoPagamento: 'saldo' | 'cartao' | 'pix' | 'boleto' = 'saldo';
  cartaoInfo = { 
    numero: '', 
    nome: '',
    validade: '', 
    cvv: '' 
  };
  readonly pixCopiaCola = '00020126360014BR.GOV.BCB.PIX0114+5599999999995204000053039865405100.005802BR5920NOME DO RECEBEDOR6009SAO PAULO62070503***6304B14F';
  readonly boletoLinhaDigitavel = '34191.79001 01043.510047 91020.150008 6 89470026000';

  // Informações do usuário
  userBalance: number = 1500; // Saldo fictício do usuário

  onMetodoPagamentoChange(metodo: 'saldo' | 'cartao' | 'pix' | 'boleto'): void {
    this.metodoPagamento = metodo;
    this.clearMessages();

    // Limpa os dados do cartão se não for o método selecionado
    if (metodo !== 'cartao') {
      this.cartaoInfo = { numero: '', nome: '', validade: '', cvv: '' };
    }

    // Mensagem específica para cada método de pagamento
    if (metodo === 'pix') {
      this.setSuccess('O código PIX será exibido após a confirmação do pedido.');
    } else if (metodo === 'boleto') {
      this.setSuccess('O boleto será gerado após a confirmação do pedido.');
    } else if (metodo === 'saldo') {
      if (this.userBalance < this.total) {
        this.setError('Saldo insuficiente. Por favor, escolha outro método de pagamento.');
      } else {
        this.setSuccess(`Saldo disponível: R$ ${this.userBalance.toFixed(2)}`);
      }
    }
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private inventoryService: InventoryService,
    private wishlistService: WishlistService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get the navigation state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state;
    
    if (state) {
      console.log('Navigation state received:', state);
      this.processItems(state);
    } else {
      // If no state in navigation, try to get it from history state
      const historyState = window.history.state;
      if (historyState && historyState.items) {
        console.log('State from history:', historyState);
        this.processItems(historyState);
      } else {
        console.warn('No items found in navigation state or history');
        this.router.navigate(['/inventory']);
      }
    }
    
    // Calculate total if not defined
    if (this.total === 0 && this.items.length > 0) {
      this.total = this.items.reduce((sum, item) => sum + (item.preco || 0), 0);
    }

    // Define o método de pagamento padrão
    this.onMetodoPagamentoChange('saldo');
  }

  private processItems(state: any): void {
    console.log('Processing items from state:', state);
    
    if (state?.items && Array.isArray(state.items)) {
      console.log('Items received in navigation state:', state.items);

      // Map items to ensure all required properties are present
      this.items = state.items.map((item: any) => ({
        id: item.id || this.generateUniqueId(),
        name: item.name || item.nome || 'Item sem nome',
        nome: item.nome || item.name || 'Item sem nome',
        price: item.price || item.preco || 0,
        preco: item.preco || item.price || 0,
        image: item.image || item.imagem || 'assets/placeholder-image.png',
        imagem: item.imagem || item.image || 'assets/placeholder-image.png',
        float: item.float || 0,
        title: item.title || item.name || item.nome || 'Item sem nome',
        fromWishlist: state.fromWishlist || false
      }));
      
      console.log('Mapped items for template:', this.items);
      
      // Calculate total if not provided
      this.total = state.total !== undefined ? 
                 state.total : 
                 this.items.reduce((sum, item) => sum + (item.preco || 0), 0);
      
      console.log('Calculated total:', this.total);
      
      // If we have items, don't redirect
      if (this.items.length > 0) {
        return;
      }
    } else {
      console.warn('No valid items array found in state');
    }
    
    // If we get here, either there are no items or there was an error
    console.warn('No items found in navigation state');
    this.router.navigate(['/inventory']);
  }
  
  // Helper function to generate a unique ID if needed
  private generateUniqueId(): string {
    return 'item-' + Math.random().toString(36).substr(2, 9);
  }

  public ngOnDestroy(): void {
    // Cancela todos os timers ativos
    if (this.timers && this.timers.length > 0) {
      this.timers.forEach(timer => clearTimeout(timer));
      this.timers = [];
    }

    // Cancela todas as assinaturas ativas
    if (this.subscriptions && this.subscriptions.length > 0) {
      this.subscriptions.forEach(sub => {
        if (sub && !sub.closed) {
          sub.unsubscribe();
        }
      });
      this.subscriptions = [];
    }
  }

  public confirmarCompra(): void {
    if (!this.items || this.items.length === 0) {
      this.setError('Nenhum item selecionado para compra.');
      return;
    }
    
    // Converte os IDs para string se necessário
    const skinIds = this.items.map(item => item.id.toString());

    this.setLoading(true);
    this.clearMessages();

    // Valida o método de pagamento selecionado
    const pagamentoValido = this.validarMetodoPagamento();
    if (!pagamentoValido) {
      this.setLoading(false);
      return;
    }

    // Verifica se o usuário está logado
    const compradorId = this.authService.currentUserValue?.id;
    if (!compradorId) {
      this.setError('Você precisa estar logado para finalizar a compra.');
      this.setLoading(false);
      return;
    }

    // Prepara os dados da compra
    const dadosPagamento: DadosPagamento = {
      metodo: this.metodoPagamento,
    };

    // Adiciona os dados específicos do método de pagamento
    if (this.metodoPagamento === 'cartao') {
      dadosPagamento.cartao = this.cartaoInfo;
    } else if (this.metodoPagamento === 'pix') {
      dadosPagamento.pixCode = this.pixCopiaCola;
    } else if (this.metodoPagamento === 'boleto') {
      dadosPagamento.boleto = this.boletoLinhaDigitavel;
    }

    // Simula o processamento do pagamento
    const sub = this.inventoryService.purchaseMultiple(skinIds, dadosPagamento).subscribe({
      next: (res) => {
        this.processarResultadoCompra(res);
        // Navega para a página de confirmação após 3 segundos
        const timer = setTimeout(() => {
          this.router.navigate(['/pedido-concluido'], { 
            state: { 
              orderId: res.orderId || 'N/A',
              items: this.items,
              total: this.total
            }
          });
        }, 3000);
        this.timers.push(timer);
      },
      error: (err) => {
        this.setLoading(false);
        this.setError(err.error?.message || 'Erro ao processar o pagamento. Tente novamente.');
      },
      complete: () => {}
    });

    this.subscriptions.push(sub);
  }

  private validarMetodoPagamento(): boolean {
    // Validações gerais
    if (!this.items || this.items.length === 0) {
      return false;
    }

    // Validações específicas para cada método de pagamento
    switch (this.metodoPagamento) {
      case 'cartao':
        if (!this.cartaoInfo.numero || !this.cartaoInfo.nome || !this.cartaoInfo.validade || !this.cartaoInfo.cvv) {
          this.setError('Preencha todos os dados do cartão.');
          return false;
        }

        // Validação básica do número do cartão (pode ser aprimorada)
        const cardNumber = this.cartaoInfo.numero.replace(/\s+/g, '');
        if (cardNumber.length < 15 || cardNumber.length > 19) {
          this.setError('Número de cartão inválido.');
          return false;
        }

        // Validação da data de validade (MM/AA)
        if (!/^\d{2}\/\d{2}$/.test(this.cartaoInfo.validade)) {
          this.setError('Formato de validade inválido. Use MM/AA.');
          return false;
        }

        // Validação do CVV
        if (!/^\d{3,4}$/.test(this.cartaoInfo.cvv)) {
          this.setError('CVV inválido. Deve conter 3 ou 4 dígitos.');
          return false;
        }
        break;

      case 'saldo':
        if (this.userBalance < this.total) {
          this.setError('Saldo insuficiente. Por favor, escolha outro método de pagamento.');
          return false;
        }
        break;

      case 'pix':
        if (!this.pixCopiaCola) {
          this.setError('Não foi possível gerar o código PIX. Tente novamente.');
          return false;
        }
        break;

      case 'boleto':
        if (!this.boletoLinhaDigitavel) {
          this.setError('Não foi possível gerar o boleto. Tente novamente.');
          return false;
        }
        break;
    }

    return true;
  }

  private setLoading(loading: boolean): void {
    this.loading = loading;
    if (loading) {
      // Rola para o topo do formulário ao iniciar o carregamento
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private setError(message: string): void {
    this.errorMsg = message;
    this.successMsg = '';
    this.scrollToMessage();
  }

  private setSuccess(message: string): void {
    this.successMsg = message;
    this.errorMsg = '';
    this.scrollToMessage();
  }

  private clearMessages(): void {
    this.successMsg = '';
    this.errorMsg = '';
  }

  private scrollToMessage(): void {
    const timer = setTimeout(() => {
      const element = document.querySelector('.alert');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    this.timers.push(timer);
  }

  // Formata o número do cartão (adiciona espaços a cada 4 dígitos)
  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.value = value;
    this.cartaoInfo.numero = value;
  }

  formatCardExpiry(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    input.value = value;
    this.cartaoInfo.validade = value;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Feedback visual pode ser adicionado aqui
      console.log('Texto copiado para a área de transferência');
    }).catch(err => {
      console.error('Erro ao copiar texto:', err);
    });
  }

  /**
   * Remove um item da lista de desejos
   * @param itemId ID do item a ser removido
   */
  private removerDaWishlist(itemId: number | string): void {
    try {
      this.wishlistService.removeItem(itemId);
      console.log(`Item ${itemId} removido da wishlist com sucesso`);
    } catch (error) {
      console.error('Erro ao remover item da wishlist:', error);
    }
  }

  /**
   * Processa o resultado da compra
   * @param res Resposta da API de compra
   */
  private processarResultadoCompra(res: any): void {
    try {
      if (!res) {
        throw new Error('Resposta inválida do servidor');
      }

      // Processa os resultados da compra
      if (res.results && Array.isArray(res.results)) {
        this.resultados = this.items.map(item => {
          const resultado = res.results.find((r: any) => r.skinId == item.id);
          
          // Remove da wishlist se a compra foi bem-sucedida
          if (resultado?.sucesso && item.fromWishlist) {
            this.removerDaWishlist(item.id);
          }

          return {
            item: { ...item },
            sucesso: resultado?.sucesso || false,
            erro: resultado?.erro
          };
        });
      } else {
        // Se não houver resultados individuais, assume que todos foram processados com sucesso
        this.resultados = this.items.map(item => {
          if (item.fromWishlist) {
            this.removerDaWishlist(item.id);
          }
          return { 
            item: { ...item },
            sucesso: true 
          };
        });
      }

      // Atualiza a interface
      const comprados = this.resultados
        .filter(r => r.sucesso)
        .map(r => r.item.nome || r.item.title || String(r.item.id));

      const falhas = this.resultados
        .filter(r => !r.sucesso)
        .map(r => ({
          id: r.item.id,
          nome: r.item.nome || r.item.title || String(r.item.id),
          erro: r.erro || 'Erro desconhecido'
        }));

      // Exibe mensagens de sucesso/erro
      if (comprados.length > 0) {
        this.setSuccess(`Itens comprados com sucesso: ${comprados.join(', ')}`);
      }

      if (falhas.length > 0) {
        const erros = falhas.map(f => `${f.nome}: ${f.erro}`).join('; ');
        this.setError(`Falha ao processar alguns itens: ${erros}`);
      }

      // Navega de volta para o inventário após 5 segundos
      const timer = setTimeout(() => {
        this.router.navigate(['/inventory']);
      }, 5000);
      this.timers.push(timer);

    } catch (error) {
      console.error('Erro ao processar resultado da compra:', error);
      this.setError('Ocorreu um erro ao processar sua compra. Por favor, tente novamente.');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Formata um valor numérico para moeda brasileira (BRL)
   * @param value Valor a ser formatado
   * @returns String formatada como moeda
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}
