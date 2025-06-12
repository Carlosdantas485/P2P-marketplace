import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { WishlistService } from '../../services/wishlist.service';
import { Item as Skin } from '../../services/inventory.service'; // Renomeando para evitar conflito
import { Observable } from 'rxjs';
import { NgIf } from '@angular/common';
import { NgFor } from '@angular/common';
import { NgClass } from '@angular/common';



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
export class HomeComponent {

  skins: Skin[] = [];
  loading = true;
  error = false;
  private apiUrl = 'http://localhost:3000/skins';
  currentUserId: string | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private wishlistService: WishlistService
  ) {
    this.currentUserId = this.authService.currentUserValue?.id ?? null;
    this.loadSkins();
  }

  addToWishlist(skinId: string): void {
    this.wishlistService.addToWishlist(skinId).subscribe({
      next: () => alert('Item adicionado à sua lista de desejos!'),
      error: (err) => alert(`Erro: ${err.error.message}`)
    });
  }

  private loadSkins() {
    this.http.get<Skin[]>(this.apiUrl)
      .subscribe({
        next: (response: Skin[]) => {
          this.skins = response;
          this.loading = false;
        },
        error: (err: any) => { // Changed error handling type to any
          console.error('Error loading skins:', err);
          this.error = true;
          this.loading = false;
        }
      });
  }
}
