import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreasureHuntService } from '../../services/treasure-hunt.service';
import { Step } from '../../models/step.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-debug-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './debug-panel.component.html',
  styleUrl: './debug-panel.component.scss',
})
export class DebugPanelComponent implements OnInit, OnDestroy {
  // Removed @Input() decorators
  currentStep: Step | null = null;
  currentCoordinates: { lat: number; lng: number } | null = null;
  currentDistance: number | null = null;

  debugMode = false;
  private debugModeSubscription: Subscription | null = null;
  private coordinatesSubscription: Subscription | null = null;
  private distanceSubscription: Subscription | null = null;

  constructor(private treasureHuntService: TreasureHuntService) {}

  ngOnInit(): void {
    // Subscribe to debug mode changes
    this.debugModeSubscription = this.treasureHuntService
      .getDebugModeObservable()
      .subscribe((isDebugMode: boolean) => {
        this.debugMode = isDebugMode;
      });

    // Subscribe to current coordinates
    this.coordinatesSubscription = this.treasureHuntService
      .getCurrentCoordinates()
      .subscribe((coordinates) => {
        this.currentCoordinates = coordinates;
      });

    // Subscribe to current distance and update current step accordingly
    this.distanceSubscription = this.treasureHuntService
      .getCurrentDistance()
      .subscribe((distance) => {
        this.currentDistance = distance;
        // When distance updates, the relevant step might also have changed
        this.currentStep = this.treasureHuntService.getCurrentTrackingStep();
      });

    // Initial fetch for current step, in case distance or coordinates haven't emitted yet
    // or if the step is relevant even without distance (e.g. at the very start)
    this.currentStep = this.treasureHuntService.getCurrentTrackingStep();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions when component is destroyed
    if (this.debugModeSubscription) {
      this.debugModeSubscription.unsubscribe();
    }
    if (this.coordinatesSubscription) {
      this.coordinatesSubscription.unsubscribe();
    }
    if (this.distanceSubscription) {
      this.distanceSubscription.unsubscribe();
    }
  }

  toggleDebug(): void {
    this.debugMode = this.treasureHuntService.toggleDebugMode();
  }

  simulateLocation(): void {
    this.treasureHuntService.simulateLocationReached();
  }

  resetHunt(): void {
    if (
      confirm(
        'Êtes-vous sûr de vouloir réinitialiser votre progression ? Cette action ne peut pas être annulée.'
      )
    ) {
      this.treasureHuntService.resetHunt();
    }
  }

  isCloseToTarget(): boolean {
    return this.currentDistance !== null && this.currentDistance <= 10;
  }

  formatDistance(distance: number | null): string {
    if (distance === null) return 'Inconnue';

    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(2)} km`;
    } else {
      return `${Math.round(distance)} m`;
    }
  }
}
