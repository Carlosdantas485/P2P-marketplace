import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor, async pipe
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { UiService } from '../../../services/ui.service';
import { Observable, Subscription } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { WishlistService, WishlistItem } from '../../../services/wishlist.service';

@Component({
  selector: 'app-wishlist-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule
  ],
  templateUrl: './wishlist-sidebar.html',
  styleUrls: ['./wishlist-sidebar.scss']
})
export class WishlistSidebarComponent implements OnDestroy {
  isOpen$: Observable<boolean>;
  wishlistItems$: Observable<WishlistItem[]>;
  totalPrice$: Observable<number>;
  private subscriptions = new Subscription();

    constructor(
    private wishlistService: WishlistService,
    private router: Router,
    private uiService: UiService
  ) {
            this.isOpen$ = this.uiService.sidebarOpen$;
    this.wishlistItems$ = this.wishlistService.wishlistItems$;
    this.totalPrice$ = this.wishlistItems$.pipe(
      map(items => items.reduce((sum, item) => sum + (item.price || 0), 0))
    );
  }

  removeItem(itemId: any): void { // Changed type to any to match WishlistItem.id
    this.wishlistService.removeItem(itemId);
  }

  // Assuming the template calls clearAllItems() as per previous context, or clearWishlist()
  // If HTML has clearAllItems(), rename this method or update HTML.
  // For now, keeping it as clearWishlist as per original method name in this file.
  closeSidebar(): void {
    this.uiService.closeSidebar();
  }

  clearWishlist(): void {
    this.wishlistService.clearWishlist();
  }

  buyAllItems(): void {
    console.log('Buy All button clicked');
    
    // Get current items from wishlist
    this.wishlistItems$.pipe(take(1)).subscribe({
      next: (currentItems) => {
        if (!currentItems || currentItems.length === 0) {
          console.warn('No items in wishlist to purchase');
          return;
        }
        
        console.log('Current wishlist items:', currentItems);
        
        // Map items to the format expected by the confirm-payment component
        const itemsToPurchase = currentItems.map(item => ({
          id: item.id,
          name: item.name, // Keep original name
          nome: item.name, // Also include as 'nome' for compatibility
          price: item.price, // Keep original price
          preco: item.price, // Also include as 'preco' for compatibility
          image: item.image, // Keep original image
          imagem: item.image, // Also include as 'imagem' for compatibility
          float: item.float || 0,
          title: item.name // Include title as name for compatibility
        }));
        
        console.log('Items being sent to confirm-payment:', itemsToPurchase);
        
        // Calculate total if not already available
        const total = currentItems.reduce((sum, item) => sum + (item.price || 0), 0);
        
        // Navigate to confirm-payment with state
        this.router.navigate(['/confirm-payment'], {
          state: { 
            items: itemsToPurchase, 
            total: total,
            fromWishlist: true // Add flag to indicate this came from wishlist
          }
        }).then(success => {
          if (success) {
            console.log('Navigation to confirm-payment successful');
          } else {
            console.error('Failed to navigate to confirm-payment');
          }
        });
      },
      error: (error) => {
        console.error('Error getting wishlist items:', error);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // If your HTML uses a method named clearAllItems, you can use this one instead:
  /*
  clearAllItems(): void {
    this.wishlistService.clearWishlist();
  }
  */
}
