import { Component, inject, signal, HostListener, computed, OnInit, OnDestroy } from '@angular/core';
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
export class NavbarComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  private readonly notifService = inject(NotificationService);
  private readonly router = inject(Router);

  mobileMenuOpen = signal(false);
  unreadCount = computed(() => this.notifService.unreadCount());
  private unreadPollId: ReturnType<typeof setInterval> | null = null;

  user = computed(() => this.authService.currentUser());
  isLoggedIn = computed(() => this.authService.isLoggedIn());
  role = computed(() => this.authService.getRole());

  ngOnInit(): void {
    this.refreshUnreadCount();
    this.unreadPollId = setInterval(() => this.refreshUnreadCount(), 30000);
  }

  ngOnDestroy(): void {
    if (this.unreadPollId) {
      clearInterval(this.unreadPollId);
    }
  }

  private refreshUnreadCount(): void {
    if (this.isLoggedIn()) {
      const userId = this.authService.getUserId();
      if (userId) {
        this.notifService.getUnreadCount(userId).subscribe({
          next: (count) => this.notifService.setUnreadCount(count),
          error: () => {}
        });
      }
    } else {
      this.notifService.setUnreadCount(0);
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

  getProfileRoute(): string {
    const r = this.role();
    if (r === 'AIRLINE_STAFF') return '/staff/profile';
    if (r === 'ADMIN') return '/admin/profile';
    return '/passenger/profile';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobile();
  }
}
