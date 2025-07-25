import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, catchError, tap, finalize } from 'rxjs/operators';
import { InventoryService, Item } from '../../services/inventory.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css']

})
export class InventoryComponent implements OnInit {
  filterText: string = ''; // Campo do filtro de nome

  inventory$: Observable<Item[]>;
  private inventorySubject = new BehaviorSubject<void>(undefined);
  loading$ = new BehaviorSubject<boolean>(false);
  error: string | null = null;
  isSubmitting = false;
  showDeleteConfirm = false;
  itemToDelete: string | null = null;

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
      }),
      // Aplica o filtro pelo nome
      switchMap((items: Item[]) => {
        if (!this.filterText) return of(items);
        const filtered = items.filter(item => item.nome.toLowerCase().includes(this.filterText.toLowerCase()));
        return of(filtered);
      })
    );
  }

  ngOnInit(): void {
    this.loadInventory();
  }

  loadInventory(): void {
    this.inventorySubject.next();
  }

  onFilterChange(): void {
    this.loadInventory();
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
    if (!currentUser || !currentUser.id) {
      console.error('User not logged in or missing user ID');
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
      this.inventoryService.createItem(formValue, currentUser.id as string).pipe(
        tap(() => this.loadInventory()),
        catchError(err => {
          console.error('Error creating item:', err);
          return of(null);
        })
      ).subscribe(() => this.closeForm());
    }
  }

  trackByItemId(index: number, item: Item): string {
    return item.id;
  }

  confirmDelete(item: Item): void {
    this.itemToDelete = item.id;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.itemToDelete = null;
  }

  deleteItem(): void {
    if (!this.itemToDelete) return;
    
    this.isSubmitting = true;
    this.inventoryService.deleteItem(this.itemToDelete).pipe(
      tap(() => {
        this.loadInventory();
        this.showDeleteConfirm = false;
        this.itemToDelete = null;
        this.error = null;
      }),
      catchError(err => {
        console.error('Error deleting item:', err);
        this.error = 'Failed to delete item';
        return of(null);
      }),
      finalize(() => this.isSubmitting = false)
    ).subscribe();
  }

  toggleSale(item: Item): void {
    if (item.venda) {
      // Unlist from sale
      this.inventoryService.unlistFromSale(item.id).pipe(
        tap(() => this.loadInventory()),
        catchError(err => {
          console.error('Error unlisting item:', err);
          this.error = 'Failed to unlist item';
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
            this.error = 'Failed to list item for sale';
            return of(null);
          })
        ).subscribe();
      }
    }
  }
}
