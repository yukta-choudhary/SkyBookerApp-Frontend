import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Notification, BroadcastRequest, BroadcastResponse } from '../models/index';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/notifications`;
  readonly unreadCount = signal(0);

  getNotifications(userId: string): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.baseUrl}/user/${userId}`);
  }
  getUnreadNotifications(userId: string): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.baseUrl}/user/${userId}/unread`);
  }
  getUnreadCount(userId: string): Observable<number> {
    return this.http.get<{ unreadCount: number }>(`${this.baseUrl}/user/${userId}/unread/count`).pipe(
      map(response => response.unreadCount)
    );
  }
  setUnreadCount(count: number): void {
    this.unreadCount.set(Math.max(0, count));
  }
  decrementUnreadCount(): void {
    this.unreadCount.update(count => Math.max(0, count - 1));
  }
  markAsRead(notificationId: string): Observable<Notification> {
    return this.http.put<Notification>(`${this.baseUrl}/${notificationId}/read`, {});
  }
  markAllAsRead(userId: string): Observable<number> {
    return this.http.put<{ updated: number }>(`${this.baseUrl}/user/${userId}/read-all`, {}).pipe(
      map(response => response.updated)
    );
  }
  deleteNotification(notificationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${notificationId}`);
  }
  broadcastNotification(payload: BroadcastRequest): Observable<BroadcastResponse> {
    return this.http.post<BroadcastResponse>(`${this.baseUrl}/admin/broadcast`, payload);
  }
}
