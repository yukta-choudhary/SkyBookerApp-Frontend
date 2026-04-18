import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink, NavbarComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="unauth-page">
      <div class="unauth-card">
        <span class="material-symbols-rounded unauth-icon">lock</span>
        <h1>Access Denied</h1>
        <p>You don't have permission to view this page.</p>
        <a routerLink="/home" class="back-btn">
          <span class="material-symbols-rounded">arrow_back</span>
          Go Home
        </a>
      </div>
    </main>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .unauth-page { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 24px; background: #f4f2fa; }
    .unauth-card { text-align: center; background: white; padding: 56px 48px; border-radius: 24px; box-shadow: 0 8px 30px rgba(53,28,97,0.10); max-width: 440px; border: 1px solid #ede9f6; }
    .unauth-icon { font-size: 64px; color: #cabdff; display: block; margin-bottom: 16px; font-variation-settings: 'FILL' 1; }
    h1 { font-size: 1.8rem; font-weight: 800; color: #17141f; margin: 0 0 10px; }
    p { font-size: 15px; color: #80798e; margin-bottom: 24px; }
    .back-btn { display: inline-flex; align-items: center; gap: 7px; padding: 12px 22px; border-radius: 12px; background: linear-gradient(90deg,#5b38ff,#7448ff); color: white; text-decoration: none; font-size: 14px; font-weight: 700; box-shadow: 0 4px 14px rgba(91,56,255,0.25); transition: all 0.2s; }
    .back-btn:hover { transform: translateY(-1px); }
    .back-btn .material-symbols-rounded { font-size: 18px; }
  `]
})
export class UnauthorizedComponent {}
