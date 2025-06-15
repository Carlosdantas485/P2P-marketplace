import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-delete-confirm-dialog',
  template: `
    <h2 mat-dialog-title>
      <mat-icon color="warn">warning_amber</mat-icon> 
      <span>Confirmar Exclusão</span>
    </h2>
    <mat-dialog-content>
      <p>Tem certeza que deseja remover este item do seu inventário?</p>
      <p class="text-muted">Esta ação não pode ser desfeita.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true" cdkFocusInitial>Excluir</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .text-muted {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9em;
    }
  `],
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
})
export class DeleteConfirmDialogComponent {}
