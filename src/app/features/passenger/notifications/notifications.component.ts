import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification } from '../../../core/models/index';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="notif-page">
      <div class="notif-container">
        <div class="notif-header">
          <h1><span class="material-symbols-rounded">notifications</span> Notifications</h1>
          @if (notifications().length > 0) {
            <button class="mark-all-btn" (click)="markAll()">Mark all as read</button>
          }
        </div>
        @if (loading()) { <div class="notif-loading"><div class="spinner"></div></div> }
        @if (!loading() && notifications().length === 0) {
          <div class="notif-empty">
            <span class="material-symbols-rounded" style="font-size:52px;color:#cabdff">notifications_none</span>
            <p>You're all caught up! No notifications.</p>
          </div>
        }
        @for (n of notifications(); track n.notificationId) {
          <div class="notif-card" [class.unread]="!n.isRead" (click)="markRead(n)">
            <div class="notif-ic-wrap">
              <span class="material-symbols-rounded mat-icon-filled" style="font-size:22px">{{ getIcon(n.type) }}</span>
            </div>
            <div class="notif-text">
              <p class="notif-title-txt">{{ n.title }}</p>
              <p class="notif-msg-txt">{{ n.message }}</p>
              <span class="notif-ts">{{ formatDate(n.sentAt) }}</span>
            </div>
            @if (!n.isRead) { <span class="unread-dot"></span> }
          </div>
        }
      </div>
    </main>
    <app-footer></app-footer>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .notif-page { flex: 1; padding: 28px 0 56px; background: #f4f2fa; }
    .notif-container { max-width: 760px; margin: 0 auto; padding: 0 24px; }
    .notif-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
    .notif-header h1 { display: flex; align-items: center; gap: 10px; font-size: 1.5rem; font-weight: 800; color: #17141f; }
    .notif-header h1 .material-symbols-rounded { font-size: 26px; color: #5b38ff; }
    .mark-all-btn { padding: 8px 16px; border-radius: 10px; border: 1.5px solid #e3dff0; background: #fff; color: #5b38ff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.18s; }
    .mark-all-btn:hover { background: rgba(91,56,255,0.06); }
    .notif-card { display: flex; align-items: flex-start; gap: 14px; padding: 16px 20px; background: #fff; border-radius: 14px; border: 1.5px solid #ede9f6; margin-bottom: 10px; cursor: pointer; transition: all 0.18s; position: relative; }
    .notif-card:hover { border-color: #cabdff; box-shadow: 0 4px 14px rgba(91,56,255,0.08); }
    .notif-card.unread { border-left: 3px solid #5b38ff; background: rgba(91,56,255,0.02); }
    .notif-ic-wrap { width: 40px; height: 40px; border-radius: 12px; background: rgba(91,56,255,0.09); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #5b38ff; }
    .notif-text { flex: 1; }
    .notif-title-txt { font-size: 14px; font-weight: 700; color: #17141f; margin: 0 0 4px; }
    .notif-msg-txt { font-size: 13px; color: #80798e; margin: 0 0 6px; line-height: 1.5; }
    .notif-ts { font-size: 11px; color: #b0a8be; }
    .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: #5b38ff; flex-shrink: 0; margin-top: 6px; }
    .notif-loading { display: flex; justify-content: center; padding: 40px; }
    .spinner { width: 30px; height: 30px; border: 3px solid #e3dff0; border-top-color: #5b38ff; border-radius: 50%; animation: spin 0.75s linear infinite; }
    .notif-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 24px; background: #fff; border-radius: 18px; text-align: center; }
    .notif-empty p { font-size: 14px; color: #80798e; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class NotificationsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly notifService = inject(NotificationService);
  notifications = signal<Notification[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    const uid = this.authService.getUserId();
    if (!uid) return;
    this.notifService.getNotifications(uid).pipe(catchError(() => of([]))).subscribe(n => {
      this.notifications.set(n);
      this.loading.set(false);
    });
  }

  markRead(n: Notification): void {
    if (n.isRead) return;
    this.notifService.markAsRead(n.notificationId).pipe(catchError(() => of(null))).subscribe(updated => {
      if (updated) {
        this.notifications.update(list => list.map(x => x.notificationId === updated.notificationId ? updated : x));
      }
    });
  }

  markAll(): void {
    const uid = this.authService.getUserId();
    if (!uid) return;
    this.notifService.markAllAsRead(uid).pipe(catchError(() => of(null))).subscribe(() => {
      this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
    });
  }

  getIcon(type: string): string {
    const m: Record<string, string> = { BOOKING_CONFIRMED: 'check_circle', FLIGHT_DELAY: 'schedule', GATE_CHANGE: 'door_front', CHECKIN_REMINDER: 'assignment_turned_in', BOARDING_REMINDER: 'flight_takeoff', PAYMENT_SUCCESS: 'payments', BOOKING_CANCELLED: 'cancel', GENERAL: 'notifications' };
    return m[type] || 'notifications';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  }
}
