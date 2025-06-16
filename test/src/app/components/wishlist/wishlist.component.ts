import { Component, OnInit, OnDestroy } from '@angular/core'; // Added OnDestroy
import { CommonModule } from '@angular/common';
import { WishlistService, WishlistItem } from '../../services/wishlist.service'; // Added WishlistItem
// Item from inventory.service is no longer directly used for the wishlist property type
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs'; // Added Subscription

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.css']
})
export class WishlistComponent implements OnInit, OnDestroy { // Implemented OnDestroy
  wishlist: WishlistItem[] = []; // Changed type to WishlistItem[]
  loading = true;
  private wishlistSubscription: Subscription | undefined;

  constructor(private wishlistService: WishlistService, private router: Router) { }

  ngOnInit(): void {
    this.loading = true;
    this.wishlistSubscription = this.wishlistService.wishlistItems$.subscribe({
      next: (items: WishlistItem[]) => {
        this.wishlist = items;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to load wishlist', err);
        this.loading = false;
        // Optionally, display an error message to the user
        alert('Não foi possível carregar a lista de desejos.');
      }
    });
  }

  // loadWishlist() method is removed

  removeFromWishlist(itemId: any): void { // Parameter changed from skinId to itemId
    this.wishlistService.removeItem(itemId); // Direct call, synchronous
    // No need to call loadWishlist() as the list updates reactively
  }

  buyItem(item: WishlistItem): void { // Parameter type changed to WishlistItem
    // Navigate to the payment page with the item
    // Ensure the receiving component (/payment or /confirm-payment) can handle WishlistItem structure
    this.router.navigate(['/confirm-payment'], { // Assuming confirm-payment is the correct route
      state: { items: [item], total: item.price } 
    });
  }

  get total(): number {
    return this.wishlist.reduce((sum, item) => sum + (item.price || 0), 0); // Changed item.preco to item.price
  }

  comprarTudo() {
    if (this.wishlist.length === 0) return;
    this.router.navigate(['/confirm-payment'], {
      state: { items: this.wishlist, total: this.total }
    });
  }

  ngOnDestroy(): void {
    if (this.wishlistSubscription) {
      this.wishlistSubscription.unsubscribe();
    }
  }
}

