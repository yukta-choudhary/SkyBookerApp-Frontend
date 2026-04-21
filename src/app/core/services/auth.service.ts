import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ProfileResponse,
  ProfileUpdateRequest,
  ChangePasswordRequest,
  UserSummaryResponse,
  Role
} from '../models/index';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/auth`;

  // Reactive current user signal
  currentUser = signal<AuthResponse | null>(this.loadStoredUser());

  private loadStoredUser(): AuthResponse | null {
    try {
      const stored = localStorage.getItem('skybooker_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // --- Auth ---

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, payload).pipe(
      tap(res => this.saveSession(res))
    );
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, payload).pipe(
      tap(res => this.saveSession(res))
    );
  }

  logout(): void {
    this.http.post(`${this.baseUrl}/logout`, {}).subscribe({ error: () => {} });
    this.clearSession();
    this.router.navigateByUrl('/auth/login');
  }

  refreshToken(token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/refresh`, { refreshToken: token }).pipe(
      tap(res => this.saveSession(res))
    );
  }

  // --- Profile ---

  getProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.baseUrl}/me`);
  }

  updateProfile(payload: ProfileUpdateRequest): Observable<ProfileResponse> {
    return this.http.patch<ProfileResponse>(`${this.baseUrl}/me`, payload);
  }

  changePassword(payload: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/me/change-password`, payload);
  }

  deactivateAccount(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/me`);
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/forgot-password`, { email });
  }

  verifyOtp(email: string, otp: string): Observable<{ message: string; token: string }> {
    return this.http.post<{ message: string; token: string }>(`${this.baseUrl}/verify-otp`, { email, otp });
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/reset-password`, { token, newPassword });
  }

  // --- Admin ---

  getAllUsers(): Observable<UserSummaryResponse[]> {
    return this.http.get<UserSummaryResponse[]>(`${this.baseUrl}/admin/users`);
  }

  getUsersByRole(role: Role): Observable<UserSummaryResponse[]> {
    return this.http.get<UserSummaryResponse[]>(`${this.baseUrl}/admin/users/role/${role}`);
  }

  // --- Session Helpers ---

  saveSession(res: AuthResponse): void {
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('skybooker_user', JSON.stringify(res));
    this.currentUser.set(res);
  }

  clearSession(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('skybooker_user');
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getRole(): Role | null {
    return this.currentUser()?.role ?? null;
  }

  getUserId(): string | null {
    return this.currentUser()?.userId ?? null;
  }

  isPassenger(): boolean {
    return this.getRole() === 'PASSENGER';
  }

  isStaff(): boolean {
    return this.getRole() === 'AIRLINE_STAFF';
  }

  isAdmin(): boolean {
    return this.getRole() === 'ADMIN';
  }
}