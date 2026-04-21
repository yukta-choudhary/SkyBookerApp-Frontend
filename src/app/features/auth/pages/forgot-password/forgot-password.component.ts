import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { NavbarComponent } from '../../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../../shared/footer/footer.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="fp-page">
      <div class="fp-card">
        <span class="material-symbols-rounded fp-icon mat-icon-filled">lock_reset</span>
        <h2>Forgot Password?</h2>

        @if (step() === 1) {
          <p class="fp-sub">Enter your email and we'll send you an OTP to reset your password.</p>
          <form (ngSubmit)="sendOtp()" class="fp-form">
            <div class="field-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="email" name="email" placeholder="Enter your email" required />
            </div>
            @if (error()) { <div class="fp-error">{{ error() }}</div> }
            <button type="submit" class="fp-btn" [disabled]="loading()">
              @if (loading()) { <span class="btn-spinner"></span> Sending... }
              @else { Send OTP }
            </button>
          </form>
        }

        @if (step() === 2) {
          <p class="fp-sub">Enter the 6-digit OTP sent to <strong>{{ email }}</strong></p>
          <form (ngSubmit)="verifyOtp()" class="fp-form">
            <div class="field-group">
              <label>OTP Code</label>
              <input type="text" [(ngModel)]="otp" name="otp" placeholder="Enter 6-digit OTP" maxlength="6" required class="otp-input" />
            </div>
            @if (error()) { <div class="fp-error">{{ error() }}</div> }
            <button type="submit" class="fp-btn" [disabled]="loading()">
              @if (loading()) { <span class="btn-spinner"></span> Verifying... }
              @else { Verify OTP }
            </button>
            <button type="button" class="resend-btn" (click)="sendOtp()" [disabled]="loading()">Resend OTP</button>
          </form>
        }

        @if (step() === 3) {
          <p class="fp-sub">Enter your new password.</p>
          <form (ngSubmit)="resetPassword()" class="fp-form">
            <div class="field-group">
              <label>New Password</label>
              <input type="password" [(ngModel)]="newPassword" name="newPassword" placeholder="Min 8 characters" required />
            </div>
            <div class="field-group">
              <label>Confirm New Password</label>
              <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" placeholder="Confirm password" required />
            </div>
            @if (error()) { <div class="fp-error">{{ error() }}</div> }
            <button type="submit" class="fp-btn" [disabled]="loading()">
              @if (loading()) { <span class="btn-spinner"></span> Resetting... }
              @else { Reset Password }
            </button>
          </form>
        }

        @if (step() === 4) {
          <div class="fp-success">
            <span class="material-symbols-rounded mat-icon-filled" style="font-size:40px;color:#22c55e">check_circle</span>
            <p>Password reset successful! You can now sign in.</p>
          </div>
        }

        <a routerLink="/auth/login" class="back-link">
          <span class="material-symbols-rounded">arrow_back</span> Back to Sign In
        </a>
      </div>
    </main>
    <app-footer></app-footer>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .fp-page { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 24px; background: radial-gradient(circle at top left,rgba(161,130,255,0.18),transparent 28%),radial-gradient(circle at bottom right,rgba(255,123,92,0.12),transparent 30%),linear-gradient(135deg,#eeebf6,#e9e6f4,#f4f2fa); }
    .fp-card { background: white; padding: 44px 40px; border-radius: 24px; box-shadow: 0 20px 60px rgba(53,28,97,0.14); max-width: 420px; width: 100%; text-align: center; border: 1px solid rgba(255,255,255,0.8); animation: fadeUp 0.5s ease; }
    .fp-icon { font-size: 48px; color: #5b38ff; display: block; margin-bottom: 14px; }
    h2 { font-size: 1.7rem; font-weight: 800; color: #17141f; margin: 0 0 8px; }
    .fp-sub { font-size: 14px; color: #80798e; margin-bottom: 28px; line-height: 1.6; }
    .fp-form { text-align: left; }
    .field-group { margin-bottom: 16px; }
    .field-group label { display: block; font-size: 13px; font-weight: 600; color: #282433; margin-bottom: 7px; }
    .field-group input { width: 100%; height: 50px; padding: 0 14px; border-radius: 12px; border: 1.5px solid #ddd8ea; background: #faf9fd; font-size: 14px; font-family: inherit; color: #17141f; outline: none; transition: all 0.2s; }
    .field-group input:focus { border-color: #7b5cff; box-shadow: 0 0 0 4px rgba(123,92,255,0.10); }
    .otp-input { letter-spacing: 6px; font-size: 22px; font-weight: 700; text-align: center; }
    .fp-error { padding: 10px 14px; border-radius: 10px; background: rgba(255,76,76,0.08); color: #bc2d2d; border: 1px solid rgba(255,76,76,0.15); font-size: 13px; margin-bottom: 14px; }
    .fp-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 50px; border: none; border-radius: 14px; font-size: 15px; font-weight: 700; color: white; cursor: pointer; font-family: inherit; background: linear-gradient(90deg,#5b38ff,#7448ff,#ff8f73); box-shadow: 0 8px 22px rgba(91,56,255,0.24); transition: all 0.2s; }
    .fp-btn:hover:not(:disabled) { transform: translateY(-1px); }
    .fp-btn:disabled { opacity: 0.7; cursor: not-allowed; }
    .resend-btn { display: block; width: 100%; margin-top: 12px; padding: 10px; border: 1.5px solid #e3dff0; border-radius: 12px; background: #fff; color: #5b38ff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.18s; }
    .resend-btn:hover:not(:disabled) { background: rgba(91,56,255,0.04); }
    .resend-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .fp-success { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 20px; }
    .fp-success p { font-size: 14px; color: #4a4558; }
    .back-link { display: inline-flex; align-items: center; gap: 6px; margin-top: 20px; color: #5b38ff; font-size: 14px; font-weight: 600; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
    .back-link .material-symbols-rounded { font-size: 18px; }
    .btn-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';
  resetToken = ''; // token returned by OTP verification

  step = signal(1); // 1=email, 2=otp, 3=new password, 4=done
  loading = signal(false);
  error = signal('');

  sendOtp(): void {
    if (!this.email.trim()) { this.error.set('Please enter your email.'); return; }
    this.loading.set(true); this.error.set('');
    this.authService.forgotPassword(this.email.trim()).subscribe({
      next: () => { this.loading.set(false); this.step.set(2); },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.message || 'Failed to send OTP.'); }
    });
  }

  verifyOtp(): void {
    if (!this.otp.trim() || this.otp.trim().length < 6) { this.error.set('Please enter the 6-digit OTP.'); return; }
    this.loading.set(true); this.error.set('');
    this.authService.verifyOtp(this.email.trim(), this.otp.trim()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.resetToken = (res as any).accessToken || res.token || this.otp.trim();
        this.step.set(3);
      },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.message || 'Invalid or expired OTP.'); }
    });
  }

  resetPassword(): void {
    if (!this.newPassword || this.newPassword.length < 8) { this.error.set('Password must be at least 8 characters.'); return; }
    if (this.newPassword !== this.confirmPassword) { this.error.set('Passwords do not match.'); return; }
    this.loading.set(true); this.error.set('');
    this.authService.resetPassword(this.resetToken, this.newPassword).subscribe({
      next: () => { this.loading.set(false); this.step.set(4); },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.message || 'Failed to reset password.'); }
    });
  }
}
