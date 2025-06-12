import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { User } from '../../services/auth.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
  standalone: true,
  imports: [CommonModule],
  providers: [AuthService]
})
export class AccountComponent implements OnInit, OnDestroy {
  user: any = null;
  private subscription!: Subscription;
  showEditForm = false;
  editForm: any = {
    username: '',
    email: '',
    foto: '',
    saldo: 0,
    nivel: 1,
    vendas: 0
  };
  error: string | null = null;
  loading = false;

  constructor(private authService: AuthService) {}

  loadUserProfile() {
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      this.authService.getUserProfile(currentUser.id)
        .subscribe(
          (user) => {
            this.user = user;
            this.editForm.username = user.username;
            this.editForm.email = user.email;
            this.editForm.foto = user.foto;
          },
          (error) => {
            this.error = error.message || 'Erro ao carregar perfil';
          }
        );
    }
  }

  ngOnInit() {
    this.subscription = this.authService.currentUser.subscribe(user => {
      this.user = user;
      if (user) {
        this.loadUserProfile();
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  onLogout() {
    this.authService.logout();
  }

  editAccount() {
    this.showEditForm = true;
    if (this.user) {
      this.editForm = {
        ...this.user
      };
    }
  }

  cancelEdit() {
    this.showEditForm = false;
    this.error = null;
  }

  updateAccount() {
    if (this.loading) return;

    this.error = null;
    this.loading = true;

    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      this.error = 'Usuário não encontrado';
      this.loading = false;
      return;
    }

    // Create update object with only modified fields
    const updateData: Partial<User> = {};
    
    // Check if each field was modified
    if (this.editForm.username !== currentUser.username) {
      updateData.username = this.editForm.username;
    }
    if (this.editForm.email !== currentUser.email) {
      updateData.email = this.editForm.email;
    }
    if (this.editForm.foto !== currentUser.foto) {
      updateData.foto = this.editForm.foto;
    }

    // If no fields were modified, show error
    if (Object.keys(updateData).length === 0) {
      this.error = 'Nenhum campo foi modificado';
      this.loading = false;
      return;
    }

    this.authService.updateAccount(updateData).subscribe({
      next: (response) => {
        if (response.success) {
          this.showEditForm = false;
          this.editForm = {
            username: '',
            email: '',
            foto: '',
            saldo: 0,
            nivel: 1,
            vendas: 0
          };
          this.loadUserProfile();
        } else {
          this.error = response.message || 'Erro ao atualizar conta';
        }
      },
      error: (error) => {
        this.error = error.message || 'Erro ao atualizar conta';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  deleteAccount() {
    if (confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) {
      this.loading = true;
      this.authService.deleteAccount().subscribe({
        next: (response) => {
          if (response.success) {
            this.authService.logout();
          } else {
            this.error = response.message || 'Erro ao excluir conta';
          }
        },
        error: (error) => {
          this.error = error.message || 'Erro ao excluir conta';
        },
        complete: () => {
          this.loading = false;
        }
      });
    }
  }
}

 
