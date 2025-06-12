import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    RouterModule
  ],
  template: `
    <mat-toolbar color="primary">
      <span>Home</span>
      <span class="spacer"></span>
      <button mat-icon-button routerLink="/account">
        <mat-icon>account_circle</mat-icon>
      </button>
    </mat-toolbar>
    <div class="home-content">
      <h1>Welcome to Skin Marketplace</h1>
      <p>Find and trade your favorite skins!</p>
    </div>
  `,
  styles: [`
    .spacer {
      flex: 1 1 auto;
    }
    .home-content {
      max-width: 800px;
      margin: 2rem auto;
      text-align: center;
    }
    h1 {
      color: #333;
    }
    p {
      color: #666;
    }
  `]
})
export class HomeComponent {
}
