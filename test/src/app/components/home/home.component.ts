import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AuthService, User } from '../../services/auth.service';
import { Router } from '@angular/router';
import { WishlistService, WishlistItem } from '../../services/wishlist.service'; // Added WishlistItem
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
  private wishlistSubscription: Subscription | undefined; // Initialized to undefined
  wishlistIds: string[] = []; // Changed to string[] to match Skin.id type, or use 'any[]'
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
      // Subscribe to wishlist changes if user is logged in
      if (this.currentUser) {
        if (this.wishlistSubscription) {
          this.wishlistSubscription.unsubscribe(); // Unsubscribe from previous if any
        }
        this.wishlistSubscription = this.wishlistService.wishlistItems$.subscribe({
          next: (items: WishlistItem[]) => {
            this.wishlistIds = items.map(item => String(item.id)); // Store IDs for isInWishlist
          },
          error: (err: any) => {
            console.error('Erro ao carregar wishlist:', err);
            this.wishlistIds = [];
          }
        });
      } else {
        this.wishlistIds = []; // Clear wishlist if no user
        if (this.wishlistSubscription) {
          this.wishlistSubscription.unsubscribe(); // Unsubscribe if user logs out
        }
      }
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
        const skin = this.skins.find(s => s.ownerId === ownerId);
        if (skin) {
          skin.ownerName = this.ownerNames[ownerId];
        }
      },
      error: (err: any) => {
        console.error('Erro ao carregar dados do dono:', err);
        this.ownerPhotos[ownerId] = 'assets/default-avatar.png';
        this.ownerNames[ownerId] = 'Usuário';
      }
    });
  }

  // loadWishlist() method is removed as its logic is now in ngOnInit's subscription

  isInWishlist(skinId: string | number): boolean {
    if (skinId === null || skinId === undefined) return false;
    const searchId = String(skinId).trim();
    return this.wishlistIds.includes(searchId);
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.filterSubscription) {
      this.filterSubscription.unsubscribe();
    }
    if (this.wishlistSubscription) { // Unsubscribe from wishlist
      this.wishlistSubscription.unsubscribe();
    }
  }

  toggleWishlist(skinId: any): void {
    if (!this.currentUser) {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.routerState.snapshot.url }
      });
      return;
    }
    
    const currentSkinId = String(skinId); // Ensure skinId is a string for comparison and use

    if (this.isInWishlist(currentSkinId)) {
      this.wishlistService.removeItem(currentSkinId);
      // console.log(`Item ${currentSkinId} removed from wishlist.`);
    } else {
      const skinToAdd = this.skins.find(s => s.id === currentSkinId) || this.filteredSkins.find(s => s.id === currentSkinId);
      if (skinToAdd) {
        if (typeof skinToAdd.preco === 'undefined') {
          console.error('Cannot add item to wishlist: price is undefined.', skinToAdd);
          alert('Este item não pode ser adicionado à lista de desejos pois não tem um preço definido.');
          return;
        }
        const wishlistItem: WishlistItem = {
          id: skinToAdd.id,
          name: skinToAdd.nome,
          price: skinToAdd.preco,
          image: skinToAdd.imagem,
          float: skinToAdd.float // Added float value
        };
        this.wishlistService.addItem(wishlistItem);
        // console.log(`Item ${currentSkinId} added to wishlist.`);
      } else {
        console.error(`Skin with id ${currentSkinId} not found to add to wishlist.`);
        alert('Erro: Skin não encontrada para adicionar à lista de desejos.');
      }
    }
  }

  editSkin(skin: Skin): void {
    if (this.currentUser && skin.ownerId === this.currentUser.id) {
      this.router.navigate(['/inventory'], { 
        queryParams: { edit: skin.id }
      });
    }
  }

  buySkin(skin: Skin): void {
    if (!this.currentUser) {
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
      error: (err: any) => {
        console.error('Error loading skins:', err);
        this.error = true;
        this.loading = false;
      }
    });
  }
}
