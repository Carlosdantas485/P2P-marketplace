import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NgIf } from '@angular/common';
import { NgFor } from '@angular/common';
import { NgClass } from '@angular/common';

interface Skin {
  id: string;  // Changed to string to match UUID format
  nome: string;
  preco: number;
  imagem: string;
  descricao: string;
  float: number;
  criadoEm: string;
  atualizadoEm: string;
  idDono: string;
  venda: boolean;
}

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

  constructor(
    private http: HttpClient
  ) {
    this.loadSkins();
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
