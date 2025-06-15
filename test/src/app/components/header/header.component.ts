import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { Subscription, fromEvent } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive
  ]
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isMobileMenuOpen = false;
  isMobile = false;
  private userSubscription: Subscription | undefined;
  private resizeSubscription: Subscription | undefined;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.checkScreenWidth();
    this.setupResizeListener();
    
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      console.log('[HeaderComponent] Current user data updated:', this.currentUser);
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenWidth();
  }

  private checkScreenWidth(): void {
    this.isMobile = window.innerWidth < 768;
    if (!this.isMobile) {
      this.isMobileMenuOpen = false;
    }
  }

  private setupResizeListener(): void {
    this.resizeSubscription = fromEvent(window, 'resize').subscribe(() => {
      this.checkScreenWidth();
    });
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    document.body.style.overflow = this.isMobileMenuOpen ? 'hidden' : '';
  }

  closeMenuIfMobile(): void {
    if (this.isMobile) {
      this.isMobileMenuOpen = false;
      document.body.style.overflow = '';
    }
  }

  logout(): void {
    this.authService.logout();
    this.closeMenuIfMobile();
    this.router.navigate(['/home']);
  }
}
