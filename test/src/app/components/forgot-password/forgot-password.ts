import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss']
})
export class ForgotPasswordComponent {
  email: string = '';
  error: string = '';
  successMessage: string = '';
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    if (!this.email) {
      this.error = 'Por favor, insira seu endereço de e-mail.';
      return;
    }

    this.error = '';
    this.loading = true;

    // Simulando uma requisição assíncrona
    setTimeout(() => {
      // Aqui você chamaria o serviço de autenticação
      // this.authService.forgotPassword(this.email).subscribe({
      //   next: () => {
      //     this.successMessage = 'Enviamos um e-mail com as instruções para redefinir sua senha.';
      //     this.loading = false;
      //   },
      //   error: (err) => {
      //     this.error = 'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.';
      //     this.loading = false;
      //   }
      // });

      
      // Simulando sucesso
      this.successMessage = 'Enviamos um e-mail com as instruções para redefinir sua senha.';
      this.loading = false;
    }, 1500);
  }
}
