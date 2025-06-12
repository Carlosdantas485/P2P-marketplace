import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    RouterModule
  ],
  template: `
    <mat-toolbar color="primary">
      <button mat-icon-button routerLink="/home">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <span>Account</span>
    </mat-toolbar>
    <mat-list>
      <mat-list-item>
        <mat-icon matListIcon>person</mat-icon>
        <h3 matLine>Profile</h3>
        <p matLine>Manage your profile information</p>
      </mat-list-item>
      <mat-divider></mat-divider>
      <mat-list-item>
        <mat-icon matListIcon>shopping_cart</mat-icon>
        <h3 matLine>Orders</h3>
        <p matLine>View your purchase history</p>
      </mat-list-item>
      <mat-divider></mat-divider>
      <mat-list-item>
        <mat-icon matListIcon>settings</mat-icon>
        <h3 matLine>Settings</h3>
        <p matLine>Account settings and preferences</p>
      </mat-list-item>
    </mat-list>
  `,
  styles: [`
    mat-list {
      max-width: 600px;
      margin: 2rem auto;
    }
    mat-list-item {
      margin-bottom: 1rem;
    }
  `]
})
export class AccountComponent {
}
