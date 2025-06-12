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
  loading = true;
  error: string | null = null;

  constructor(private historyService: HistoryService) { }

  ngOnInit(): void {
    this.historyService.getHistory().subscribe(
      (data) => {
        this.history = data;
        this.loading = false;
      },
      (err) => {
        this.error = 'Failed to load transaction history.';
        this.loading = false;
        console.error(err);
      }
    );
  }
}
