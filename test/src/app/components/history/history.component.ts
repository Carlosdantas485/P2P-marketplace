import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryService } from '../../services/history.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  history: any[] = [];
  filteredHistory: any[] = [];
  filterType: string = 'all';

  totalCompras: number = 0;
  totalVendas: number = 0;
  totalDepositos: number = 0;

  loading = true;
  error: string | null = null;

  constructor(private historyService: HistoryService) { }

  ngOnInit(): void {
    this.historyService.getHistory().subscribe(
      (data) => {
        this.history = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        this.calculateTotals();
        this.applyFilter('all');
        this.loading = false;
      },
      (err) => {
        this.error = 'Failed to load transaction history.';
        this.loading = false;
        console.error(err);
      }
    );
  }

  calculateTotals(): void {
    this.totalCompras = 0;
    this.totalVendas = 0;
    this.totalDepositos = 0;

    for (const item of this.history) {
      if (item.type === 'compra') {
        this.totalCompras += item.price;
      } else if (item.type === 'venda') {
        this.totalVendas += item.price;
      } else if (item.type === 'deposito') {
        this.totalDepositos += item.amount;
      }
    }
  }

  applyFilter(type: string): void {
    this.filterType = type;
    if (type === 'all') {
      this.filteredHistory = this.history;
    } else {
      this.filteredHistory = this.history.filter(item => item.type === type);
    }
  }
}
