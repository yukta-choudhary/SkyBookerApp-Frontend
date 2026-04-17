import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);

  // Later replace with API Gateway URL
  private readonly baseUrl = 'http://localhost:8080/api/v1/auth';

  login(payload: LoginRequest): Observable<any> {
    // Real API call:
    // return this.http.post(`${this.baseUrl}/login`, payload);

    return of({
      success: true,
      token: 'mock-jwt-token',
      user: {
        email: payload.email
      }
    }).pipe(delay(900));
  }

  register(payload: RegisterRequest): Observable<any> {
    // Real API call:
    // return this.http.post(`${this.baseUrl}/register`, payload);


    return of({
      success: true,
      message: 'Registration successful',
      user: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email
      }
    }).pipe(delay(1100));
  }

  saveToken(token: string): void {
    localStorage.setItem('skybooker_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('skybooker_token');
  }

  clearSession(): void {
    localStorage.removeItem('skybooker_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}