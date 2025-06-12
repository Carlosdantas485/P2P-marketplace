import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AuthService, User } from '../../services/auth.service';
import { WishlistService } from '../../services/wishlist.service';
import { InventoryService, Item as Skin } from '../../services/inventory.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    NgIf,
    NgFor
  ]
})
export class HomeComponent implements OnInit, OnDestroy {
  filterText: string = '';
  appliedFilter: string = '';

  skins: Skin[] = [];
  get filteredSkins(): Skin[] {
    if (!this.appliedFilter) return this.skins;
    return this.skins.filter(skin => skin.nome.toLowerCase().includes(this.appliedFilter.toLowerCase()));
  }

  applyFilter() {
    this.appliedFilter = this.filterText;
  }
  loading = true;
  error = false;
  private apiUrl = 'http://localhost:3000/skins';
  currentUser: User | null = null;
  private userSubscription: Subscription | undefined;

  constructor(
    private http: HttpClient,
    private wishlistService: WishlistService,
    private inventoryService: InventoryService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadSkins();
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      console.log('[HomeComponent] Current user data updated:', this.currentUser);
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  addToWishlist(skinId: any): void {
    const numericSkinId = Number(skinId);
    this.wishlistService.addToWishlist(numericSkinId).subscribe({
      next: () => alert('Item adicionado à sua lista de desejos!'),
      error: (err: any) => alert(`Erro: ${err.error?.message || 'Ocorreu um erro.'}`)
    });
  }

  buySkin(skin: Skin): void {
    if (!this.currentUser) {
      alert('Você precisa estar logado para comprar. Redirecionando para o login.');
      // Optionally, redirect to login
      // this.router.navigate(['/login']);
      return;
    }

    if (typeof skin.preco === 'undefined') {
      console.error('Skin price is undefined.', skin);
      alert('Este item não pode ser comprado pois não tem um preço definido.');
      return;
    }

    if (this.currentUser.saldo < skin.preco) {
      alert('Saldo insuficiente para realizar esta compra.');
      return;
    }

    this.inventoryService.purchase(skin.id).subscribe({
      next: (response) => {
        console.log('[HomeComponent] Purchase successful response:', response);
        alert('Compra realizada com sucesso!');
        this.loadSkins(); // Reload skins to remove the purchased one from the list
      },
      error: (error) => {
        console.error('[HomeComponent] Purchase failed:', error);
        alert(`Falha na compra: ${error.error?.message || 'Erro desconhecido.'}`);
      }
    });
  }

  private loadSkins() {
    this.http.get<Skin[]>(this.apiUrl)
      .subscribe({
        next: (response: Skin[]) => {
          this.skins = response;
          this.loading = false;
        },
        error: (err: any) => {
          console.error('Error loading skins:', err);
          this.error = true;
          this.loading = false;
        }
      });
  }
}
