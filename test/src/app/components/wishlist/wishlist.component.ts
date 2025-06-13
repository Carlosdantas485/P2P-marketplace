import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WishlistService } from '../../services/wishlist.service';
import { Item as Skin } from '../../services/inventory.service';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.css']
})
export class WishlistComponent implements OnInit {
  wishlist: Skin[] = [];
  loading = true;

  constructor(private wishlistService: WishlistService, private router: Router) { }

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.loading = true;
    this.wishlistService.getWishlist().subscribe({
      next: (items) => {
        this.wishlist = items;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load wishlist', err);
        this.loading = false;
        alert('Não foi possível carregar a lista de desejos.');
      }
    });
  }

  removeFromWishlist(skinId: any): void {
    const numericSkinId = Number(skinId);
    this.wishlistService.removeFromWishlist(numericSkinId).subscribe({
      next: () => {
        this.loadWishlist(); // Refresh the list
      },
      error: (err) => {
        console.error('Failed to remove item from wishlist', err);
        alert('Não foi possível remover o item.');
      }
    });
  }

  get total(): number {
    return this.wishlist.reduce((sum, item) => sum + (item.preco || 0), 0);
  }

  comprarTudo() {
    if (this.wishlist.length === 0) return;
    this.router.navigate(['/confirm-payment'], {
      state: { items: this.wishlist, total: this.total }
    });
  }
}

