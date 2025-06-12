import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
  username: string = 'Usuário';
  profileImage: string | null = null;

  constructor(private authService: AuthService) {
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.username = user.username;
        this.profileImage = user.foto || null;
      } else {
        this.username = 'Usuário';
        this.profileImage = null;
      }
    });
  }

  logout() {
    this.authService.logout();
    this.username = 'Usuário';
    this.profileImage = null;
  }
}
