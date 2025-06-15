import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Skin {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  description: string;
  game: string;
  rarity: string;
  animationOrder?: number;
  [key: string]: any; // Para permitir outras propriedades dinâmicas
}

@Injectable({
  providedIn: 'root'
})
export class SkinService {
  private apiUrl = 'http://localhost:3000/skins'; // Substitua pela URL real da sua API

  constructor(private http: HttpClient) {}

  getSkins(): Observable<Skin[]> {
    return this.http.get<Skin[]>(this.apiUrl);
  }
}
