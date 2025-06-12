import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { Observable } from 'rxjs';

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

  constructor(
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.user$ = this.authService.currentUser;
    this.editProfileForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      foto: ['']
    });
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
