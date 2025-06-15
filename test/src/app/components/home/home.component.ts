import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AuthService, User } from '../../services/auth.service';
import { Router } from '@angular/router';
import { WishlistService } from '../../services/wishlist.service';
import { InventoryService, Item as Skin } from '../../services/inventory.service';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

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
  private filterSubject = new Subject<string>();
  private filterSubscription: Subscription;

  skins: Skin[] = [];
  filteredSkins: Skin[] = [];

  private applyFilter(filterValue: string): void {
    if (!filterValue.trim()) {
      this.filteredSkins = [...this.skins];
      return;
    }
    const searchTerm = filterValue.toLowerCase().trim();
    this.filteredSkins = this.skins.filter(skin => 
      skin.nome.toLowerCase().includes(searchTerm) ||
      (skin.descricao && skin.descricao.toLowerCase().includes(searchTerm))
    );
  }
  loading = true;
  error = false;
  private apiUrl = 'http://localhost:3000/skins';
  currentUser: User | null = null;
  private userSubscription: Subscription | undefined;
  wishlistIds: number[] = [];
  ownerPhotos: { [ownerId: string]: string } = {};
  ownerNames: { [ownerId: string]: string } = {};

  constructor(
    private http: HttpClient,
    private wishlistService: WishlistService,
    private inventoryService: InventoryService,
    private authService: AuthService,
    private router: Router
  ) {
    // Setup debounced filter
    this.filterSubscription = this.filterSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(filterValue => {
      this.applyFilter(filterValue);
    });
  }

  ngOnInit(): void {
    this.loadSkins();
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.loadWishlist();
      console.log('[HomeComponent] Current user data updated:', this.currentUser);
    });
  }

  onFilterChange(searchValue: string): void {
    this.filterSubject.next(searchValue);
  }

  private loadOwnerPhotosForSkins(): void {
    this.skins.forEach(skin => {
      this.loadOwnerPhoto(skin.ownerId);
    });
  }

  loadOwnerPhoto(ownerId: string): void {
    if (!ownerId || (this.ownerPhotos[ownerId] && this.ownerNames[ownerId])) return;
    
    this.http.get<User>(`http://localhost:3000/users/${ownerId}`).subscribe({
      next: (user) => {
        this.ownerPhotos[ownerId] = user.foto || 'assets/default-avatar.png';
        this.ownerNames[ownerId] = user.username || 'Usuário';
        // Update the skin with owner name
        const skin = this.skins.find(s => s.ownerId === ownerId);
        if (skin) {
          skin.ownerName = this.ownerNames[ownerId];
        }
      },
      error: (err) => {
        console.error('Erro ao carregar dados do dono:', err);
        this.ownerPhotos[ownerId] = 'assets/default-avatar.png';
        this.ownerNames[ownerId] = 'Usuário';
      }
    });
  }

  loadWishlist(): void {
    if (!this.currentUser) {
      this.wishlistIds = [];
      return;
    }
    this.wishlistService.getWishlist().subscribe({
      next: (items) => {
        this.wishlistIds = Array.isArray(items) ? items.map(item => Number(item.id)) : [];
      },
      error: (err) => {
        console.error('Erro ao carregar wishlist:', err);
        this.wishlistIds = [];
      }
    });
  }

  isInWishlist(skinId: number): boolean {
    // debug
    // console.log('wishlistIds:', this.wishlistIds, 'skinId:', skinId);
    return this.wishlistIds.some(id => Number(id) === Number(skinId));
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.filterSubscription) {
      this.filterSubscription.unsubscribe();
    }
  }

  toggleWishlist(skinId: any): void {
    if (!this.currentUser) {
      // Store the current URL to redirect back after login
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.routerState.snapshot.url }
      });
      return;
    }
    
    const numericSkinId = Number(skinId);
    if (this.isInWishlist(numericSkinId)) {
      this.wishlistService.removeFromWishlist(numericSkinId).subscribe({
        next: () => {
          this.loadWishlist();
        },
        error: (err: any) => {
          console.error('Erro ao remover da wishlist:', err);
          alert(`Erro ao remover: ${err.error?.message || 'Ocorreu um erro.'}`);
        }
      });
    } else {
      this.wishlistService.addToWishlist(numericSkinId).subscribe({
        next: () => {
          this.loadWishlist();
        },
        error: (err: any) => {
          console.error('Erro ao adicionar à wishlist:', err);
          alert(`Erro ao adicionar: ${err.error?.message || 'Ocorreu um erro.'}`);
        }
      });
    }
  }

  buySkin(skin: Skin): void {
    if (!this.currentUser) {
      // Store the current URL to redirect back after login
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.routerState.snapshot.url }
      });
      return;
    }

    if (typeof skin.preco === 'undefined') {
      console.error('Skin price is undefined.', skin);
      alert('Este item não pode ser comprado pois não tem um preço definido.');
      return;
    }

    if (!this.currentUser || typeof this.currentUser.saldo === 'undefined' || this.currentUser.saldo < skin.preco) {
      alert('Saldo insuficiente para realizar esta compra.');
      return;
    }

    // Redirecionar para a página de confirmação de compra com o item selecionado
    this.router.navigate(['/confirm-payment'], {
      state: { items: [skin], total: skin.preco }
    });
  }

  private loadSkins(): void {
    this.loading = true;
    this.error = false;
    this.http.get<Skin[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.skins = data.map((skin, index) => ({
          ...skin,
          animationOrder: index
        }));
        this.filteredSkins = [...this.skins];
        this.loading = false;
        this.loadOwnerPhotosForSkins();
      },
      error: (err) => {
        console.error('Error loading skins:', err);
        this.error = true;
        this.loading = false;
      }
    });
  }
}
