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
import { catchError, forkJoin, of, switchMap } from 'rxjs';

type MealOption = { id: string; name: string; description: string; price: number; preference?: string; imageUrl: string; tag: 'Included' | 'Veg' | 'Non Veg' | 'Jain'; };
type BaggageOption = { id: string; label: string; kg: number; price: number; };
type LegKey = 'outbound' | 'return';
type PassengerForm = Partial<PassengerCreateRequest>;

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
          <div class="forms-stack">
            @for (form of passengerForms; track $index) {
              <section class="pd-form-card">
                <div class="card-head">
                  <h3>Passenger {{ $index + 1 }}</h3>
                  <span>{{ outboundSeatNumbers[$index] || 'Seat pending' }} @if (tripType === 'ROUND_TRIP') { · {{ returnSeatNumbers[$index] || 'Return seat pending' }} }</span>
                </div>
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
              </section>
            }
          </div>

          <aside class="pd-side">
            <section class="pd-contact-card">
              <h3>Contact Info</h3>
              <div class="form-group"><label>Contact Email *</label><input type="email" [(ngModel)]="contactEmail" class="form-ctrl" /></div>
              <div class="form-group"><label>Contact Phone *</label><input type="tel" [(ngModel)]="contactPhone" class="form-ctrl" /></div>
            </section>
            <section class="fare-card sticky">
              <div><span>Flight fare</span><strong>₹{{ flightFareTotal().toLocaleString('en-IN') }}</strong></div>
              <div><span>Seat charges</span><strong>₹{{ seatCharges.toLocaleString('en-IN') }}</strong></div>
              <div><span>Add-ons</span><strong>₹{{ addOnTotal().toLocaleString('en-IN') }}</strong></div>
              <div><span>Taxes &amp; fees</span><strong>₹{{ taxTotal().toLocaleString('en-IN') }}</strong></div>
              <div class="fare-total"><span>Total payable</span><strong>₹{{ finalFareTotal().toLocaleString('en-IN') }}</strong></div>
            </section>
          </aside>
        </div>

        <section class="addon-card">
          <div class="addon-head">
            <div>
              <h2>Customize Your Trip</h2>
              <p>Choose meals and baggage separately for each flight.</p>
            </div>
            <strong>₹{{ addOnTotal().toLocaleString('en-IN') }}</strong>
          </div>

          <div class="addon-tabs">
            <button type="button" [class.active]="activeLeg() === 'outbound'" (click)="activeLeg.set('outbound')">{{ outboundRouteLabel() }}</button>
            @if (tripType === 'ROUND_TRIP') {
              <button type="button" [class.active]="activeLeg() === 'return'" (click)="activeLeg.set('return')">{{ returnRouteLabel() }}</button>
            }
          </div>

          <div class="addon-section">
            <h3>Meals</h3>
            <div class="meal-grid">
              @for (meal of mealOptions; track meal.id) {
                <button type="button" class="meal-card" [class.selected]="selectedMealId(activeLeg()) === meal.id" (click)="setMeal(activeLeg(), meal.id)">
                  <img [src]="meal.imageUrl" [alt]="meal.name" />
                  <span class="meal-tag" [class.nonveg]="meal.tag === 'Non Veg'" [class.jain]="meal.tag === 'Jain'">{{ meal.tag }}</span>
                  <span class="meal-name">{{ meal.name }}</span>
                  <small>{{ meal.description }}</small>
                  <strong>{{ meal.price === 0 ? 'Included' : '₹' + meal.price.toLocaleString('en-IN') }}</strong>
                </button>
              }
            </div>
          </div>

          <div class="addon-section">
            <h3>Extra Baggage</h3>
            <div class="baggage-grid">
              @for (bag of baggageOptions; track bag.id) {
                <button type="button" class="baggage-card" [class.selected]="selectedBaggageId(activeLeg()) === bag.id" (click)="setBaggage(activeLeg(), bag.id)">
                  <span class="material-symbols-rounded">luggage</span>
                  <strong>{{ bag.label }}</strong>
                  <small>{{ bag.price === 0 ? 'No extra charge' : '₹' + bag.price.toLocaleString('en-IN') }}</small>
                </button>
              }
            </div>
          </div>
        </section>

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
    .pd-container { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
    .step-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .back-btn { display: flex; align-items: center; gap: 6px; color: #5b38ff; font-size: 14px; font-weight: 700; text-decoration: none; }
    .steps { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .step { color: #9a92aa; font-weight: 700; }
    .step.active { color: #5b38ff; }
    .step.done { color: #22c55e; }
    .step-sep { font-size: 16px; color: #cabdff; }
    h1 { font-size: 1.5rem; font-weight: 900; color: #17141f; margin: 0 0 20px; }
    .pd-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 18px; margin-bottom: 20px; align-items: start; }
    .forms-stack { display: grid; gap: 16px; }
    .pd-form-card, .pd-contact-card, .addon-card, .fare-card { background: #fff; border-radius: 18px; border: 1px solid #ede9f6; padding: 22px; box-shadow: 0 2px 10px rgba(53,28,97,.05); }
    .card-head, .addon-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 18px; }
    .card-head h3, .pd-contact-card h3 { font-size: 15px; font-weight: 800; color: #17141f; margin: 0; }
    .card-head span { color: #5b38ff; font-size: 12px; font-weight: 800; padding: 5px 9px; border-radius: 999px; background: #f4f2fa; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .form-group label { font-size: 13px; font-weight: 700; color: #282433; }
    .form-ctrl { width: 100%; height: 46px; padding: 0 14px; border-radius: 11px; border: 1.5px solid #e3dff0; background: #faf9fd; font-size: 14px; font-family: inherit; color: #17141f; outline: none; }
    .form-ctrl:focus { border-color: #7b5cff; box-shadow: 0 0 0 4px rgba(123,92,255,.1); }
    .fc-sel { cursor: pointer; }
    .pd-side { display: grid; gap: 16px; }
    .sticky { position: sticky; top: 84px; }
    .fare-card { display: grid; gap: 10px; }
    .fare-card div { display: flex; justify-content: space-between; gap: 12px; color: #4a4558; font-size: 13px; }
    .fare-card strong { color: #17141f; }
    .fare-total { border-top: 1px solid #e3dff0; padding-top: 12px; font-weight: 900; color: #17141f; }
    .fare-total strong { color: #5b38ff; font-size: 18px; }
    .addon-head { margin-bottom: 16px; }
    .addon-head h2 { font-size: 17px; color: #17141f; margin: 0 0 4px; }
    .addon-head p { font-size: 13px; color: #80798e; margin: 0; }
    .addon-head strong { color: #5b38ff; font-size: 20px; }
    .addon-tabs { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; padding: 8px; border: 1px solid #ede9f6; border-radius: 16px; margin-bottom: 18px; }
    .addon-tabs button { height: 46px; border: none; border-radius: 12px; background: transparent; color: #6d6878; font: inherit; font-weight: 900; cursor: pointer; }
    .addon-tabs button.active { background: linear-gradient(90deg,#5b38ff,#7448ff); color: #fff; box-shadow: 0 6px 18px rgba(91,56,255,.2); }
    .addon-section { margin-top: 20px; }
    .addon-section h3 { font-size: 14px; font-weight: 900; color: #17141f; margin: 0 0 12px; }
    .meal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
    .meal-card, .baggage-card { border: 1.5px solid #e3dff0; background: #faf9fd; border-radius: 14px; cursor: pointer; font-family: inherit; transition: all .18s; text-align: left; }
    .meal-card { position: relative; min-height: 252px; padding: 12px; display: flex; flex-direction: column; gap: 7px; overflow: hidden; }
    .meal-card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 10px; background: #ede9f6; }
    .meal-card.selected, .baggage-card.selected { border-color: #5b38ff; background: rgba(91,56,255,.06); box-shadow: 0 8px 20px rgba(91,56,255,.14); }
    .meal-card:hover, .baggage-card:hover { transform: translateY(-1px); border-color: #cabdff; }
    .meal-tag { position: absolute; top: 20px; left: 20px; padding: 3px 8px; border-radius: 999px; background: #dcfce7; color: #15803d; font-size: 10.5px; font-weight: 900; }
    .meal-tag.nonveg { background: #fee2e2; color: #b91c1c; }
    .meal-tag.jain { background: #fef3c7; color: #92400e; }
    .meal-name { color: #17141f; font-size: 13.5px; font-weight: 900; line-height: 1.25; }
    .meal-card small, .baggage-card small { color: #80798e; font-size: 12px; line-height: 1.25; }
    .meal-card strong { margin-top: auto; color: #5b38ff; font-size: 14px; }
    .baggage-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); gap: 10px; }
    .baggage-card { min-height: 104px; padding: 14px; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
    .baggage-card .material-symbols-rounded { color: #5b38ff; font-size: 23px; }
    .baggage-card strong { color: #17141f; font-size: 14px; }
    .pd-error { padding: 10px 14px; border-radius: 10px; background: rgba(255,76,76,.08); color: #bc2d2d; border: 1px solid rgba(255,76,76,.15); font-size: 13px; margin-bottom: 14px; }
    .next-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 52px; border-radius: 14px; border: none; background: linear-gradient(90deg,#5b38ff,#7448ff,#ff8f73); color: white; font-size: 15px; font-weight: 900; cursor: pointer; font-family: inherit; box-shadow: 0 8px 22px rgba(91,56,255,.24); }
    .next-btn:disabled { opacity: .7; cursor: not-allowed; }
    .btn-sp { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,.4); border-top-color: white; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 900px) { .pd-grid { grid-template-columns: 1fr; } .sticky { position: static; } }
    @media (max-width: 600px) { .form-row-2, .addon-tabs { grid-template-columns: 1fr; } .pd-container { padding: 0 12px; } }
  `]
})
export class PassengerDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingService = inject(BookingService);
  private readonly passengerService = inject(PassengerService);
  private readonly authService = inject(AuthService);

  flightId = '';
  returnFlightId = '';
  outboundSeatIds: string[] = [];
  outboundSeatNumbers: string[] = [];
  returnSeatIds: string[] = [];
  returnSeatNumbers: string[] = [];
  passengers = 1;
  tripType: TripType = 'ONE_WAY';
  basePrice = 0;
  returnBasePrice = 0;
  seatCharges = 0;
  departureTime = '';
  returnDepartureTime = '';
  outboundRoute = '';
  returnRoute = '';
  passengerForms: PassengerForm[] = [];
  contactEmail = '';
  contactPhone = '';
  activeLeg = signal<LegKey>('outbound');
  loading = signal(false);
  error = signal('');

  selectedMeals: Record<LegKey, string> = { outbound: 'none', return: 'none' };
  selectedBaggage: Record<LegKey, string> = { outbound: 'none', return: 'none' };

  mealOptions: MealOption[] = [
    { id: 'none', name: 'No meal included', description: 'Skip pre-booked meals for this flight.', price: 0, imageUrl: 'https://i1-e.pinimg.com/736x/05/4f/03/054f037affd3dae8060f8dcb7331209a.jpg', tag: 'Included' },
    { id: 'veg-sandwich', name: 'Veg Sandwich', description: 'Fresh vegetarian sandwich with beverage.', price: 400, preference: 'VEG', imageUrl: 'https://i1-e.pinimg.com/1200x/9c/62/81/9c6281290fbfca0306d313278dec37a2.jpg', tag: 'Veg' },
    { id: 'paneer-meal', name: 'Paneer Meal', description: 'Paneer meal combo with beverage.', price: 450, preference: 'VEG', imageUrl: 'https://i.pinimg.com/736x/c6/fb/85/c6fb85479da585466477f8acd8f8964e.jpg', tag: 'Veg' },
    { id: 'nonveg-sandwich', name: 'Non-veg Sandwich', description: 'Chicken sandwich with beverage.', price: 500, preference: 'NON_VEG', imageUrl: 'https://i1-e.pinimg.com/736x/a2/d6/08/a2d608bb67a4f42013b2f11cba2aea1d.jpg', tag: 'Non Veg' },
    { id: 'jain-meal', name: 'Jain Meal', description: 'Jain-friendly meal with beverage.', price: 400, preference: 'JAIN', imageUrl: 'https://i1-e.pinimg.com/736x/ee/fc/3c/eefc3ca47b1f0a99eb5c20be5136dfeb.jpg', tag: 'Jain' }
  ];

  baggageOptions: BaggageOption[] = [
    { id: 'none', label: 'No extra baggage', kg: 0, price: 0 },
    { id: '3kg', label: '3 Kg', kg: 3, price: 1800 },
    { id: '5kg', label: '5 Kg', kg: 5, price: 2750 },
    { id: '10kg', label: '10 Kg', kg: 10, price: 4500 },
    { id: '15kg', label: '15 Kg', kg: 15, price: 6750 },
    { id: '20kg', label: '20 Kg', kg: 20, price: 12000 }
  ];

  ngOnInit(): void {
    this.flightId = this.route.snapshot.paramMap.get('flightId') || '';
    const p = this.route.snapshot.queryParams;
    this.outboundSeatIds = this.csv(p['seatIds'] || p['seatId']);
    this.outboundSeatNumbers = this.csv(p['seatNumbers'] || p['seatNumber']);
    this.returnSeatIds = this.csv(p['returnSeatIds']);
    this.returnSeatNumbers = this.csv(p['returnSeatNumbers']);
    this.passengers = parseInt(p['passengers'] || '1', 10);
    this.tripType = p['tripType'] || 'ONE_WAY';
    this.basePrice = parseFloat(p['basePrice'] || '0');
    this.returnBasePrice = parseFloat(p['returnBasePrice'] || '0');
    this.seatCharges = parseFloat(p['seatCharges'] || '0');
    this.departureTime = p['departureTime'] || '';
    this.returnDepartureTime = p['returnDepartureTime'] || '';
    this.returnFlightId = p['returnFlightId'] || '';
    this.outboundRoute = p['outboundRoute'] || '';
    this.returnRoute = p['returnRoute'] || '';
    this.passengerForms = Array.from({ length: this.passengers }, () => ({ title: 'Mr', firstName: '', lastName: '', dateOfBirth: '', gender: 'MALE', passportNumber: '', nationality: '', passportExpiry: '', passengerType: 'ADULT' }));
    const user = this.authService.currentUser();
    if (user) this.contactEmail = user.email;
  }

  csv(value: string | undefined): string[] {
    return (value || '').split(',').map(v => v.trim()).filter(Boolean);
  }

  selectedMealId(leg: LegKey): string { return this.selectedMeals[leg]; }
  selectedBaggageId(leg: LegKey): string { return this.selectedBaggage[leg]; }
  setMeal(leg: LegKey, id: string): void { this.selectedMeals[leg] = id; }
  setBaggage(leg: LegKey, id: string): void { this.selectedBaggage[leg] = id; }
  mealFor(leg: LegKey): MealOption { return this.mealOptions.find(m => m.id === this.selectedMeals[leg]) || this.mealOptions[0]; }
  baggageFor(leg: LegKey): BaggageOption { return this.baggageOptions.find(b => b.id === this.selectedBaggage[leg]) || this.baggageOptions[0]; }

  flightFareTotal(): number {
    const oneWay = this.basePrice * this.passengers;
    const returning = this.tripType === 'ROUND_TRIP' ? this.returnBasePrice * this.passengers : 0;
    return oneWay + returning;
  }

  addOnTotal(): number {
    const outbound = this.mealFor('outbound').price + this.baggageFor('outbound').price;
    const returning = this.tripType === 'ROUND_TRIP' ? this.mealFor('return').price + this.baggageFor('return').price : 0;
    return outbound + returning;
  }

  taxTotal(): number {
    return Math.round((this.flightFareTotal() + this.seatCharges + this.addOnTotal()) * 0.12);
  }

  finalFareTotal(): number {
    return this.flightFareTotal() + this.seatCharges + this.addOnTotal() + this.taxTotal();
  }

  outboundRouteLabel(): string { return this.outboundRoute ? this.outboundRoute.replace('-', ' → ') : 'Outbound'; }
  returnRouteLabel(): string { return this.returnRoute ? this.returnRoute.replace('-', ' → ') : 'Return'; }

  proceed(): void {
    if (this.passengerForms.some(f => !f.firstName?.trim() || !f.lastName?.trim()) || !this.contactEmail.trim() || !this.contactPhone.trim()) {
      this.error.set('Please fill in all required fields.'); return;
    }
    this.loading.set(true); this.error.set('');
    const outboundMeal = this.mealFor('outbound');
    const returnMeal = this.tripType === 'ROUND_TRIP' ? this.mealFor('return') : null;
    const luggageKg = this.baggageFor('outbound').kg + (this.tripType === 'ROUND_TRIP' ? this.baggageFor('return').kg : 0);

    this.bookingService.createBooking({
      userId: this.authService.getUserId()!,
      flightId: this.flightId,
      tripType: this.tripType,
      baseFare: this.flightFareTotal() + this.seatCharges,
      taxes: this.taxTotal(),
      totalFare: this.finalFareTotal(),
      mealPreference: [outboundMeal.preference, returnMeal?.preference].filter(Boolean).join(' / ') || undefined,
      luggageKg,
      contactEmail: this.contactEmail.trim(),
      contactPhone: this.contactPhone.trim(),
      departureTime: this.departureTime || new Date().toISOString()
    }).pipe(
      catchError(err => { this.loading.set(false); this.error.set(err?.error?.message || 'Failed to create booking.'); return of(null); }),
      switchMap(booking => {
        if (!booking) return of(null);
        const calls = this.passengerForms.map((form, index) => {
          const payload: PassengerCreateRequest = {
            userId: this.authService.getUserId()!,
            bookingId: booking.bookingId,
            title: form.title!,
            firstName: form.firstName!,
            lastName: form.lastName!,
            dateOfBirth: form.dateOfBirth || '',
            gender: form.gender || 'MALE',
            passportNumber: form.passportNumber || '',
            nationality: form.nationality || '',
            passportExpiry: form.passportExpiry || '',
            passengerType: form.passengerType as any
          };
          return this.passengerService.addPassenger(payload).pipe(
            switchMap(passenger => {
              const seatId = this.outboundSeatIds[index];
              const seatNumber = this.outboundSeatNumbers[index];
              return seatId ? this.passengerService.assignSeat(passenger.passengerId, seatId, seatNumber).pipe(catchError(() => of(passenger))) : of(passenger);
            }),
            catchError(() => of(null))
          );
        });
        return forkJoin(calls).pipe(switchMap(() => of(booking)));
      })
    ).subscribe(booking => {
      this.loading.set(false);
      if (booking) this.router.navigate(['/booking/payment', booking.bookingId]);
    });
  }
}
