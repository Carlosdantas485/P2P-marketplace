import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-deposit',
  templateUrl: './deposit.component.html',
  styleUrls: ['./deposit.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DepositComponent implements OnInit {
  amount: number = 0;
  user$: Observable<User | null>;
  error: string = '';
  success: string = '';
  isLoading: boolean = false;
  depositCompleted: boolean = false;

  constructor(private authService: AuthService, private router: Router) {
    this.user$ = this.authService.currentUser;
  }

  ngOnInit(): void {
  }

  onDeposit(): void {
    this.error = '';
    this.success = '';
    this.isLoading = true;
    this.depositCompleted = false;
    
    console.log(`[DepositComponent] Attempting to deposit: ${this.amount}`);

    if (this.amount <= 0) {
      this.error = 'O valor do depósito deve ser positivo.';
      this.isLoading = false;
      return;
    }

    this.authService.deposit(this.amount)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          console.log('[DepositComponent] Deposit successful. Server response:', response);
          this.success = response.message || 'Depósito realizado com sucesso!';
          this.amount = 0;
          this.depositCompleted = true;
          
          // Reset form after success
          setTimeout(() => {
            this.success = '';
            this.depositCompleted = false;
          }, 5000);
        },
        error: (err) => {
          console.error('[DepositComponent] Deposit failed. Server error:', err);
          this.error = err.error?.message || 'Erro ao realizar o depósito. Tente novamente.';
          
          // Auto-hide error after 5 seconds
          setTimeout(() => {
            this.error = '';
          }, 5000);
        }
      });
  }
}
