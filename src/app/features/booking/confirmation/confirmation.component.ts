import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { Booking } from '../../../core/models/index';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="conf-page">
      <div class="conf-container">
        @if (loading()) { <div class="c-loading"><div class="spinner"></div></div> }
        @if (!loading() && booking()) {
          <div class="conf-card animate-fade-up">
            <div class="conf-success-icon">
              <span class="material-symbols-rounded mat-icon-filled">check_circle</span>
            </div>
            <h1>Booking Confirmed!</h1>
            <p class="conf-sub">Your flight has been booked successfully. Safe travels!</p>

            <div class="pnr-display">
              <span class="pnr-label">Your PNR</span>
              <span class="pnr-number">{{ booking()!.pnrCode }}</span>
              <span class="pnr-hint">Use this code to check-in</span>
            </div>

            <div class="conf-details">
              <div class="conf-item"><span>Trip Type</span><strong>{{ booking()!.tripType.replace('_',' ') }}</strong></div>
              <div class="conf-item"><span>Contact</span><strong>{{ booking()!.contactEmail }}</strong></div>
              <div class="conf-item"><span>Amount Paid</span><strong class="amount-paid">₹{{ booking()!.totalFare.toLocaleString('en-IN') }}</strong></div>
            </div>

            <div class="conf-actions">
              <a routerLink="/passenger/my-bookings" class="btn-secondary">
                <span class="material-symbols-rounded">confirmation_number</span>
                View My Bookings
              </a>
              <a routerLink="/flights/search" class="btn-primary-conf">
                <span class="material-symbols-rounded">search</span>
                Book Another Flight
              </a>
            </div>
          </div>
        }
      </div>
    </main>
    <app-footer></app-footer>
  `,
  styles: [`
    :host{display:flex;flex-direction:column;min-height:100vh}
    .conf-page{flex:1;padding:48px 24px 56px;background:radial-gradient(circle at top,rgba(161,130,255,.18),transparent 40%),linear-gradient(135deg,#f0ecff,#ede9f6,#f8f6fd);display:flex;align-items:center;justify-content:center}
    .conf-container{width:100%;max-width:520px}
    .c-loading{display:flex;justify-content:center;padding:60px}
    .spinner{width:30px;height:30px;border:3px solid #e3dff0;border-top-color:#5b38ff;border-radius:50%;animation:spin .75s linear infinite}
    .conf-card{background:#fff;border-radius:24px;padding:48px 40px;text-align:center;box-shadow:0 20px 60px rgba(53,28,97,.14);border:1px solid rgba(255,255,255,.8)}
    .conf-success-icon .material-symbols-rounded{font-size:72px;color:#22c55e;display:block;margin-bottom:16px}
    h1{font-size:1.8rem;font-weight:800;color:#17141f;margin:0 0 10px}
    .conf-sub{font-size:15px;color:#80798e;margin:0 0 32px;line-height:1.6}
    .pnr-display{background:linear-gradient(135deg,#f4f2fa,#ede9f6);border-radius:16px;padding:24px;margin-bottom:24px;border:1px solid #e3dff0}
    .pnr-label{display:block;font-size:11px;font-weight:700;color:#9a92aa;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
    .pnr-number{display:block;font-size:2.4rem;font-weight:900;color:#5b38ff;letter-spacing:.05em;margin-bottom:6px}
    .pnr-hint{display:block;font-size:12px;color:#80798e}
    .conf-details{display:flex;flex-direction:column;gap:12px;margin-bottom:28px;text-align:left}
    .conf-item{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f4f2fa;font-size:14px;color:#4a4558}
    .conf-item:last-child{border-bottom:none}
    .conf-item strong{font-weight:700;color:#17141f}
    .amount-paid{color:#5b38ff;font-size:16px}
    .conf-actions{display:flex;gap:12px;flex-wrap:wrap}
    .btn-secondary{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:12px;border-radius:14px;border:1.5px solid #e3dff0;background:#fff;color:#4a4558;font-size:14px;font-weight:700;text-decoration:none;transition:all .18s;min-width:0}
    .btn-secondary:hover{background:#f4f2fa}
    .btn-secondary .material-symbols-rounded{font-size:18px}
    .btn-primary-conf{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:12px;border-radius:14px;border:none;background:linear-gradient(90deg,#5b38ff,#7448ff);color:white;font-size:14px;font-weight:700;text-decoration:none;box-shadow:0 4px 14px rgba(91,56,255,.25);transition:all .2s;min-width:0}
    .btn-primary-conf:hover{transform:translateY(-1px)}
    .btn-primary-conf .material-symbols-rounded{font-size:18px}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    .animate-fade-up{animation:fadeUp .5s ease}
    @media(max-width:480px){.conf-card{padding:32px 22px}.conf-actions{flex-direction:column}}
  `]
})
export class ConfirmationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingService = inject(BookingService);
  booking = signal<Booking | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('bookingId') || '';
    this.bookingService.getBookingById(id).pipe(catchError(() => of(null))).subscribe(b => {
      this.booking.set(b);
      this.loading.set(false);
    });
  }
}
