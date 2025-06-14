import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecaptchaFormsModule, RecaptchaModule, ReCaptchaV3Service } from 'ng-recaptcha';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RecaptchaModule,
    RecaptchaFormsModule
  ],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.scss']
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  newPassword: string = '';
  confirmPassword: string = '';
  error: string = '';
  successMessage: string = '';
  loading: boolean = false;
  showCaptcha: boolean = false;
  captchaResolved: boolean = false;
  passwordStrength: 'weak' | 'medium' | 'strong' | '' = '';
  private token: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recaptchaV3Service: ReCaptchaV3Service
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || '';
    
    if (!this.token) {
      this.error = 'Token de redefinição inválido ou expirado.';
      return;
    }
    
    // Verificar se o token é válido com o backend
    this.verifyToken();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  verifyToken(): void {
    // Aqui você faria uma chamada para verificar se o token é válido
    // Por enquanto, apenas simulamos uma verificação bem-sucedida
    this.showCaptcha = true;
  }

  onPasswordChange(): void {
    if (!this.newPassword) {
      this.passwordStrength = '';
      return;
    }

    // Verificar força da senha
    const hasLetters = /[a-zA-Z]/.test(this.newPassword);
    const hasNumbers = /[0-9]/.test(this.newPassword);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(this.newPassword);
    const isLongEnough = this.newPassword.length >= 8;

    const strengthPoints = [hasLetters, hasNumbers, hasSpecialChars, isLongEnough].filter(Boolean).length;

    if (strengthPoints <= 1) {
      this.passwordStrength = 'weak';
    } else if (strengthPoints <= 3) {
      this.passwordStrength = 'medium';
    } else {
      this.passwordStrength = 'strong';
    }
  }

  getPasswordStrengthText(): string {
    switch (this.passwordStrength) {
      case 'weak':
        return 'Senha fraca';
      case 'medium':
        return 'Senha média';
      case 'strong':
        return 'Senha forte';
      default:
        return 'Força da senha';
    }
  }

  onCaptchaResolved(captchaResponse: string): void {
    this.captchaResolved = !!captchaResponse;
  }

  isFormValid(): boolean {
    return (
      this.newPassword.length >= 8 &&
      this.newPassword === this.confirmPassword &&
      this.captchaResolved &&
      !this.loading
    );
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      return;
    }

    this.loading = true;
    this.error = '';

    // Verificar o reCAPTCHA v3
    this.recaptchaV3Service.execute('resetPassword')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (token) => {
          // Aqui você faria a chamada para a API de redefinição de senha
          this.simulatePasswordReset();
        },
        error: (err) => {
          console.error('Erro no reCAPTCHA:', err);
          this.error = 'Erro de verificação de segurança. Por favor, tente novamente.';
          this.loading = false;
        }
      });
  }

  private simulatePasswordReset(): void {
    // Simulando uma chamada à API
    setTimeout(() => {
      // Em uma implementação real, você faria algo como:
      // this.authService.resetPassword(this.token, this.newPassword).subscribe({
      //   next: () => {
      //     this.successMessage = 'Sua senha foi redefinida com sucesso!';
      //     this.loading = false;
      //   },
      //   error: (err) => {
      //     this.handleError(err);
      //   }
      // });

      
      // Simulando sucesso
      this.successMessage = 'Sua senha foi redefinida com sucesso! Você será redirecionado para a página de login em 3 segundos...';
      this.loading = false;
      
      // Redirecionar para o login após 3 segundos
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    }, 1500);
  }

  private handleError(error: any): void {
    console.error('Erro ao redefinir senha:', error);
    
    if (error.status === 400) {
      this.error = 'O link de redefinição é inválido ou expirou.';
    } else if (error.status === 404) {
      this.error = 'Usuário não encontrado.';
    } else {
      this.error = 'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.';
    }
    
    this.loading = false;
  }
}
