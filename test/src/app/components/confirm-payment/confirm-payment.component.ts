import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { WishlistService } from '../../services/wishlist.service';

@Component({
  selector: 'app-confirm-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-payment.component.html',
  styleUrls: ['./confirm-payment.component.css']
})
export class ConfirmPaymentComponent implements OnInit {
  items: any[] = [];
  total: number = 0;
  loading = false;
  successMsg = '';
  errorMsg = '';
  metodoPagamento: 'saldo' | 'cartao' | 'pix' = 'saldo';
  cartaoInfo = { numero: '', validade: '', cvv: '' };
  pixCopiaCola = '00020126360014BR.GOV.BCB.PIX0114+5599999999995204000053039865405100.005802BR5920NOME DO RECEBEDOR6009SAO PAULO62070503***6304B14F';

  constructor(
    private router: Router,
    private inventoryService: InventoryService,
    private wishlistService: WishlistService
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
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    // Simulação de lógica de pagamento
    if (this.metodoPagamento === 'cartao') {
      if (!this.cartaoInfo.numero || !this.cartaoInfo.validade || !this.cartaoInfo.cvv) {
        this.errorMsg = 'Preencha todos os dados do cartão.';
        this.loading = false;
        return;
      }
      // Aqui você pode integrar com API real de cartão
    }
    if (this.metodoPagamento === 'pix') {
      // Simulação: mostrar mensagem e não processar a compra até o usuário confirmar pagamento externo
      this.successMsg = 'Copia e cole o código Pix abaixo no seu app bancário para concluir a compra. Após o pagamento, clique novamente em Confirmar Compra.';
      this.loading = false;
      return;
    }

    let comprasEfetuadas = 0;
    let erroOcorrido = false;
    for (const item of this.items) {
      this.inventoryService.purchase(item.id).subscribe({
        next: () => {
          // Após a compra, remover da wishlist
          this.wishlistService.removeFromWishlist(item.id).subscribe({
            next: () => {}, // Não precisa de ação extra
            error: (err) => {
              // Apenas loga erro, não interrompe o fluxo de compra
              console.error('Erro ao remover da wishlist:', err);
            }
          });
          comprasEfetuadas++;
          if (comprasEfetuadas === this.items.length && !erroOcorrido) {
            this.successMsg = 'Compra realizada com sucesso!';
            this.loading = false;
            setTimeout(() => this.router.navigate(['/wishlist']), 1500);
          }
        },
        error: (err) => {
          this.errorMsg = 'Erro ao realizar a compra: ' + (err.error?.message || 'Tente novamente.');
          this.loading = false;
          erroOcorrido = true;
        }
      });
    }
  }
}

