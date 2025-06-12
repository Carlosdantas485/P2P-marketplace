import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const currentUser = this.authService.currentUserValue;
    console.log('AuthInterceptor - Current user:', currentUser);
    
    if (currentUser && currentUser.token) {
      console.log('Adding Authorization header with token:', currentUser.token);
      request = request.clone({
        setHeaders: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
    } else {
      console.log('No current user or token found');
    }

    return next.handle(request);
  }

  // For standalone components
  static createInterceptor(authService: AuthService): (req: HttpRequest<any>, next: (req: HttpRequest<any>) => Observable<HttpEvent<any>>) => Observable<HttpEvent<any>> {
    return (req, next) => {
      const currentUser = authService.currentUserValue;
      
      // Debug logging
      console.log('AuthInterceptor - Current user:', currentUser);
      console.log('AuthInterceptor - Token:', currentUser?.token);
      
      if (!currentUser?.token) {
        console.log('No token found - Request:', req.url);
        return next(req);
      }

      console.log('Adding Authorization header for:', req.url);
      const clonedReq = req.clone({
        setHeaders: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      // Debug logging of headers
      console.log('Request headers:', Array.from(clonedReq.headers.keys()));
      console.log('Authorization header:', clonedReq.headers.get('Authorization'));
      console.log('All headers:', Array.from(clonedReq.headers.keys()).map(key => ({
        name: key,
        value: clonedReq.headers.get(key)
      })));
      // Alternatively, you can use getAll() if you want to see all values for headers that can have multiple values
      // console.log('All headers:', Array.from(clonedReq.headers.keys()).map(key => ({
      //   name: key,
      //   values: clonedReq.headers.getAll(key)
      // })));
      
      
      return next(clonedReq);
    };
  }
}
