import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationListComponent } from '../notification-list/notification-list.component';
import { WishlistItem, WishlistService } from '../../services/wishlist.service';
import { UiService } from '../../services/ui.service';
import { Notification, NotificationService } from '../../services/notification.service';
import { map } from 'rxjs/operators';
import { Subscription, fromEvent, Observable, BehaviorSubject } from 'rxjs';

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
    AsyncPipe,
    NotificationListComponent
  ]
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  isMobileMenuOpen = false;
  isUserMenuOpen = false;
  isMobile = false;
  wishlistCount$: Observable<number>;
  totalNotificationCount$: Observable<number>;
  showNotificationsSidebar = false;
  notifications$!: Observable<Notification[]>;

  private userSubscription: Subscription | undefined;
  private wishlistSubscription: Subscription | undefined;
  private resizeSubscription: Subscription | undefined;

    constructor(
    private authService: AuthService,
    private router: Router,
    private wishlistService: WishlistService,
    private uiService: UiService,
    private notificationService: NotificationService
  ) {
        this.wishlistCount$ = this.wishlistService.wishlistItems$.pipe(map((items: WishlistItem[]) => items.length));
    this.totalNotificationCount$ = this.notificationService.totalNotificationCount$;
    this.notifications$ = this.notificationService.notifications$;
  }

  ngOnInit(): void {
    this.checkScreenWidth();
    this.setupResizeListener();
    
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      console.log('[HeaderComponent] Current user data updated:', this.currentUser);
      
      // Load wishlist count when user is logged in
            // Wishlist count is now handled by the wishlistCount$ observable directly.
      // The service itself initializes the wishlist from localStorage, so it's independent of login status.
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
        if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
    if (this.wishlistSubscription) {
      this.wishlistSubscription.unsubscribe();
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

    toggleWishlistSidebar(): void {
    this.uiService.toggleSidebar();
  }

  toggleNotifications(): void {
    this.showNotificationsSidebar = !this.showNotificationsSidebar;
    if (this.showNotificationsSidebar) {
      this.closeMenus(); // Close other menus when opening notifications
    }
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
