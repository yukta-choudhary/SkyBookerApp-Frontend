import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthResponse } from '../../../../core/models/index';

@Component({
  selector: 'app-oauth-success',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="oauth-loading">
      <div class="spinner"></div>
      <p>Signing you in…</p>
    </div>
  `,
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f4f2fa; }
    .oauth-loading { text-align: center; }
    .spinner { width: 36px; height: 36px; border: 3px solid #e3dff0; border-top-color: #5b38ff; border-radius: 50%; animation: spin 0.75s linear infinite; margin: 0 auto 16px; }
    p { font-size: 15px; color: #4a4558; font-weight: 600; font-family: 'Inter', sans-serif; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class OAuthSuccessComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    const accessToken = params['accessToken'];
    const refreshToken = params['refreshToken'];
    const email = params['email'];

    if (accessToken && refreshToken && email) {
      // Build a partial AuthResponse to save the session
      const res: AuthResponse = {
        userId: '',
        fullName: email.split('@')[0],
        email: email,
        role: 'PASSENGER',
        provider: 'GOOGLE',
        accessToken: accessToken,
        refreshToken: refreshToken,
        tokenType: 'Bearer',
        expiresIn: 86400,
        message: 'OAuth login successful'
      };
      this.authService.saveSession(res);

      // Fetch the actual profile to get correct userId, role, fullName
      this.authService.getProfile().subscribe({
        next: (profile) => {
          const updatedRes: AuthResponse = {
            ...res,
            userId: profile.userId,
            fullName: profile.fullName,
            role: profile.role,
          };
          this.authService.saveSession(updatedRes);

          // Redirect based on role
          if (profile.role === 'PASSENGER') this.router.navigateByUrl('/passenger/dashboard');
          else if (profile.role === 'AIRLINE_STAFF') this.router.navigateByUrl('/staff/dashboard');
          else if (profile.role === 'ADMIN') this.router.navigateByUrl('/admin/dashboard');
          else this.router.navigateByUrl('/');
        },
        error: () => {
          // Fallback: redirect to passenger dashboard
          this.router.navigateByUrl('/passenger/dashboard');
        }
      });
    } else {
      this.router.navigateByUrl('/auth/login');
    }
  }
}
