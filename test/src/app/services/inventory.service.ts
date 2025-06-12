import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

// Interface aligned with the backend 'skin' model
export interface Item {
  id: string;
  nome: string;
  descricao: string;
  imagem: string;
  ownerId: string;
  float: number;
  venda: boolean;
  preco?: number;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient, private authService: AuthService) { }

  // Fetch all items for a specific user
  getUserInventory(userId: string): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.apiUrl}/skins/${userId}`);
  }

  // Create a new item
  createItem(itemData: Omit<Item, 'id' | 'ownerId' | 'venda' | 'preco' | 'created_at' | 'updated_at'>, userId: string): Observable<Item> {
    const payload = { ...itemData, ownerId: userId };
    return this.http.post<Item>(`${this.apiUrl}/skins`, payload);
  }

  // Update an existing item's details (name, description, etc.)
  updateItem(itemId: string, itemData: Partial<Omit<Item, 'id' | 'ownerId' | 'venda' | 'preco' | 'created_at' | 'updated_at'>>): Observable<Item> {
    return this.http.put<Item>(`${this.apiUrl}/skins/${itemId}`, itemData);
  }

  // Delete an item
  deleteItem(itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/skins/${itemId}`);
  }

  // List an item for sale or update its price
  listItemForSale(itemId: string, price: number): Observable<Item> {
    return this.http.patch<Item>(`${this.apiUrl}/skins/${itemId}`, { venda: true, preco: price });
  }

  // Remove an item from sale
  unlistFromSale(itemId: string): Observable<Item> {
    return this.http.patch<Item>(`${this.apiUrl}/skins/${itemId}`, { venda: false, preco: 0 });
  }

  // Purchase an item
  purchase(skinId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/buy`, { skinId }).pipe(
      tap(response => {
        if (response && response.user) {
          const currentUser = this.authService.currentUserValue;
          const updatedUser = { ...currentUser, ...response.user };
          if (currentUser && currentUser.token) {
            updatedUser.token = currentUser.token;
          }
          this.authService.updateCurrentUser(updatedUser);
          console.log('[InventoryService] User data updated after purchase.', updatedUser);
        }
      })
    );
  }
}
