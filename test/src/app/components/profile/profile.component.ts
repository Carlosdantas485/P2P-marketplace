import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  editProfileForm: FormGroup;

  // Histórico
  history: any[] = [];
  filteredHistory: any[] = [];
  filterType: string = 'all';
  total: number = 0;
  totalCompras: number = 0;
  totalVendas: number = 0;

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
      const currentUser = this.authService.currentUserValue;
      if (currentUser) {
        this.editProfileForm.patchValue(currentUser);
      }
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
}
