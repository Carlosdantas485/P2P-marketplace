import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { routes } from './app.routes';
import { AuthService } from './services/auth.service';
import { authGuard } from './guards/auth.guard';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([AuthInterceptor])),
    AuthService
  ]
};
