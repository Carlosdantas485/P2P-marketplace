import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { HeaderComponent } from './components/header/header.component';
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { WishlistSidebarComponent } from './components/shared/wishlist-sidebar/wishlist-sidebar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    FormsModule,
    HeaderComponent,
    ChatbotComponent,
    WishlistSidebarComponent
  ],
  template: `
    <app-header></app-header>
    <div class="main-layout">
      <main class="content-area">
        <router-outlet></router-outlet>
      </main>
    </div>
    <app-wishlist-sidebar></app-wishlist-sidebar>
    <app-chatbot></app-chatbot>
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'P2P-marketplace';
  
  constructor(private authService: AuthService) {}
  
  ngOnInit() {
    // Inicializa o chat fechado por padrão
    // Você pode adicionar lógica aqui para verificar se deve abrir o chat automaticamente
  }
}
