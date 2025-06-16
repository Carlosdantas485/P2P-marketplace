import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// Define an interface for wishlist items for type safety
export interface WishlistItem {
  id: any; // Using 'any' for ID to be flexible, consider a specific type like number or string
  name: string;
  price: number;
  image?: string;
  float?: number; // Added to store item float value
  // Add any other relevant properties for a wishlist item
}

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private wishlistKey = 'p2p_marketplace_wishlist';
  private wishlistItemsSubject: BehaviorSubject<WishlistItem[]> = new BehaviorSubject<WishlistItem[]>(this.loadWishlistFromLocalStorage());
  public wishlistItems$: Observable<WishlistItem[]> = this.wishlistItemsSubject.asObservable();

  constructor() { }

  private loadWishlistFromLocalStorage(): WishlistItem[] {
    if (typeof localStorage !== 'undefined') {
      const storedWishlist = localStorage.getItem(this.wishlistKey);
      return storedWishlist ? JSON.parse(storedWishlist) : [];
    }
    return []; // Return empty array if localStorage is not available (e.g., SSR)
  }

  private saveWishlistToLocalStorage(items: WishlistItem[]): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.wishlistKey, JSON.stringify(items));
      this.wishlistItemsSubject.next(items);
    }
  }

  getWishlistItems(): WishlistItem[] {
    return this.wishlistItemsSubject.getValue();
  }

  addItem(item: WishlistItem): void {
    const currentItems = this.getWishlistItems();
    if (!currentItems.find(i => i.id === item.id)) { // Prevent duplicates
      const updatedItems = [...currentItems, item];
      this.saveWishlistToLocalStorage(updatedItems);
    } else {
      console.warn(`Item with id ${item.id} already in wishlist.`);
    }
  }

  removeItem(itemId: any): void {
    const currentItems = this.getWishlistItems();
    const updatedItems = currentItems.filter(item => item.id !== itemId);
    this.saveWishlistToLocalStorage(updatedItems);
  }

  clearWishlist(): void {
    this.saveWishlistToLocalStorage([]);
  }

  isInWishlist(itemId: any): boolean {
    return !!this.getWishlistItems().find(item => item.id === itemId);
  }
}
