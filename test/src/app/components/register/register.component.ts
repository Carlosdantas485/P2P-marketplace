import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ]
})
export class RegisterComponent {
  name: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  error: string = '';
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onRegister() {
    this.error = '';
    this.loading = true;

    if (this.password !== this.confirmPassword) {
      this.error = 'As senhas não coincidem!';
      this.loading = false;
      return;
    }

    const newUser: User = {
      id: Date.now().toString(),
      username: this.name,
      email: this.email,
      password: this.password,
      foto: '',
      saldo: 0,
      nivel: 1,
      vendas: 0,
      historicoTransferencias: []
    };

    this.authService.register(newUser)
      .subscribe({
        next: () => {
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.error = err.message || 'Erro ao registrar usuário';
          this.loading = false;
        }
      });
  }
}
