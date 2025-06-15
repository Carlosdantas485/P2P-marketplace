import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { Item } from '../../services/inventory.service';

@Component({
  selector: 'app-item-form-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.isEditing ? 'Editar Item' : 'Adicionar Novo Item' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="itemForm" id="item-form">
        <mat-form-field appearance="outline">
          <mat-label>Nome do Item</mat-label>
          <input matInput formControlName="nome" required>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Descrição</mat-label>
          <textarea matInput formControlName="descricao" rows="3" required></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>URL da Imagem</mat-label>
          <input matInput formControlName="imagem" type="url" required>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Valor do Float (0.00 - 1.00)</mat-label>
          <input matInput formControlName="float" type="number" min="0" max="1" step="0.0001" required>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onNoClick()">Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="itemForm.invalid" (click)="onSave()">{{ data.isEditing ? 'Salvar' : 'Adicionar' }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    mat-form-field {
      width: 100%;
    }
  `],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ]
})
export class ItemFormDialogComponent {
  itemForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<ItemFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { isEditing: boolean, item?: Item },
    private fb: FormBuilder
  ) {
    this.itemForm = this.fb.group({
      nome: [data.item?.nome || '', Validators.required],
      descricao: [data.item?.descricao || '', Validators.required],
      imagem: [data.item?.imagem || '', Validators.required],
      float: [data.item?.float || 0, [Validators.required, Validators.min(0), Validators.max(1)]]
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.itemForm.valid) {
      this.dialogRef.close(this.itemForm.value);
    }
  }
}
