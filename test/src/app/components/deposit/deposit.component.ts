import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { Observable } from 'rxjs';

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

  constructor(private authService: AuthService, private router: Router) {
    this.user$ = this.authService.currentUser;
  }

  ngOnInit(): void {
  }

  onDeposit(): void {
    this.error = '';
    this.success = '';

    if (this.amount <= 0) {
      this.error = 'O valor do depósito deve ser positivo.';
      return;
    }

    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      const newBalance = currentUser.saldo + this.amount;
      this.authService.updateAccount({ saldo: newBalance }).subscribe({
        next: () => {
          this.success = 'Depósito realizado com sucesso!';
          this.amount = 0;
        },
        error: (err) => {
          this.error = err.message || 'Erro ao realizar o depósito.';
        }
      });
    }
  }
}
