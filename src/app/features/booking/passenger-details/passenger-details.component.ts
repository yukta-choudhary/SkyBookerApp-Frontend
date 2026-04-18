import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { PassengerService } from '../../../core/services/passenger.service';
import { AuthService } from '../../../core/services/auth.service';
import { PassengerCreateRequest, TripType } from '../../../core/models/index';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-passenger-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="pd-page">
      <div class="pd-container">
        <div class="step-header">
          <a [routerLink]="['/booking/seats', flightId]" class="back-btn">
            <span class="material-symbols-rounded">arrow_back</span> Back
          </a>
          <div class="steps">
            <span class="step done">1. Seat</span>
            <span class="step-sep material-symbols-rounded">chevron_right</span>
            <span class="step active">2. Passengers</span>
            <span class="step-sep material-symbols-rounded">chevron_right</span>
            <span class="step">3. Payment</span>
          </div>
        </div>

        <h1>Passenger Details</h1>

        <div class="pd-grid">
          <div class="pd-form-card">
            <h3>Primary Passenger</h3>
            <div class="form-row-2">
              <div class="form-group">
                <label>Title</label>
                <select [(ngModel)]="form.title" class="form-ctrl fc-sel">
                  <option value="Mr">Mr</option><option value="Ms">Ms</option><option value="Mrs">Mrs</option><option value="Dr">Dr</option>
                </select>
              </div>
              <div class="form-group">
                <label>Passenger Type</label>
                <select [(ngModel)]="form.passengerType" class="form-ctrl fc-sel">
                  <option value="ADULT">Adult (12+)</option><option value="CHILD">Child (2-11)</option><option value="INFANT">Infant (&lt;2)</option>
                </select>
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-group"><label>First Name *</label><input type="text" [(ngModel)]="form.firstName" class="form-ctrl" /></div>
              <div class="form-group"><label>Last Name *</label><input type="text" [(ngModel)]="form.lastName" class="form-ctrl" /></div>
            </div>
            <div class="form-row-2">
              <div class="form-group"><label>Date of Birth</label><input type="date" [(ngModel)]="form.dateOfBirth" class="form-ctrl" /></div>
              <div class="form-group">
                <label>Gender</label>
                <select [(ngModel)]="form.gender" class="form-ctrl fc-sel">
                  <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-group"><label>Passport Number</label><input type="text" [(ngModel)]="form.passportNumber" class="form-ctrl" /></div>
              <div class="form-group"><label>Nationality</label><input type="text" [(ngModel)]="form.nationality" class="form-ctrl" /></div>
            </div>
            <div class="form-group"><label>Passport Expiry</label><input type="date" [(ngModel)]="form.passportExpiry" class="form-ctrl" style="max-width:200px" /></div>
          </div>

          <div class="pd-contact-card">
            <h3>Contact Info</h3>
            <div class="form-group"><label>Contact Email *</label><input type="email" [(ngModel)]="contactEmail" class="form-ctrl" /></div>
            <div class="form-group"><label>Contact Phone *</label><input type="tel" [(ngModel)]="contactPhone" class="form-ctrl" /></div>
          </div>
        </div>

        @if (error()) { <div class="pd-error">{{ error() }}</div> }

        <button class="next-btn" [disabled]="loading()" (click)="proceed()">
          @if (loading()) { <span class="btn-sp"></span> Processing... }
          @else { Continue to Payment <span class="material-symbols-rounded">arrow_forward</span> }
        </button>
      </div>
    </main>
    <app-footer></app-footer>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .pd-page { flex: 1; padding: 28px 0 56px; background: #f4f2fa; }
    .pd-container { max-width: 900px; margin: 0 auto; padding: 0 24px; }
    .step-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .back-btn { display: flex; align-items: center; gap: 6px; color: #5b38ff; font-size: 14px; font-weight: 600; text-decoration: none; }
    .steps { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .step { color: #9a92aa; font-weight: 600; }
    .step.active { color: #5b38ff; font-weight: 700; }
    .step.done { color: #22c55e; font-weight: 700; }
    .step-sep { font-size: 16px; color: #cabdff; }
    h1 { font-size: 1.4rem; font-weight: 800; color: #17141f; margin-bottom: 20px; }
    .pd-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 20px; }
    .pd-form-card, .pd-contact-card { background: #fff; border-radius: 18px; border: 1px solid #ede9f6; padding: 24px; box-shadow: 0 2px 10px rgba(53,28,97,0.05); }
    .pd-form-card h3, .pd-contact-card h3 { font-size: 15px; font-weight: 700; color: #17141f; margin: 0 0 18px; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .form-group label { font-size: 13px; font-weight: 600; color: #282433; }
    .form-ctrl { width: 100%; height: 46px; padding: 0 14px; border-radius: 11px; border: 1.5px solid #e3dff0; background: #faf9fd; font-size: 14px; font-family: inherit; color: #17141f; outline: none; transition: all 0.18s; }
    .form-ctrl:focus { border-color: #7b5cff; box-shadow: 0 0 0 4px rgba(123,92,255,0.10); }
    .fc-sel { cursor: pointer; }
    .pd-error { padding: 10px 14px; border-radius: 10px; background: rgba(255,76,76,0.08); color: #bc2d2d; border: 1px solid rgba(255,76,76,0.15); font-size: 13px; margin-bottom: 14px; }
    .next-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 52px; border-radius: 14px; border: none; background: linear-gradient(90deg,#5b38ff,#7448ff,#ff8f73); color: white; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; box-shadow: 0 8px 22px rgba(91,56,255,0.24); transition: all 0.2s; }
    .next-btn:hover:not(:disabled) { transform: translateY(-1px); }
    .next-btn:disabled { opacity: 0.7; cursor: not-allowed; }
    .next-btn .material-symbols-rounded { font-size: 20px; }
    .btn-sp { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 600px) { .form-row-2 { grid-template-columns: 1fr; } .pd-container { padding: 0 12px; } }
  `]
})
export class PassengerDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingService = inject(BookingService);
  private readonly passengerService = inject(PassengerService);
  private readonly authService = inject(AuthService);

  flightId = '';
  seatId = '';
  seatNumber = '';
  passengers = 1;
  tripType: TripType = 'ONE_WAY';

  form: Partial<PassengerCreateRequest> = { title: 'Mr', firstName: '', lastName: '', dateOfBirth: '', gender: 'MALE', passportNumber: '', nationality: '', passportExpiry: '', passengerType: 'ADULT' };
  contactEmail = '';
  contactPhone = '';

  loading = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.flightId = this.route.snapshot.paramMap.get('flightId') || '';
    const p = this.route.snapshot.queryParams;
    this.seatId = p['seatId'] || '';
    this.seatNumber = p['seatNumber'] || '';
    this.passengers = parseInt(p['passengers'] || '1');
    this.tripType = p['tripType'] || 'ONE_WAY';
    const user = this.authService.currentUser();
    if (user) { this.contactEmail = user.email; }
  }

  proceed(): void {
    if (!this.form.firstName?.trim() || !this.form.lastName?.trim() || !this.contactEmail.trim() || !this.contactPhone.trim()) {
      this.error.set('Please fill in all required fields.'); return;
    }
    this.loading.set(true); this.error.set('');

    const now = new Date().toISOString();
    const payload = {
      userId: this.authService.getUserId()!,
      flightId: this.flightId,
      tripType: this.tripType,
      baseFare: 0, taxes: 0, totalFare: 0,
      contactEmail: this.contactEmail.trim(),
      contactPhone: this.contactPhone.trim(),
      departureTime: now
    };

    this.bookingService.createBooking(payload).pipe(catchError(err => { this.loading.set(false); this.error.set(err?.error?.message || 'Failed to create booking.'); return of(null); })).subscribe(booking => {
      if (!booking) return;
      const passengerPayload: PassengerCreateRequest = {
        userId: this.authService.getUserId()!,
        bookingId: booking.bookingId,
        title: this.form.title!,
        firstName: this.form.firstName!,
        lastName: this.form.lastName!,
        dateOfBirth: this.form.dateOfBirth!,
        gender: this.form.gender!,
        passportNumber: this.form.passportNumber!,
        nationality: this.form.nationality!,
        passportExpiry: this.form.passportExpiry!,
        passengerType: this.form.passengerType as any
      };
      this.passengerService.addPassenger(passengerPayload).pipe(catchError(() => of(null))).subscribe(p => {
        if (p && this.seatId) {
          this.passengerService.assignSeat(p.passengerId, this.seatId, this.seatNumber).pipe(catchError(() => of(null))).subscribe(() => {
            this.loading.set(false);
            this.router.navigate(['/booking/payment', booking.bookingId]);
          });
        } else {
          this.loading.set(false);
          this.router.navigate(['/booking/payment', booking.bookingId]);
        }
      });
    });
  }
}
