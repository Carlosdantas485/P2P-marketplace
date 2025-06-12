import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

interface Skin {
  id: string;
  nome: string;
  preco: number;
  imagem: string;
  descricao: string;
  float: number;
  venda: boolean;
  ownerId: string;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class InventoryComponent {
  skins: Skin[] = [];
  loading = true;
  error: string | boolean = false;
  hasError: boolean = false;
  errorMessage: string | null = null;
  private apiUrl = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadUserSkins();
  }

  private loadUserSkins() {
    try {
      this.loading = true;
      this.error = false;
      this.hasError = false;
      this.errorMessage = null;

      const currentUser = this.authService.currentUserValue;
      if (!currentUser?.id) {
        this.error = 'Usuário não encontrado';
        this.loading = false;
        return;
      }

      console.log('Tentando carregar skins para userId:', currentUser.id);
      
      this.http.get<Skin[]>(`${this.apiUrl}/skins?ownerId=${currentUser.id}`)
        .subscribe({
          next: (response) => {
            console.log('Skins carregadas com sucesso:', response);
            this.skins = response;
            this.loading = false;
            this.hasError = false;
            this.errorMessage = null;
          },
          error: (err) => {
            console.error('Erro ao carregar skins:', err);
            this.error = err.message || 'Erro ao carregar skins';
            this.loading = false;
            this.hasError = true;
          }
        });
    } catch (error) {
      console.error('Erro inesperado:', error);
      this.error = 'Erro interno do sistema';
      this.loading = false;
      this.hasError = true;
    }
  }

  toggleSale(skin: Skin) {
    if (!this.authService.isLoggedIn()) {
      this.error = 'Por favor, faça login primeiro';
      return;
    }

    this.http.patch(`${this.apiUrl}/skins/${skin.id}`, { venda: !skin.venda })
      .subscribe({
        next: () => {
          skin.venda = !skin.venda;
          this.hasError = false;
          this.errorMessage = null;
        },
        error: (err) => {
          console.error('Error updating skin:', err);
          this.error = 'Erro ao atualizar skin';
        }
      });
  }
}
