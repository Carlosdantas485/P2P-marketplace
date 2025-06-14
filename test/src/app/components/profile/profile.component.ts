import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { Observable } from 'rxjs';
import { HistoryService } from '../../services/history.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  user$: Observable<User | null>;
  isEditing = false;
  isChangingPassword = false;
  editProfileForm: FormGroup;
  changePasswordForm: FormGroup;
  passwordError = '';
  passwordSuccess = '';

  // Histórico
  history: any[] = [];
  filteredHistory: any[] = [];
  filterType: string = 'all';
  total: number = 0;
  totalCompras: number = 0;
  totalVendas: number = 0;

  // Validador de confirmação de senha

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private historyService: HistoryService
  ) {
    this.user$ = this.authService.currentUser;
    this.editProfileForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      foto: ['']
    });

    this.changePasswordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator.bind(this) });

    // Logs para depuração
    this.changePasswordForm.statusChanges.subscribe(status => {
      console.log('Status do formulário:', status);
      console.log('Erros do formulário:', this.changePasswordForm.errors);
      console.log('currentPassword errors:', this.changePasswordForm.get('currentPassword')?.errors);
      console.log('newPassword errors:', this.changePasswordForm.get('newPassword')?.errors);
      console.log('confirmPassword errors:', this.changePasswordForm.get('confirmPassword')?.errors);
      console.log('Formulário válido:', this.changePasswordForm.valid);
    });

    this.changePasswordForm.valueChanges.subscribe(values => {
      console.log('Valores do formulário:', values);
    });
    // Carregar histórico ao inicializar
    this.historyService.getHistory().subscribe((data) => {
      this.history = data.filter(item => item.type === 'compra' || item.type === 'venda').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      this.calculateFixedTotals();
      this.applyFilter('all');
    });
  }

  calculateFixedTotals(): void {
    this.totalCompras = this.history.filter(item => item.type === 'compra').reduce((sum, item) => sum + (item.price || 0), 0);
    this.totalVendas = this.history.filter(item => item.type === 'venda').reduce((sum, item) => sum + (item.price || 0), 0);
  }

  applyFilter(type: string): void {
    this.filterType = type;
    if (type === 'all') {
      this.filteredHistory = this.history;
    } else {
      this.filteredHistory = this.history.filter(item => item.type === type);
    }
    this.calculateTotal();
  }

  calculateTotal(): void {
    if (this.filterType === 'compra' || this.filterType === 'venda') {
      this.total = this.filteredHistory.reduce((sum, item) => sum + (item.price || 0), 0);
    }
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.isChangingPassword = false;
      const currentUser = this.authService.currentUserValue;
      if (currentUser) {
        this.editProfileForm.patchValue(currentUser);
      }
    }
  }

  toggleChangePassword(): void {
    this.isChangingPassword = !this.isChangingPassword;
    this.passwordError = '';
    this.passwordSuccess = '';
    if (this.isChangingPassword) {
      this.isEditing = false;
      this.changePasswordForm.reset();
    }
  }

  onSave(): void {
    if (this.editProfileForm.invalid) {
      return;
    }
    const updatedData = this.editProfileForm.value;

    this.authService.updateAccount(updatedData).subscribe({
      next: () => {
        this.isEditing = false;
      },
      error: (err: any) => {
        console.error('Failed to update profile', err);
        this.isEditing = false;
      }
    });
  }

  onChangePassword(): void {
    if (this.changePasswordForm.invalid) {
      return;
    }

    this.passwordError = '';
    this.passwordSuccess = '';

    const currentPassword = this.changePasswordForm.get('currentPassword')?.value;
    const newPassword = this.changePasswordForm.get('newPassword')?.value;

    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordSuccess = 'Senha alterada com sucesso!';
        this.changePasswordForm.reset();
        setTimeout(() => {
          this.isChangingPassword = false;
          this.passwordSuccess = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Erro ao alterar senha:', error);
        this.passwordError = error.error?.message || 'Erro ao alterar a senha. Verifique a senha atual e tente novamente.';
      }
    });
  }

  private passwordMatchValidator(g: FormGroup) {
    const newPassword = g.get('newPassword')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    const isValid = newPassword === confirmPassword;
    console.log('Validando senhas:', { newPassword, confirmPassword, isValid });
    return isValid ? null : { mismatch: true };
  }
}
