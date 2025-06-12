import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser.pipe(
    take(1),
    map(user => {
      if (user) {
        return true;
      }
      // Redirect to the login page if the user is not logged in
      router.navigate(['/login']);
      return false;
    })
  );
};
