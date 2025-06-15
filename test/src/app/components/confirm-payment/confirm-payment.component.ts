import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { InventoryService } from '../../services/inventory.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';

interface ItemCompra {
  id: number;
  nome?: string;
  title?: string;
  preco: number;
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
    // Tenta pegar do navigation state (navegação programática)
    let state: { items?: ItemCompra[]; total?: number } = {};
    const nav = this.router.getCurrentNavigation();

    if (nav?.extras?.state) {
      state = nav.extras.state as { items?: ItemCompra[]; total?: number };
    } else if (window.history.state?.items || window.history.state?.total) {
      // Fallback para history.state (caso de reload ou navegação direta)
      state = window.history.state as { items?: ItemCompra[]; total?: number };
    }

    this.items = state?.items || [];
    this.total = state?.total || 0;

    // Verifica se há itens no carrinho
    if (this.items.length === 0) {
      // Redireciona para o carrinho se não houver itens
      this.router.navigate(['/inventory']);
      return;
    }

    // Calcula o total se não estiver definido
    if (this.total === 0 && this.items.length > 0) {
      this.total = this.items.reduce((sum, item) => sum + (item.preco || 0), 0);
    }

    // Define o método de pagamento padrão
    this.onMetodoPagamentoChange('saldo');
  }

  ngOnDestroy(): void {
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

  private confirmarCompra(): void {
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
      console.error('Erro ao copiar texto: ', err);
    });
  }

  private removerDaWishlist(skinId: number): void {
    const sub = this.wishlistService.removeFromWishlist(skinId).subscribe({
      next: () => {
        console.log('Item removido da wishlist com sucesso');
      },
      error: (err) => {
        console.error('Erro ao remover da wishlist:', err);
      }
    });
    this.subscriptions.push(sub);
  }

  private processarResultadoCompra(res: any): void {
    try {
      // Verifica se a resposta contém resultados individuais
      if (res.results && Array.isArray(res.results)) {
        this.resultados = this.items.map(item => {
          const r = res.results.find((rr: { skinId: number; sucesso: boolean; erro?: string }) => 
            rr.skinId === item.id
          );
          if (r?.sucesso) {
            this.removerDaWishlist(item.id);
          }
          return { 
            item, 
            sucesso: r?.sucesso || false, 
            erro: r?.erro 
          };
        });
      } else {
        // Se não houver resultados individuais, assume que todos foram processados com sucesso
        this.resultados = this.items.map(item => {
          this.removerDaWishlist(item.id);
          return { item, sucesso: true };
        });
      }

      this.setLoading(false);

      const comprados = this.resultados
        .filter(r => r.sucesso)
        .map(r => r.item.nome || r.item.title || String(r.item.id));

      const falharam = this.resultados
        .filter(r => !r.sucesso)
        .map(r => `${r.item.nome || r.item.title || r.item.id}: ${r.erro || 'Erro desconhecido'}`);

      if (comprados.length > 0) {
        this.setSuccess(`Compra realizada com sucesso para: ${comprados.join(', ')}.`);
      }

      if (falharam.length > 0) {
        this.setError(`Falha ao comprar: ${falharam.join('; ')}.`);
      }

      this.verificarFinalizacaoCompras();
    } catch (error) {
      console.error('Erro ao processar resultado da compra:', error);
      this.setError('Ocorreu um erro ao processar sua compra. Por favor, tente novamente.');
      this.setLoading(false);
    }
  }

  private verificarFinalizacaoCompras(): void {
    if (!this.resultados || !this.items) return;

    const processados = this.resultados.filter(r => r?.sucesso).length;
    const total = this.items.length;

    if (processados === total) {
      this.setSuccess('Todas as compras foram processadas com sucesso!');
      const timer = setTimeout(() => {
        this.router.navigate(['/inventory']);
      }, 2000);
      this.timers.push(timer);
    } else if (processados > 0) {
      this.setSuccess(`Processamento concluído: ${processados} de ${total} itens foram comprados com sucesso.`);
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}
