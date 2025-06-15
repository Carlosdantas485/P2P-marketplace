import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  resetToken?: string;
}

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
  emailSent: boolean = false;
  private apiUrl = environment.apiUrl;

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  onSubmit() {
    if (!this.email) {
      this.error = 'Por favor, insira seu endereço de e-mail.';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.error = 'Por favor, insira um endereço de e-mail válido.';
      return;
    }

    this.error = '';
    this.loading = true;

    this.authService.forgotPassword(this.email).subscribe({
      next: (response) => {
        this.handleSuccess(response);
        // Em ambiente de desenvolvimento, ainda mostramos o link no console
        if (!environment.production) {
          const resetToken = this.generateResetToken();
          const resetLink = `${window.location.origin}/reset-password?token=${resetToken}`;
          console.log('Link de redefinição (apenas para desenvolvimento):', resetLink);
        }
      },
      error: (error) => this.handleError(error)
    });
  }


  // Método mantido apenas para gerar token em ambiente de desenvolvimento
  private generateResetToken(): string {
    // Em um ambiente real, use uma biblioteca para gerar um token seguro
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }



  private isValidEmail(email: string): boolean {
    // Expressão regular simples para validar e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private handleSuccess(response: ForgotPasswordResponse): void {
    this.emailSent = true;
    this.successMessage = response.message || 'Enviamos um e-mail com as instruções para redefinir sua senha.';
    this.loading = false;
  }

  private handleError(error: any): void {
    console.error('Erro ao solicitar redefinição de senha:', error);
    
    if (error.status === 404) {
      this.error = 'Nenhuma conta encontrada com este endereço de e-mail.';
    } else if (error.status === 429) {
      this.error = 'Muitas tentativas. Por favor, aguarde antes de tentar novamente.';
    } else {
      this.error = 'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.';
    }
    
    this.loading = false;
  }
}
