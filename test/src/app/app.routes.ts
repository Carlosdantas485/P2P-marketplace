import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { InventoryComponent } from './components/inventory/inventory.component';
import { ProfileComponent } from './components/profile/profile.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: HomeComponent },
  { path: 'account', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'inventory', component: InventoryComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/login' }
];
