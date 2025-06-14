import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { InventoryComponent } from './components/inventory/inventory.component';
import { ProfileComponent } from './components/profile/profile.component';
import { DepositComponent } from './components/deposit/deposit.component';
import { WishlistComponent } from './components/wishlist/wishlist.component';
import { authGuard } from './guards/auth.guard';
import { ConfirmPaymentComponent } from './components/confirm-payment/confirm-payment.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'account', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'inventory', component: InventoryComponent, canActivate: [authGuard] },
  { path: 'deposit', component: DepositComponent, canActivate: [authGuard] },
  { path: 'wishlist', component: WishlistComponent, canActivate: [authGuard] },
  { path: 'confirm-payment', component: ConfirmPaymentComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/home' }
];
