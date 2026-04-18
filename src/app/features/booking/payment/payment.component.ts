import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { PaymentService } from '../../../core/services/payment.service';
import { Booking, PaymentResponse } from '../../../core/models/index';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { environment } from '../../../../environments/environment';
import { catchError, of } from 'rxjs';

declare const Razorpay: any;

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css'
})
export class PaymentComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingService = inject(BookingService);
  private readonly paymentService = inject(PaymentService);

  bookingId = '';
  booking = signal<Booking | null>(null);
  loading = signal(true);
  payLoading = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.bookingId = this.route.snapshot.paramMap.get('bookingId') || '';
    this.bookingService.getBookingById(this.bookingId).pipe(
      catchError(() => of(null))
    ).subscribe(b => {
      this.booking.set(b);
      this.loading.set(false);
    });
  }

  initiatePayment(): void {
    const b = this.booking();
    if (!b) return;
    this.payLoading.set(true);
    this.error.set('');

    this.paymentService.initiatePayment({
      bookingId: b.bookingId,
      amount: b.totalFare,
      currency: 'INR',
      description: `SkyBooker — ${b.pnrCode}`
    }).pipe(catchError(err => {
      this.payLoading.set(false);
      this.error.set(err?.error?.message || 'Failed to initiate payment.');
      return of(null);
    })).subscribe(res => {
      if (!res) return;

      const options = {
        key: res.razorpayKeyId || environment.razorpayKeyId,
        amount: b.totalFare * 100,
        currency: 'INR',
        name: 'SkyBooker',
        description: `PNR: ${b.pnrCode}`,
        order_id: res.razorpayOrderId,
        handler: (response: any) => {
          this.paymentService.verifyPayment({
            bookingId: b.bookingId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          }).pipe(catchError(() => of(null))).subscribe(verified => {
            this.payLoading.set(false);
            if (verified) {
              this.router.navigate(['/booking/confirmation', b.bookingId]);
            } else {
              this.error.set('Payment verification failed. Please contact support.');
            }
          });
        },
        prefill: { email: b.contactEmail, contact: b.contactPhone },
        theme: { color: '#5b38ff' },
        modal: { ondismiss: () => { this.payLoading.set(false); } }
      };

      const rzp = new Razorpay(options);
      rzp.open();
    });
  }
}
