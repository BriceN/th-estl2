import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { Router } from '@angular/router';
import { AudioManagerService } from '../../services/audio-manager.service';
import { TreasureHuntService } from '../../services/treasure-hunt.service';

@Component({
  selector: 'app-final-step',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './final-step.component.html',
  styleUrl: './final-step.component.scss',
})
export class FinalStepComponent implements OnInit, OnDestroy {
  hours: string = '00';
  minutes: string = '00';
  seconds: string = '00';
  midnightPassed: boolean = false;

  private timerSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private audioManagerService: AudioManagerService,
    private treasureHuntService: TreasureHuntService
  ) {}

  ngOnInit(): void {
    // Start the timer
    this.startTimer();

    // Check if we're already past midnight
    this.checkIfMidnightPassed();
  }

  ngOnDestroy(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  private startTimer(): void {
    this.timerSubscription = interval(1000).subscribe(() => {
      this.updateRemainingTime();
    });
  }

  private updateRemainingTime(): void {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(10, 0, 0, 0); // Set to midnight tonight

    // Calculate time until midnight
    let timeRemaining = midnight.getTime() - now.getTime();

    // Check if midnight has passed
    if (timeRemaining <= 0) {
      this.midnightPassed = true;
      if (this.timerSubscription) {
        this.timerSubscription.unsubscribe();
      }
      return;
    }

    // Convert to hours, minutes, seconds
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    timeRemaining -= hoursRemaining * (1000 * 60 * 60);

    const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));
    timeRemaining -= minutesRemaining * (1000 * 60);

    const secondsRemaining = Math.floor(timeRemaining / 1000);

    // Format with leading zeros
    this.hours = hoursRemaining.toString().padStart(2, '0');
    this.minutes = minutesRemaining.toString().padStart(2, '0');
    this.seconds = secondsRemaining.toString().padStart(2, '0');
  }

  private checkIfMidnightPassed(): void {
    const now = new Date();
    // If it's between midnight and 6am, consider midnight passed
    this.midnightPassed = now.getHours() >= 0 && now.getHours() < 6;
  }

  finishPilgrimage(): void {
    this.audioManagerService.play('click.wav', false, false, 0, 0.2);
    // Open the ending modal instead of showing an alert
    this.treasureHuntService.openEndingModal();
  }
}
