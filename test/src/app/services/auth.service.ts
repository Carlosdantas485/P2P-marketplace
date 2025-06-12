import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';

export interface User {
  id: string;
  username: string;
  email: string;
  foto: string;
  saldo: number;
  nivel: number;
  vendas: number;
  password?: string;
  token?: string;
  historicoTransferencias: {
    tipo: 'VENDA' | 'COMPRA';
    skinNome: string;
    preco: number;
    data: Date;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000';
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private token: string | null = null;

  constructor(private http: HttpClient) {
    try {
      const userString = localStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      this.currentUserSubject = new BehaviorSubject<User | null>(user);
      this.currentUser = this.currentUserSubject.asObservable();
      
      // Debug logging
      console.log('Loaded user from localStorage:', user);
      console.log('Token from loaded user:', user?.token);
      
      // Check if token exists in localStorage
      const token = localStorage.getItem('token');
      console.log('Token from localStorage:', token);
    } catch (error) {
      console.error('Erro ao carregar usuário do localStorage:', error);
      this.currentUserSubject = new BehaviorSubject<User | null>(null);
      this.currentUser = this.currentUserSubject.asObservable();
    }
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public updateCurrentUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
    this.token = token;
  }

  clearToken(): void {
    localStorage.removeItem('token');
    this.token = null;
  }

  logout() {
    this.clearToken();
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  login(email: string, password: string): Observable<{ token: string, user: User }> {
    return this.http.post<{ token: string, user: User }>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        map((response: { token: string, user: User }) => {
          const userWithToken = { ...response.user, token: response.token };
          this.setToken(response.token);
          localStorage.setItem('user', JSON.stringify(userWithToken));
          this.updateCurrentUser(userWithToken);
          return response;
        }),
        catchError((error: any) => {
          console.error('Login error:', error);
          return throwError(() => new Error('Email ou senha inválidos'));
        })
      );
  }

  deleteAccount(): Observable<{ success: boolean, message?: string }> {
    return this.http.delete<{ success: boolean, message?: string }>(`${this.apiUrl}/delete-account`)
      .pipe(
        map((response: { success: boolean, message?: string }) => {
          if (response.success) {
            this.logout(); // Clear user data after successful deletion
          }
          return response;
        }),
        catchError((error: any) => {
          console.error('Error deleting account:', error);
          return throwError(() => new Error('Erro ao excluir conta'));
        })
      );
  }

  deposit(amount: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/deposit`, { amount }).pipe(
      tap(response => {
        if (response && response.user) {
          const currentUser = this.currentUserValue;
          // The user object from the backend doesn't have the token, so we merge it
          // with the existing user data to preserve the token.
          const updatedUser = { ...currentUser, ...response.user };
          if (currentUser && currentUser.token) {
            updatedUser.token = currentUser.token;
          }
          this.updateCurrentUser(updatedUser);
          console.log('[AuthService] User data updated after deposit.', updatedUser);
        }
      }),
      catchError((error: any) => {
          console.error('Deposit error:', error);
          return throwError(() => new Error(error.error?.message || 'Erro ao realizar o depósito.'));
      })
    );
  }

  updateAccount(partialUserData: Partial<User>): Observable<unknown> {
    const currentUser = this.currentUserValue;
    if (!currentUser || !currentUser.id) {
      console.error('Update Account Error: No current user or user ID.');
      return throwError(() => new Error('Nenhum usuário logado ou ID do usuário ausente.'));
    }

    console.log('--- Starting Account Update ---');
    console.log('Current User (before merge):', JSON.parse(JSON.stringify(currentUser)));
    console.log('Partial User Data from form:', JSON.parse(JSON.stringify(partialUserData)));

    const updatedData = { ...currentUser, ...partialUserData };

    console.log('Updated User Data (after merge):', JSON.parse(JSON.stringify(updatedData)));

    return this.http.put(`${this.apiUrl}/users/${currentUser.id}`, updatedData)
      .pipe(
        tap(() => {
          console.log('HTTP PUT successful. Updating current user in service.');
          this.updateCurrentUser(updatedData);
          console.log('--- Account Update Finished ---');
        }),
        catchError((error: any) => {
          console.error('Account update HTTP error:', error);
          return throwError(() => new Error('Erro ao atualizar conta'));
        })
      );
  }

  register(user: User): Observable<{ token: string, user: User }> {
    return this.http.post<{ token: string, user: User }>(`${this.apiUrl}/register`, user)
      .pipe(
        map((response: { token: string, user: User }) => {
          const userWithToken = { ...response.user, token: response.token };
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(userWithToken));
          this.token = response.token; // Store token in service
          console.log('Registration successful - Token stored:', response.token);
          this.currentUserSubject.next(userWithToken);
          return response;
        }),
        catchError((error: any) => {
          return throwError(() => new Error('Error registering user'));
        })
      );
  }

  getUserProfile(userId: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${userId}`)
      .pipe(
        map((user: User) => {
          // Remove password field as per server response
          const { password, ...userData } = user;
          return userData;
        }),
        catchError((error: any) => {
          console.error('Error fetching user profile:', error);
          return throwError(() => new Error('Erro ao obter perfil do usuário'));
        })
      );
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
