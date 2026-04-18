import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { ProfileResponse, ProfileUpdateRequest, ChangePasswordRequest } from '../../../core/models/index';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="profile-page">
      <div class="profile-container">
        <h1 class="profile-title">
          <span class="material-symbols-rounded mat-icon-filled">person</span>
          My Profile
        </h1>

        @if (loading()) { <div class="p-loading"><div class="spinner"></div></div> }

        @if (!loading() && profile()) {
          <div class="profile-grid">
            <!-- Avatar Card -->
            <div class="avatar-card">
              <div class="profile-avatar">{{ profile()!.fullName.charAt(0).toUpperCase() }}</div>
              <h2 class="profile-name">{{ profile()!.fullName }}</h2>
              <span class="profile-email">{{ profile()!.email }}</span>
              <span class="profile-role-badge">{{ profile()!.role.replace('_', ' ') }}</span>
              <span class="provider-badge">via {{ profile()!.provider }}</span>
            </div>

            <!-- Edit Form -->
            <div class="edit-card">
              <h3>Edit Profile</h3>
              <div class="form-row">
                <div class="form-group">
                  <label>Full Name</label>
                  <input type="text" [(ngModel)]="editForm.fullName" class="form-ctrl" />
                </div>
                <div class="form-group">
                  <label>Phone</label>
                  <input type="tel" [(ngModel)]="editForm.phone" class="form-ctrl" />
                </div>
                <div class="form-group">
                  <label>Passport Number</label>
                  <input type="text" [(ngModel)]="editForm.passportNumber" class="form-ctrl" />
                </div>
                <div class="form-group">
                  <label>Nationality</label>
                  <input type="text" [(ngModel)]="editForm.nationality" class="form-ctrl" />
                </div>
              </div>
              @if (profileSuccess()) { <div class="alert-success"><span class="material-symbols-rounded">check_circle</span> {{ profileSuccess() }}</div> }
              @if (profileError()) { <div class="alert-error">{{ profileError() }}</div> }
              <button class="save-btn" [disabled]="profileLoading()" (click)="saveProfile()">
                @if (profileLoading()) { <span class="btn-spinner"></span> Saving... }
                @else { <span class="material-symbols-rounded">save</span> Save Changes }
              </button>
            </div>

            <!-- Change Password -->
            <div class="password-card">
              <h3>Change Password</h3>
              <div class="form-group"><label>Current Password</label><input type="password" [(ngModel)]="pwForm.oldPassword" class="form-ctrl" /></div>
              <div class="form-group"><label>New Password</label><input type="password" [(ngModel)]="pwForm.newPassword" class="form-ctrl" /></div>
              @if (pwSuccess()) { <div class="alert-success"><span class="material-symbols-rounded">check_circle</span> {{ pwSuccess() }}</div> }
              @if (pwError()) { <div class="alert-error">{{ pwError() }}</div> }
              <button class="save-btn" [disabled]="pwLoading()" (click)="changePassword()">
                @if (pwLoading()) { <span class="btn-spinner"></span> Updating... }
                @else { <span class="material-symbols-rounded">lock_reset</span> Update Password }
              </button>
            </div>
          </div>
        }
      </div>
    </main>
    <app-footer></app-footer>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .profile-page { flex: 1; padding: 28px 0 56px; background: #f4f2fa; }
    .profile-container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    .profile-title { display: flex; align-items: center; gap: 10px; font-size: 1.5rem; font-weight: 800; color: #17141f; margin-bottom: 24px; }
    .profile-title .material-symbols-rounded { font-size: 26px; color: #5b38ff; }
    .profile-grid { display: grid; grid-template-columns: 260px 1fr; gap: 20px; grid-template-rows: auto auto; align-items: start; }
    .avatar-card { background: #fff; border-radius: 20px; border: 1px solid #ede9f6; padding: 32px 24px; text-align: center; box-shadow: 0 2px 10px rgba(53,28,97,0.05); grid-row: 1 / 3; }
    .profile-avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg,#5b38ff,#ff8f73); color: white; font-size: 28px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
    .profile-name { font-size: 17px; font-weight: 800; color: #17141f; margin: 0 0 6px; }
    .profile-email { display: block; font-size: 13px; color: #80798e; margin-bottom: 12px; }
    .profile-role-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; background: rgba(91,56,255,0.10); color: #5b38ff; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; }
    .provider-badge { display: block; font-size: 11px; color: #9a92aa; margin-top: 6px; }
    .edit-card, .password-card { background: #fff; border-radius: 20px; border: 1px solid #ede9f6; padding: 24px; box-shadow: 0 2px 10px rgba(53,28,97,0.05); }
    .edit-card h3, .password-card h3 { font-size: 15px; font-weight: 700; color: #17141f; margin: 0 0 20px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 600; color: #282433; }
    .form-ctrl { height: 46px; padding: 0 14px; border-radius: 11px; border: 1.5px solid #e3dff0; background: #faf9fd; font-size: 14px; font-family: inherit; color: #17141f; outline: none; transition: all 0.18s; }
    .form-ctrl:focus { border-color: #7b5cff; box-shadow: 0 0 0 4px rgba(123,92,255,0.10); }
    .alert-success { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; background: rgba(34,197,94,0.09); color: #15803d; border: 1px solid rgba(34,197,94,0.18); font-size: 13px; margin-bottom: 14px; }
    .alert-success .material-symbols-rounded { font-size: 18px; }
    .alert-error { padding: 10px 14px; border-radius: 10px; background: rgba(255,76,76,0.08); color: #bc2d2d; border: 1px solid rgba(255,76,76,0.15); font-size: 13px; margin-bottom: 14px; }
    .save-btn { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 11px 22px; border-radius: 12px; border: none; background: linear-gradient(90deg,#5b38ff,#7448ff); color: white; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; box-shadow: 0 4px 14px rgba(91,56,255,0.25); transition: all 0.2s; }
    .save-btn:hover:not(:disabled) { transform: translateY(-1px); }
    .save-btn:disabled { opacity: 0.7; cursor: not-allowed; }
    .save-btn .material-symbols-rounded { font-size: 18px; }
    .btn-spinner { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
    .p-loading { display: flex; justify-content: center; padding: 60px; }
    .spinner { width: 30px; height: 30px; border: 3px solid #e3dff0; border-top-color: #5b38ff; border-radius: 50%; animation: spin 0.75s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 900px) { .profile-grid { grid-template-columns: 1fr; } .avatar-card { grid-row: auto; } }
    @media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } .profile-container { padding: 0 12px; } }
  `]
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  profile = signal<ProfileResponse | null>(null);
  loading = signal(true);
  editForm: ProfileUpdateRequest = { fullName: '', phone: '', passportNumber: '', nationality: '' };
  pwForm: ChangePasswordRequest = { oldPassword: '', newPassword: '' };
  profileLoading = signal(false); profileSuccess = signal(''); profileError = signal('');
  pwLoading = signal(false); pwSuccess = signal(''); pwError = signal('');

  ngOnInit(): void {
    this.authService.getProfile().pipe(catchError(() => of(null))).subscribe(p => {
      this.profile.set(p);
      if (p) { this.editForm = { fullName: p.fullName, phone: p.phone, passportNumber: p.passportNumber, nationality: p.nationality }; }
      this.loading.set(false);
    });
  }

  saveProfile(): void {
    this.profileLoading.set(true); this.profileError.set(''); this.profileSuccess.set('');
    this.authService.updateProfile(this.editForm).pipe(catchError(err => { this.profileLoading.set(false); this.profileError.set(err?.error?.message || 'Failed to update.'); return of(null); })).subscribe(p => {
      if (p) { this.profile.set(p); this.profileLoading.set(false); this.profileSuccess.set('Profile updated successfully!'); setTimeout(() => this.profileSuccess.set(''), 3000); }
    });
  }

  changePassword(): void {
    if (!this.pwForm.oldPassword || !this.pwForm.newPassword) { this.pwError.set('Both fields are required.'); return; }
    this.pwLoading.set(true); this.pwError.set(''); this.pwSuccess.set('');
    this.authService.changePassword(this.pwForm).pipe(catchError(err => { this.pwLoading.set(false); this.pwError.set(err?.error?.message || 'Failed to change password.'); return of(null); })).subscribe(r => {
      if (r) { this.pwLoading.set(false); this.pwSuccess.set('Password updated successfully!'); this.pwForm = { oldPassword: '', newPassword: '' }; setTimeout(() => this.pwSuccess.set(''), 3000); }
    });
  }
}
