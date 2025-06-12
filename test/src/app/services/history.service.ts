import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private usersApiUrl = 'http://localhost:3000/users';

  constructor(private http: HttpClient, private authService: AuthService) { }

  getHistory(): Observable<any[]> {
    const currentUser = this.authService.currentUserValue;
    if (currentUser && currentUser.id) {
      return this.http.get<any>(`${this.usersApiUrl}/${currentUser.id}`).pipe(
        map(user => user.historicoTransferencias || [])
      );
    }
    return of([]);
  }
}
