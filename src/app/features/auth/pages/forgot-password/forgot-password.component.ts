import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
        <p class="fp-sub">Enter your email and we'll send you a link to reset your password.</p>

        @if (!sent()) {
          <form (ngSubmit)="submit()" class="fp-form">
            <div class="field-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="email" name="email" placeholder="Enter your email" required />
            </div>
            @if (error()) { <div class="fp-error">{{ error() }}</div> }
            <button type="submit" class="fp-btn" [disabled]="loading()">
              @if (loading()) { <span class="btn-spinner"></span> Sending... }
              @else { Send Reset Link }
            </button>
          </form>
        } @else {
          <div class="fp-success">
            <span class="material-symbols-rounded mat-icon-filled" style="font-size:40px;color:#22c55e">check_circle</span>
            <p>Reset link sent! Check your email.</p>
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
    .fp-error { padding: 10px 14px; border-radius: 10px; background: rgba(255,76,76,0.08); color: #bc2d2d; border: 1px solid rgba(255,76,76,0.15); font-size: 13px; margin-bottom: 14px; }
    .fp-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 50px; border: none; border-radius: 14px; font-size: 15px; font-weight: 700; color: white; cursor: pointer; font-family: inherit; background: linear-gradient(90deg,#5b38ff,#7448ff,#ff8f73); box-shadow: 0 8px 22px rgba(91,56,255,0.24); transition: all 0.2s; }
    .fp-btn:hover:not(:disabled) { transform: translateY(-1px); }
    .fp-btn:disabled { opacity: 0.7; cursor: not-allowed; }
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
  email = '';
  loading = signal(false);
  error = signal('');
  sent = signal(false);

  submit(): void {
    if (!this.email.trim()) { this.error.set('Please enter your email.'); return; }
    this.loading.set(true); this.error.set('');
    this.authService.forgotPassword(this.email.trim()).subscribe({
      next: () => { this.loading.set(false); this.sent.set(true); },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.message || 'Failed to send reset email.'); }
    });
  }
}
