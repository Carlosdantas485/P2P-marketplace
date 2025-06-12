import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private apiUrl = 'http://localhost:3000/api/wishlist'; // Corrected URL

  constructor(private http: HttpClient) { }

  // Get all items from the user's wishlist
  getWishlist(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Add an item to the user's wishlist
  addToWishlist(skinId: number): Observable<any> {
    return this.http.post(this.apiUrl, { skinId });
  }

  // Remove an item from the user's wishlist
  removeFromWishlist(skinId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${skinId}`);
  }
}
