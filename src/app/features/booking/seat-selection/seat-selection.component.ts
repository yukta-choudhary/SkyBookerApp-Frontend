import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { SeatService } from '../../../core/services/seat.service';
import { Seat, SeatClass } from '../../../core/models/index';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { catchError, of } from 'rxjs';

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

        <h1>Select Your Seat</h1>

        @if (loading()) { <div class="s-loading"><div class="spinner"></div></div> }

        @if (!loading()) {
          <!-- Class Filter -->
          <div class="class-tabs">
            @for (cls of ['ECONOMY','BUSINESS','FIRST']; track cls) {
              <button class="class-tab" [class.active]="selectedClass() === cls" (click)="filterClassStr(cls)" type="button">{{ cls }}</button>
            }
          </div>

          <!-- Seat Map -->
          <div class="seat-map-wrap">
            <div class="seat-legend">
              <span class="leg-item"><div class="leg-box avail"></div> Available</span>
              <span class="leg-item"><div class="leg-box held"></div> Held</span>
              <span class="leg-item"><div class="leg-box confirmed"></div> Booked</span>
              <span class="leg-item"><div class="leg-box selected-box"></div> Selected</span>
            </div>

            <div class="seat-grid">
              @for (seat of filteredSeats(); track seat.seatId) {
                <div
                  class="seat-cell"
                  [class.available]="seat.status === 'AVAILABLE'"
                  [class.held]="seat.status === 'HELD'"
                  [class.taken]="seat.status === 'CONFIRMED' || seat.status === 'BLOCKED'"
                  [class.sel]="selectedSeat()?.seatId === seat.seatId"
                  [class.window]="seat.windowSeat"
                  [class.aisle]="seat.aisleSeat"
                  (click)="selectSeat(seat)"
                  [title]="seat.seatNumber + ' (' + seat.seatClass + ')'"
                >
                  {{ seat.seatNumber }}
                </div>
              }
            </div>
          </div>

          @if (selectedSeat()) {
            <div class="selected-info">
              <h3>Selected: <strong>{{ selectedSeat()!.seatNumber }}</strong></h3>
              <p>Class: {{ selectedSeat()!.seatClass }} &nbsp;|&nbsp; Row {{ selectedSeat()!.rowNumber }}</p>
              @if (selectedSeat()!.windowSeat) { <span class="seat-tag">Window</span> }
              @if (selectedSeat()!.aisleSeat) { <span class="seat-tag">Aisle</span> }
              @if (selectedSeat()!.hasExtraLegroom) { <span class="seat-tag extra">Extra Legroom</span> }
            </div>

            <button class="next-btn" (click)="proceed()">
              Continue to Passenger Details
              <span class="material-symbols-rounded">arrow_forward</span>
            </button>
          }
        }
      </div>
    </main>
    <app-footer></app-footer>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .seat-page { flex: 1; padding: 28px 0 56px; background: #f4f2fa; }
    .seat-container { max-width: 900px; margin: 0 auto; padding: 0 24px; }
    .step-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .back-btn { display: flex; align-items: center; gap: 6px; color: #5b38ff; font-size: 14px; font-weight: 600; text-decoration: none; }
    .steps { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .step { color: #9a92aa; font-weight: 600; }
    .step.active { color: #5b38ff; font-weight: 700; }
    .step-sep { font-size: 16px; color: #cabdff; }
    h1 { font-size: 1.4rem; font-weight: 800; color: #17141f; margin-bottom: 20px; }
    .s-loading { display: flex; justify-content: center; padding: 60px; }
    .spinner { width: 30px; height: 30px; border: 3px solid #e3dff0; border-top-color: #5b38ff; border-radius: 50%; animation: spin 0.75s linear infinite; }
    .class-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
    .class-tab { padding: 8px 20px; border-radius: 10px; border: 1.5px solid #e3dff0; background: #fff; color: #4a4558; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.18s; }
    .class-tab.active { background: linear-gradient(90deg,#5b38ff,#7448ff); color: white; border-color: transparent; box-shadow: 0 4px 12px rgba(91,56,255,0.22); }
    .seat-map-wrap { background: #fff; border-radius: 20px; border: 1px solid #ede9f6; padding: 24px; margin-bottom: 20px; }
    .seat-legend { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    .leg-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #80798e; }
    .leg-box { width: 18px; height: 18px; border-radius: 5px; }
    .leg-box.avail { background: #e8f5e9; border: 1.5px solid #81c784; }
    .leg-box.held { background: #fff8e1; border: 1.5px solid #ffd54f; }
    .leg-box.confirmed { background: #ffebee; border: 1.5px solid #ef9a9a; }
    .leg-box.selected-box { background: #5b38ff; }
    .seat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(52px, 1fr)); gap: 8px; }
    .seat-cell { width: 52px; height: 46px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; border: 1.5px solid transparent; user-select: none; }
    .seat-cell.available { background: #e8f5e9; color: #2e7d32; border-color: #81c784; }
    .seat-cell.available:hover { background: #c8e6c9; transform: translateY(-2px); }
    .seat-cell.held { background: #fff8e1; color: #f57f17; border-color: #ffd54f; cursor: not-allowed; }
    .seat-cell.taken { background: #ffebee; color: #c62828; border-color: #ef9a9a; cursor: not-allowed; }
    .seat-cell.sel { background: #5b38ff; color: white; border-color: #5b38ff; box-shadow: 0 4px 12px rgba(91,56,255,0.35); transform: translateY(-2px); }
    .selected-info { background: #fff; border-radius: 14px; border: 1px solid #ede9f6; padding: 18px 20px; margin-bottom: 16px; }
    .selected-info h3 { font-size: 15px; font-weight: 700; color: #17141f; margin: 0 0 6px; }
    .selected-info p { font-size: 13px; color: #80798e; margin: 0 0 10px; }
    .seat-tag { display: inline-block; padding: 3px 10px; border-radius: 999px; background: rgba(91,56,255,0.09); color: #5b38ff; font-size: 11.5px; font-weight: 600; margin-right: 6px; }
    .seat-tag.extra { background: rgba(255,143,115,0.12); color: #c2440e; }
    .next-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 52px; border-radius: 14px; border: none; background: linear-gradient(90deg,#5b38ff,#7448ff,#ff8f73); color: white; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; box-shadow: 0 8px 22px rgba(91,56,255,0.24); transition: all 0.2s; }
    .next-btn:hover { transform: translateY(-1px); }
    .next-btn .material-symbols-rounded { font-size: 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class SeatSelectionComponent implements OnInit {
  private readonly seatService = inject(SeatService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  flightId = '';
  seats = signal<Seat[]>([]);
  selectedSeat = signal<Seat | null>(null);
  selectedClass = signal<SeatClass>('ECONOMY');
  loading = signal(true);

  filteredSeats = () => this.seats().filter(s => s.seatClass === this.selectedClass());

  ngOnInit(): void {
    this.flightId = this.route.snapshot.paramMap.get('flightId') || '';
    this.seatService.getSeatMap(this.flightId).pipe(catchError(() => of([]))).subscribe(s => {
      this.seats.set(s);
      this.loading.set(false);
    });
  }

  filterClass(cls: SeatClass): void { this.selectedClass.set(cls); this.selectedSeat.set(null); }
  filterClassStr(cls: string): void { this.filterClass(cls as SeatClass); }

  selectSeat(seat: Seat): void {
    if (seat.status !== 'AVAILABLE') return;
    this.selectedSeat.set(seat);
  }

  proceed(): void {
    const seat = this.selectedSeat();
    if (!seat) return;
    this.router.navigate(['/booking/passengers', this.flightId], {
      queryParams: { seatId: seat.seatId, seatNumber: seat.seatNumber }
    });
  }
}
