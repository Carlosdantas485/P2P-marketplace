import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, NgIf, NgClass } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription, fromEvent } from 'rxjs';

interface User {
  id: string;
  username: string;
  email: string;
  foto?: string;
  saldo: number;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    NgIf,
    NgClass
  ]
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  isMobileMenuOpen = false;
  isUserMenuOpen = false;
  isMobile = false;
  wishlistCount = 0;
  
  private userSubscription: Subscription | undefined;
  private resizeSubscription: Subscription | undefined;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkScreenWidth();
    this.setupResizeListener();
    
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      console.log('[HeaderComponent] Current user data updated:', this.currentUser);
      
      // Load wishlist count when user is logged in
      if (user) {
        this.loadWishlistCount();
      } else {
        this.wishlistCount = 0;
      }
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
  onResize(event: Event): void {
    this.checkScreenWidth();
  }

  private checkScreenWidth(): void {
    this.isMobile = window.innerWidth < 768;
    if (!this.isMobile) {
      this.isMobileMenuOpen = false;
      document.body.style.overflow = '';
    }
  }

  private setupResizeListener(): void {
    this.resizeSubscription = fromEvent(window, 'resize').subscribe(() => {
      this.checkScreenWidth();
    });
  }

  private loadWishlistCount(): void {
    // TODO: Implement wishlist count loading
    // Example: this.wishlistService.getCount().subscribe(count => this.wishlistCount = count);
    this.wishlistCount = 0; // Placeholder
  }

  toggleMobileMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    document.body.style.overflow = this.isMobileMenuOpen ? 'hidden' : '';
    
    // Close user menu when toggling mobile menu
    if (this.isUserMenuOpen) {
      this.isUserMenuOpen = false;
    }
  }

  toggleUserMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeMenuIfMobile(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.isMobile) {
      this.isMobileMenuOpen = false;
      document.body.style.overflow = '';
    }
  }

  closeMenus(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isMobileMenuOpen = false;
    this.isUserMenuOpen = false;
    document.body.style.overflow = '';
  }

  logout(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    this.authService.logout();
    this.router.navigate(['/login']);
    this.closeMenus();
  }
  
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    // Close menus when clicking outside
    const target = event.target as HTMLElement;
    const isClickInside = target.closest('.user-dropdown') || 
                         target.closest('.mobile-menu-toggle') ||
                         target.closest('.main-nav');
    
    if (!isClickInside) {
      this.closeMenus();
    }
  }
}
