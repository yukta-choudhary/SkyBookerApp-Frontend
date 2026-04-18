import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification, BroadcastRequest, BroadcastResponse } from '../models/index';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/notifications`;

  getNotifications(userId: string): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.baseUrl}/user/${userId}`);
  }
  getUnreadNotifications(userId: string): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.baseUrl}/user/${userId}/unread`);
  }
  getUnreadCount(userId: string): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/user/${userId}/unread/count`);
  }
  markAsRead(notificationId: string): Observable<Notification> {
    return this.http.put<Notification>(`${this.baseUrl}/${notificationId}/read`, {});
  }
  markAllAsRead(userId: string): Observable<number> {
    return this.http.put<number>(`${this.baseUrl}/user/${userId}/read-all`, {});
  }
  deleteNotification(notificationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${notificationId}`);
  }
  broadcastNotification(payload: BroadcastRequest): Observable<BroadcastResponse> {
    return this.http.post<BroadcastResponse>(`${this.baseUrl}/admin/broadcast`, payload);
  }
}
