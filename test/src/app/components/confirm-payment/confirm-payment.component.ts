import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-confirm-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-payment.component.html',
  styleUrls: ['./confirm-payment.component.css']
})
export class ConfirmPaymentComponent implements OnInit {
  resultados: { item: any; sucesso: boolean; erro?: string }[] = [];
  items: any[] = [];
  total: number = 0;
  loading = false;
  successMsg = '';
  errorMsg = '';
  metodoPagamento: 'saldo' | 'cartao' | 'pix' | 'boleto' = 'saldo';
  cartaoInfo = { numero: '', validade: '', cvv: '' };
  pixCopiaCola = '00020126360014BR.GOV.BCB.PIX0114+5599999999995204000053039865405100.005802BR5920NOME DO RECEBEDOR6009SAO PAULO62070503***6304B14F';
  boletoLinhaDigitavel = '34191.79001 01043.510047 91020.150008 6 89470026000';

  onMetodoPagamentoChange(metodo: 'saldo' | 'cartao' | 'pix' | 'boleto') {
    this.metodoPagamento = metodo;
    if (metodo !== 'cartao') {
      this.cartaoInfo = { numero: '', validade: '', cvv: '' };
    }
  }

  constructor(
    private router: Router,
    private inventoryService: InventoryService,
    private wishlistService: WishlistService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Tenta pegar do navigation state (navegação programática)
    let state: any = undefined;
    const nav = this.router.getCurrentNavigation();
    if (nav && nav.extras && nav.extras.state) {
      state = nav.extras.state;
    } else if (window.history.state && (window.history.state.items || window.history.state.total)) {
      // Fallback para history.state (caso de reload ou navegação direta)
      state = window.history.state;
    }
    this.items = state?.items || [];
    this.total = state?.total || 0;
  }

  confirmarCompra() {
    if (!this.items.length) return;
    this.setLoading(true);
    this.clearMessages();

    const pagamentoValido = this.validarMetodoPagamento();
    if (!pagamentoValido) return;

    const compradorId = this.authService.currentUserValue?.id;
    if (!compradorId) {
      this.setError('Você precisa estar logado para comprar.');
      return;
    }

    const skinIds = this.items.map(item => item.id);
    this.inventoryService.purchaseMultiple(skinIds).subscribe({
      next: (res) => this.processarResultadoCompra(res),
      error: (err) => {
        this.setLoading(false);
        this.setError(err.error?.message || 'Erro ao processar a compra.');
      }
    });
  }

  private validarMetodoPagamento(): boolean {
    if (this.metodoPagamento === 'cartao') {
      if (!this.cartaoInfo.numero || !this.cartaoInfo.validade || !this.cartaoInfo.cvv) {
        this.setError('Preencha todos os dados do cartão.');
        return false;
      }
      // Aqui você pode integrar com API real de cartão
    }
    if (this.metodoPagamento === 'pix') {
      this.setSuccess('Copia e cole o código Pix abaixo no seu app bancário para concluir a compra. Após o pagamento, clique novamente em Confirmar Compra.');
      return false;
    }
    if (this.metodoPagamento === 'boleto') {
      this.setSuccess('Use a linha digitável abaixo para pagar o boleto no seu banco. Após o pagamento, clique novamente em Confirmar Compra.');
      return false;
    }
    return true;
  }

  private processarResultadoCompra(res: any) {
    this.resultados = this.items.map(item => {
      const r = res.results.find((rr: { skinId: any; sucesso: boolean; erro?: string }) => rr.skinId == item.id);
      if (r?.sucesso) {
        this.removerDaWishlist(item.id);
      }
      return { item, sucesso: r?.sucesso, erro: r?.erro };
    });
    this.setLoading(false);
    const comprados = this.resultados.filter(r => r.sucesso).map(r => r.item.nome || r.item.title || r.item.id);
    const falharam = this.resultados.filter(r => !r.sucesso).map(r => `${r.item.nome || r.item.title || r.item.id}: ${r.erro}`);
    if (comprados.length) {
      this.setSuccess(`Compra realizada com sucesso para: ${comprados.join(', ')}.`);
    }
    if (falharam.length) {
      this.setError(`Falha ao comprar: ${falharam.join('; ')}.`);
    }
    if (comprados.length && !falharam.length) {
      setTimeout(() => this.router.navigate(['/']), 1500);
    }
  }

  private removerDaWishlist(skinId: number) {
    this.wishlistService.removeFromWishlist(skinId).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Erro ao remover da wishlist:', err);
      }
    });
  }

  private setLoading(loading: boolean) {
    this.loading = loading;
  }

  private setSuccess(msg: string) {
    this.successMsg = msg;
    this.setLoading(false);
  }

  private setError(msg: string) {
    this.errorMsg = msg;
    this.setLoading(false);
  }

  private clearMessages() {
    this.successMsg = '';
    this.errorMsg = '';
  }

  private verificarFinalizacaoCompras(resultados: { item: any; sucesso: boolean; erro?: string }[], processados: number, total: number) {
    if (processados === total) {
      const comprados = resultados.filter(r => r.sucesso).map(r => r.item.nome || r.item.title || r.item.id);
      const falharam = resultados.filter(r => !r.sucesso).map(r => `${r.item.nome || r.item.title || r.item.id}: ${r.erro}`);
      if (comprados.length) {
        this.successMsg = `Compra realizada com sucesso para: ${comprados.join(', ')}.`;
      }
      if (falharam.length) {
        this.errorMsg = `Falha ao comprar: ${falharam.join('; ')}.`;
      }
      this.loading = false;
      if (comprados.length && !falharam.length) {
        setTimeout(() => this.router.navigate(['/']), 1500);
      }
    }
  }
}

