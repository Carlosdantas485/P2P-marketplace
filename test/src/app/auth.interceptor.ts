import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    console.log(`[AuthInterceptor] Intercepting request to ${req.url}`);
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        console.log('[AuthInterceptor] Request body:', req.body);
    }

    if (token) {
      console.log(`[AuthInterceptor] Token found, adding Authorization header.`);
      const cloned = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(cloned);
    }

    console.log(`[AuthInterceptor] No token found, sending request without Authorization header.`);
    return next.handle(req);
  }
}
