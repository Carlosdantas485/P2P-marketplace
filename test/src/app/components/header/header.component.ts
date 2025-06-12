import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive
  ]
})
export class HeaderComponent {
  user$: Observable<User | null>;

  constructor(public authService: AuthService) {
    this.user$ = this.authService.currentUser;
  }

  logout(): void {
    this.authService.logout();
  }
}
