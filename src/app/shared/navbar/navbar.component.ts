import { Component, inject, signal, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  private readonly notifService = inject(NotificationService);
  private readonly router = inject(Router);

  mobileMenuOpen = signal(false);
  unreadCount = signal(0);

  user = computed(() => this.authService.currentUser());
  isLoggedIn = computed(() => this.authService.isLoggedIn());
  role = computed(() => this.authService.getRole());

  ngOnInit(): void {
    if (this.isLoggedIn()) {
      const userId = this.authService.getUserId();
      if (userId) {
        this.notifService.getUnreadCount(userId).subscribe({
          next: (count) => this.unreadCount.set(count),
          error: () => {}
        });
      }
    }
  }

  toggleMobile(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobile(): void {
    this.mobileMenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.closeMobile();
  }

  getDashboardRoute(): string {
    const r = this.role();
    if (r === 'AIRLINE_STAFF') return '/staff/dashboard';
    if (r === 'ADMIN') return '/admin/dashboard';
    return '/passenger/dashboard';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobile();
  }
}
