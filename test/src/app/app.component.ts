import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { HeaderComponent } from './components/header/header.component';
import { ChatbotComponent } from './components/chatbot/chatbot.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    FormsModule,
    HeaderComponent,
    ChatbotComponent
  ],
  template: `
    <app-header></app-header>
    <router-outlet></router-outlet>
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
