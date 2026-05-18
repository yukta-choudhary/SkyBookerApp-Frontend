import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { SeatService } from '../../../core/services/seat.service';
import { Seat, SeatClass } from '../../../core/models/index';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { catchError, forkJoin, of } from 'rxjs';

type LegKey = 'outbound' | 'return';

@Component({
  selector: 'app-seat-selection',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="seat-page">
      <div class="seat-container">
        <div class="step-header">
          <a routerLink="/flights/search" class="back-btn">
            <span class="material-symbols-rounded">arrow_back</span> Back
          </a>
          <div class="steps">
            <span class="step active">1. Seat</span>
            <span class="step-sep material-symbols-rounded">chevron_right</span>
            <span class="step">2. Passengers</span>
            <span class="step-sep material-symbols-rounded">chevron_right</span>
            <span class="step">3. Payment</span>
          </div>
        </div>

        <div class="page-title">
          <div>
            <h1>Select Seats</h1>
            <p>{{ passengers }} passenger{{ passengers > 1 ? 's' : '' }} · {{ tripType.replace('_',' ') }}</p>
          </div>
          <div class="seat-total">
            <span>Seat charges</span>
            <strong>₹{{ seatCharges().toLocaleString('en-IN') }}</strong>
          </div>
        </div>

        @if (tripType === 'ROUND_TRIP') {
          <div class="leg-tabs">
            <button type="button" class="leg-tab" [class.active]="activeLeg() === 'outbound'" [class.done]="isLegComplete('outbound')" (click)="activeLeg.set('outbound')">
              {{ outboundRouteLabel() }}
            </button>
            <button type="button" class="leg-tab" [class.active]="activeLeg() === 'return'" [class.done]="isLegComplete('return')" (click)="activeLeg.set('return')">
              {{ returnRouteLabel() }}
            </button>
          </div>
        }

        @if (loading()) { <div class="s-loading"><div class="spinner"></div></div> }

        @if (!loading()) {
          <div class="class-tabs">
            @for (cls of ['FIRST','BUSINESS','ECONOMY']; track cls) {
              <button class="class-tab" [class.active]="selectedClass() === cls" (click)="filterClassStr(cls)" type="button">{{ cls }}</button>
            }
          </div>

          <div class="aircraft-panel">
            <div class="seat-legend">
              <span><i class="dot available"></i>Available</span>
              <span><i class="dot selected"></i>Selected</span>
              <span><i class="dot premium"></i>Premium</span>
              <span><i class="dot occupied"></i>Occupied</span>
            </div>

            <div class="mini-map">
              <div class="mini-nose"></div>
              @for (seat of miniSeats(); track seat.seatId) {
                <i [class.picked]="isSeatSelected(seat)" [class.blocked]="seat.status !== 'AVAILABLE'"></i>
              }
            </div>

            <div class="aircraft-scroll">
              <div class="aircraft-body">
                <div class="aircraft-shape"></div>
                @for (row of rowsForActiveLeg(); track row) {
                  <div class="seat-row">
                    <span class="exit-label">{{ isExitRow(row) ? 'EXIT' : '' }}</span>
                    @for (col of columnsForRow(row); track col) {
                      @if (col === 'AISLE') {
                        <span class="aisle"></span>
                      } @else {
                        @let seat = seatAt(row, col);
                        <button
                          type="button"
                          class="seat-btn"
                          [class.empty]="!seat"
                          [class.available]="seat?.status === 'AVAILABLE'"
                          [class.occupied]="seat && seat.status !== 'AVAILABLE'"
                          [class.premium]="seat && seat.status === 'AVAILABLE' && seat.priceMultiplier > 1"
                          [class.selected]="seat && isSeatSelected(seat)"
                          [class.extra]="seat?.hasExtraLegroom"
                          [disabled]="!seat || seat.status !== 'AVAILABLE'"
                          (click)="seat && toggleSeat(seat)"
                        >
                          {{ seat?.seatNumber || '' }}
                          @if (seat && isSeatSelected(seat)) { <span class="check material-symbols-rounded">check_circle</span> }
                        </button>
                      }
                    }
                  </div>
                }
              </div>
            </div>
          </div>

          <div class="selection-summary">
            <div>
              <h3>{{ activeLegLabel() }}</h3>
              <p>Select {{ passengers }} seat{{ passengers > 1 ? 's' : '' }} for this flight.</p>
            </div>
            <strong>{{ selectedSeatsFor(activeLeg()).length }}/{{ passengers }} selected</strong>
          </div>

          @if (selectedSeatsFor(activeLeg()).length > 0) {
            <div class="selected-list">
              @for (seat of selectedSeatsFor(activeLeg()); track seat.seatId) {
                <button type="button" (click)="toggleSeat(seat)">
                  <span>{{ seat.seatNumber }}</span>
                  <small>{{ seat.seatClass }} · ₹{{ seatCharge(seat).toLocaleString('en-IN') }}</small>
                </button>
              }
            </div>
          }

          <button class="next-btn" [disabled]="!canProceed()" (click)="proceed()">
            {{ tripType === 'ROUND_TRIP' && activeLeg() === 'outbound' && !isLegComplete('return') ? 'Select Return Seats' : 'Continue to Passenger Details' }}
            <span class="material-symbols-rounded">arrow_forward</span>
          </button>
        }
      </div>
    </main>
    <app-footer></app-footer>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .seat-page { flex: 1; padding: 28px 0 56px; background: linear-gradient(180deg,#eef8ff 0,#f4f2fa 55%); }
    .seat-container { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
    .step-header, .page-title, .selection-summary, .round-actions { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
    .step-header { margin-bottom: 22px; }
    .back-btn { display: flex; align-items: center; gap: 6px; color: #5b38ff; font-size: 14px; font-weight: 700; text-decoration: none; }
    .steps { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .step { color: #9a92aa; font-weight: 700; }
    .step.active { color: #5b38ff; }
    .step-sep { font-size: 16px; color: #cabdff; }
    h1 { font-size: 1.5rem; font-weight: 900; color: #17141f; margin: 0 0 4px; }
    .page-title { margin-bottom: 16px; }
    .page-title p { margin: 0; color: #80798e; font-size: 13px; font-weight: 600; }
    .seat-total { min-width: 132px; text-align: right; padding: 10px 14px; border-radius: 14px; background: #fff; border: 1px solid #ede9f6; }
    .seat-total span { display: block; font-size: 11px; color: #80798e; text-transform: uppercase; font-weight: 800; }
    .seat-total strong { color: #5b38ff; font-size: 19px; }
    .s-loading { display: flex; justify-content: center; padding: 60px; }
    .spinner { width: 30px; height: 30px; border: 3px solid #e3dff0; border-top-color: #5b38ff; border-radius: 50%; animation: spin .75s linear infinite; }
    .leg-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 8px; border-radius: 16px; border: 1px solid #ede9f6; background: #fff; margin-bottom: 16px; }
    .leg-tab { min-height: 48px; border: none; border-radius: 12px; background: transparent; color: #6d6878; font: inherit; font-weight: 900; cursor: pointer; }
    .leg-tab.active { background: linear-gradient(90deg,#5b38ff,#7448ff); color: #fff; box-shadow: 0 6px 18px rgba(91,56,255,.22); }
    .leg-tab.done:not(.active) { background: rgba(34,197,94,.08); color: #15803d; }
    .class-tabs { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
    .class-tab { padding: 9px 18px; border-radius: 999px; border: 1.5px solid #e3dff0; background: #fff; color: #4a4558; font-size: 13px; font-weight: 800; cursor: pointer; font-family: inherit; }
    .class-tab.active { background: #17141f; color: #fff; border-color: #17141f; }
    .aircraft-panel { position: relative; overflow: hidden; border-radius: 24px; border: 1px solid #dcedfb; background: linear-gradient(180deg,#e8f7ff 0,#fbfdff 42%,#fff 100%); box-shadow: 0 14px 40px rgba(53,28,97,.08); padding: 18px 18px 22px; }
    .seat-legend { display: flex; justify-content: center; gap: 22px; color: #6f7b95; font-size: 13px; font-weight: 700; margin-bottom: 16px; flex-wrap: wrap; }
    .seat-legend span { display: flex; align-items: center; gap: 7px; }
    .dot { width: 14px; height: 14px; border-radius: 50%; display: inline-block; }
    .dot.available { background: #fff; border: 1.5px solid #83cfff; }
    .dot.selected { background: #8ed8ff; }
    .dot.premium { background: #fff; border: 1.5px solid #1f9d45; }
    .dot.occupied { background: #e8e8ea; }
    .mini-map { width: min(620px, 100%); height: 48px; margin: 0 auto 20px; padding: 8px 20px 8px 54px; border-radius: 999px; background: rgba(255,255,255,.7); display: grid; grid-template-columns: repeat(36, 1fr); gap: 4px; position: relative; }
    .mini-nose { position: absolute; left: 8px; top: 9px; width: 48px; height: 30px; border-radius: 50% 8px 8px 50%; background: rgba(255,255,255,.8); box-shadow: inset 0 0 18px rgba(120,180,220,.18); }
    .mini-map i { width: 9px; height: 5px; border-radius: 999px; background: #188a35; align-self: center; }
    .mini-map i.picked { background: #5b38ff; transform: scale(1.25); }
    .mini-map i.blocked { background: #e8e8ea; }
    .aircraft-scroll { overflow-x: auto; padding: 14px 0 4px; }
    .aircraft-body { min-width: 820px; position: relative; padding: 12px 22px; }
    .aircraft-shape { position: absolute; inset: 8px 0 8px 0; border-radius: 56% 44% 44% 56% / 50%; background: linear-gradient(90deg,rgba(255,255,255,.88),rgba(255,255,255,.55)); clip-path: polygon(0 50%, 9% 16%, 100% 16%, 100% 84%, 9% 84%); pointer-events: none; }
    .seat-row { position: relative; z-index: 1; display: grid; grid-template-columns: 42px repeat(3, 46px) 34px repeat(3, 46px); gap: 10px; align-items: center; margin: 9px 0; }
    .exit-label { color: #7b86a0; font-size: 11px; font-weight: 800; text-align: right; }
    .aisle { width: 34px; }
    .seat-btn { position: relative; width: 38px; height: 34px; border-radius: 9px; border: 1.5px solid #89cff7; background: rgba(255,255,255,.78); color: #4e6a9f; font: inherit; font-size: 12px; font-weight: 800; cursor: pointer; transition: transform .16s ease, box-shadow .16s ease, background .16s ease; }
    .seat-btn.available:hover { transform: translateY(-3px) scale(1.04); box-shadow: 0 9px 20px rgba(91,56,255,.14); }
    .seat-btn.premium { border-color: #1f9d45; }
    .seat-btn.extra::after { content: ""; position: absolute; right: -4px; top: 4px; width: 4px; height: 26px; border-radius: 4px; background: #bde6ff; }
    .seat-btn.selected { color: #061a57; background: #8ed8ff; border-color: #54bff5; box-shadow: 0 8px 20px rgba(84,191,245,.28); transform: translateY(-2px); }
    .seat-btn.occupied, .seat-btn.empty { background: #e8e8ea; border-color: #e8e8ea; color: transparent; cursor: not-allowed; }
    .check { position: absolute; top: -8px; right: -8px; color: #15803d; font-size: 16px; background: white; border-radius: 50%; }
    .selection-summary { margin: 16px 0 10px; padding: 16px 18px; border-radius: 16px; background: #fff; border: 1px solid #ede9f6; }
    .selection-summary h3 { margin: 0 0 4px; font-size: 15px; color: #17141f; }
    .selection-summary p { margin: 0; color: #80798e; font-size: 13px; }
    .selection-summary strong { color: #5b38ff; }
    .selected-list { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
    .selected-list button { border: 1px solid #cabdff; background: #fff; border-radius: 12px; padding: 9px 12px; cursor: pointer; text-align: left; }
    .selected-list span { display: block; font-weight: 900; color: #17141f; }
    .selected-list small { color: #80798e; }
    .next-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 52px; border-radius: 14px; border: none; background: linear-gradient(90deg,#5b38ff,#7448ff,#ff8f73); color: white; font-size: 15px; font-weight: 800; cursor: pointer; font-family: inherit; box-shadow: 0 8px 22px rgba(91,56,255,.24); }
    .next-btn:disabled { background: #e3dff0; color: #9a92aa; box-shadow: none; cursor: not-allowed; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 680px) { .seat-container { padding: 0 12px; } .leg-tabs { grid-template-columns: 1fr; } .seat-total { width: 100%; text-align: left; } }
  `]
})
export class SeatSelectionComponent implements OnInit {
  private readonly seatService = inject(SeatService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  flightId = '';
  returnFlightId = '';
  passengers = 1;
  tripType = 'ONE_WAY';
  basePrice = 0;
  returnBasePrice = 0;
  departureTime = '';
  returnDepartureTime = '';
  outboundRoute = '';
  returnRoute = '';

  outboundSeats = signal<Seat[]>([]);
  returnSeats = signal<Seat[]>([]);
  selectedOutboundSeats = signal<Seat[]>([]);
  selectedReturnSeats = signal<Seat[]>([]);
  selectedClass = signal<SeatClass>('ECONOMY');
  activeLeg = signal<LegKey>('outbound');
  loading = signal(true);

  ngOnInit(): void {
    this.flightId = this.route.snapshot.paramMap.get('flightId') || '';
    const p = this.route.snapshot.queryParams;
    this.passengers = parseInt(p['passengers'] || '1', 10);
    this.tripType = p['tripType'] || 'ONE_WAY';
    this.basePrice = parseFloat(p['basePrice'] || '0');
    this.returnBasePrice = parseFloat(p['returnBasePrice'] || '0');
    this.departureTime = p['departureTime'] || '';
    this.returnDepartureTime = p['returnDepartureTime'] || '';
    this.returnFlightId = p['returnFlightId'] || '';
    this.outboundRoute = p['outboundRoute'] || '';
    this.returnRoute = p['returnRoute'] || '';

    const outbound$ = this.seatService.getSeatMap(this.flightId).pipe(catchError(() => of([])));
    const return$ = this.returnFlightId ? this.seatService.getSeatMap(this.returnFlightId).pipe(catchError(() => of([]))) : of([]);
    forkJoin([outbound$, return$]).subscribe(([outbound, returning]) => {
      this.outboundSeats.set(outbound);
      this.returnSeats.set(returning);
      this.loading.set(false);
    });
  }

  filterClassStr(cls: string): void { this.selectedClass.set(cls as SeatClass); }

  activeSeats(): Seat[] {
    return this.activeLeg() === 'return' ? this.returnSeats() : this.outboundSeats();
  }

  rowsForActiveLeg(): number[] {
    return [...new Set(this.activeSeats().filter(s => s.seatClass === this.selectedClass()).map(s => s.rowNumber))].sort((a, b) => a - b);
  }

  columnsForRow(row: number): string[] {
    const cols = this.activeSeats()
      .filter(s => s.seatClass === this.selectedClass() && s.rowNumber === row)
      .map(s => s.columnValue)
      .sort();
    const midpoint = Math.ceil(cols.length / 2);
    return [...cols.slice(0, midpoint), 'AISLE', ...cols.slice(midpoint)];
  }

  seatAt(row: number, col: string): Seat | undefined {
    return this.activeSeats().find(s => s.seatClass === this.selectedClass() && s.rowNumber === row && s.columnValue === col);
  }

  selectedSeatsFor(leg: LegKey): Seat[] {
    return leg === 'return' ? this.selectedReturnSeats() : this.selectedOutboundSeats();
  }

  toggleSeat(seat: Seat): void {
    if (seat.status !== 'AVAILABLE') return;
    const leg = this.activeLeg();
    const selected = this.selectedSeatsFor(leg);
    const exists = selected.some(s => s.seatId === seat.seatId);
    const next = exists ? selected.filter(s => s.seatId !== seat.seatId) : [...selected, seat];
    if (!exists && selected.length >= this.passengers) return;
    if (leg === 'return') this.selectedReturnSeats.set(next);
    else this.selectedOutboundSeats.set(next);
  }

  isSeatSelected(seat: Seat): boolean {
    return this.selectedSeatsFor(this.activeLeg()).some(s => s.seatId === seat.seatId);
  }

  isLegComplete(leg: LegKey): boolean {
    return this.selectedSeatsFor(leg).length === this.passengers;
  }

  canProceed(): boolean {
    if (!this.isLegComplete('outbound')) return false;
    return this.tripType !== 'ROUND_TRIP' || this.isLegComplete('return');
  }

  seatCharge(seat: Seat): number {
    const base = this.activeLeg() === 'return' ? this.returnBasePrice : this.basePrice;
    return Math.max(0, Math.round(base * (seat.priceMultiplier - 1)));
  }

  seatCharges(): number {
    const outbound = this.selectedOutboundSeats().reduce((sum, seat) => sum + Math.max(0, Math.round(this.basePrice * (seat.priceMultiplier - 1))), 0);
    const returning = this.selectedReturnSeats().reduce((sum, seat) => sum + Math.max(0, Math.round(this.returnBasePrice * (seat.priceMultiplier - 1))), 0);
    return outbound + returning;
  }

  isExitRow(row: number): boolean {
    return this.activeSeats().some(s => s.rowNumber === row && s.hasExtraLegroom);
  }

  miniSeats(): Seat[] {
    return this.activeSeats().filter(s => s.seatClass === this.selectedClass()).slice(0, 72);
  }

  outboundRouteLabel(): string { return this.outboundRoute ? this.outboundRoute.replace('-', ' → ') : 'Outbound'; }
  returnRouteLabel(): string { return this.returnRoute ? this.returnRoute.replace('-', ' → ') : 'Return'; }
  activeLegLabel(): string { return this.activeLeg() === 'return' ? this.returnRouteLabel() : this.outboundRouteLabel(); }

  proceed(): void {
    if (this.tripType === 'ROUND_TRIP' && this.activeLeg() === 'outbound' && !this.isLegComplete('return')) {
      this.activeLeg.set('return');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!this.canProceed()) return;
    const outbound = this.selectedOutboundSeats();
    const returning = this.selectedReturnSeats();
    this.router.navigate(['/booking/passengers', this.flightId], {
      queryParams: {
        seatIds: outbound.map(s => s.seatId).join(','),
        seatNumbers: outbound.map(s => s.seatNumber).join(','),
        returnSeatIds: returning.map(s => s.seatId).join(','),
        returnSeatNumbers: returning.map(s => s.seatNumber).join(','),
        passengers: this.passengers,
        tripType: this.tripType,
        basePrice: this.basePrice,
        returnBasePrice: this.returnBasePrice,
        seatCharges: this.seatCharges(),
        departureTime: this.departureTime,
        returnDepartureTime: this.returnDepartureTime,
        returnFlightId: this.returnFlightId,
        outboundRoute: this.outboundRoute,
        returnRoute: this.returnRoute
      }
    });
  }
}
