import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { InventoryService, Item } from '../../services/inventory.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css']
})
export class InventoryComponent implements OnInit {
  inventory$: Observable<Item[]>;
  private inventorySubject = new BehaviorSubject<void>(undefined);

  showForm = false;
  isEditing = false;
  editingItemId: string | null = null;
  itemForm: FormGroup;

  constructor(
    private inventoryService: InventoryService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.itemForm = this.fb.group({
      nome: ['', Validators.required],
      descricao: ['', Validators.required],
      imagem: ['', Validators.required],
      float: [0, [Validators.required, Validators.min(0), Validators.max(1)]]
    });

    this.inventory$ = this.inventorySubject.pipe(
      switchMap(() => {
        const currentUser = this.authService.currentUserValue;
        if (currentUser && currentUser.id) {
          return this.inventoryService.getUserInventory(currentUser.id).pipe(
            catchError(err => {
              console.error('Error fetching inventory:', err);
              return of([]);
            })
          );
        } else {
          return of([]);
        }
      })
    );
  }

  ngOnInit(): void {
    this.loadInventory();
  }

  loadInventory(): void {
    this.inventorySubject.next();
  }

  openAddForm(): void {
    this.isEditing = false;
    this.editingItemId = null;
    this.itemForm.reset();
    this.showForm = true;
  }

  openEditForm(item: Item): void {
    this.isEditing = true;
    this.editingItemId = item.id;
    this.itemForm.patchValue({
      nome: item.nome,
      descricao: item.descricao,
      imagem: item.imagem,
      float: item.float
    });
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  onSubmit(): void {
    if (this.itemForm.invalid) {
      return;
    }

    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      console.error('User not logged in');
      return;
    }

    const formValue = this.itemForm.value;

    if (this.isEditing && this.editingItemId) {
      this.inventoryService.updateItem(this.editingItemId, formValue).pipe(
        tap(() => this.loadInventory()),
        catchError(err => {
          console.error('Error updating item:', err);
          return of(null);
        })
      ).subscribe(() => this.closeForm());
    } else {
      this.inventoryService.createItem(formValue, currentUser.id).pipe(
        tap(() => this.loadInventory()),
        catchError(err => {
          console.error('Error creating item:', err);
          return of(null);
        })
      ).subscribe(() => this.closeForm());
    }
  }

  deleteItem(itemId: string): void {
    if (confirm('Tem certeza que deseja deletar este item?')) {
      this.inventoryService.deleteItem(itemId).pipe(
        tap(() => this.loadInventory()),
        catchError(err => {
          console.error('Error deleting item:', err);
          return of(null);
        })
      ).subscribe();
    }
  }

  toggleSale(item: Item): void {
    if (item.venda) {
      // Unlist from sale
      this.inventoryService.unlistFromSale(item.id).pipe(
        tap(() => this.loadInventory()),
        catchError(err => {
          console.error('Error unlisting item:', err);
          return of(null);
        })
      ).subscribe();
    } else {
      // List for sale
      const preco = prompt('Digite o preço de venda:');
      if (preco && !isNaN(Number(preco))) {
        this.inventoryService.listItemForSale(item.id, Number(preco)).pipe(
          tap(() => this.loadInventory()),
          catchError(err => {
            console.error('Error listing item:', err);
            return of(null);
          })
        ).subscribe();
      }
    }
  }
}
