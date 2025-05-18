import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreasureHuntService } from '../../services/treasure-hunt.service';
import { Step } from '../../models/step.model';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-debug-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './debug-panel.component.html',
  styleUrl: './debug-panel.component.scss',
})
export class DebugPanelComponent implements OnInit, OnDestroy {
  currentStep: Step | null = null;
  currentStepForView: Step | null = null;
  currentCoordinates: { lat: number; lng: number } | null = null;
  currentDistance: number | null = null;

  // Time tracking properties
  currentStepElapsedTime: string = '0s';
  totalElapsedTime: string = '0s';
  completedSteps: number = 0;
  totalSteps: number = 0;
  progressPercentage: number = 0;

  debugMode = false;
  private debugModeSubscription: Subscription | null = null;
  private coordinatesSubscription: Subscription | null = null;
  private distanceSubscription: Subscription | null = null;
  private stepsSubscription: Subscription | null = null;
  private timeUpdateSubscription: Subscription | null = null;

  constructor(private treasureHuntService: TreasureHuntService) {}

  ngOnInit(): void {
    this.debugModeSubscription = this.treasureHuntService
      .getDebugModeObservable()
      .subscribe((isDebugMode: boolean) => {
        this.debugMode = isDebugMode;
      });

    this.coordinatesSubscription = this.treasureHuntService
      .getCurrentCoordinates()
      .subscribe((coordinates) => {
        this.currentCoordinates = coordinates;
      });

    this.distanceSubscription = this.treasureHuntService
      .getCurrentDistance()
      .subscribe((distance) => {
        this.currentDistance = distance;
      });

    this.stepsSubscription = this.treasureHuntService
      .getSteps()
      .subscribe(() => {
        this.currentStep = this.treasureHuntService.getCurrentTrackingStep();
        this.currentStepForView =
          this.treasureHuntService.getCurrentActiveStep();
        this.updateTimeData();
      });

    // Update time data every second
    this.timeUpdateSubscription = interval(1000).subscribe(() => {
      this.updateTimeData();
    });

    // Initial fetch
    this.currentStep = this.treasureHuntService.getCurrentTrackingStep();
    this.currentStepForView = this.treasureHuntService.getCurrentActiveStep();
    this.updateTimeData();
  }

  ngOnDestroy(): void {
    this.debugModeSubscription?.unsubscribe();
    this.coordinatesSubscription?.unsubscribe();
    this.distanceSubscription?.unsubscribe();
    this.stepsSubscription?.unsubscribe();
    this.timeUpdateSubscription?.unsubscribe();
  }

  private updateTimeData(): void {
    // Current step elapsed time
    const currentStepElapsed =
      this.treasureHuntService.getCurrentStepElapsedTime();
    this.currentStepElapsedTime =
      this.treasureHuntService.formatDuration(currentStepElapsed);

    // Total elapsed time
    const totalElapsed = this.treasureHuntService.getTotalElapsedTime();
    this.totalElapsedTime =
      this.treasureHuntService.formatDuration(totalElapsed);

    // Progress
    this.completedSteps = this.treasureHuntService.getCompletedStepsCount();
    this.totalSteps = this.treasureHuntService.getTotalStepsCount();
    this.progressPercentage =
      this.totalSteps > 0
        ? Math.round((this.completedSteps / this.totalSteps) * 100)
        : 0;
  }

  toggleDebug(): void {
    this.treasureHuntService.toggleDebugMode();
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
    return (
      this.currentDistance !== null &&
      this.currentDistance <= this.treasureHuntService.getUnlockRadius()
    );
  }

  formatDistance(distance: number | null): string {
    if (distance === null) return 'Inconnue';
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(2)} km`;
    } else {
      return `${Math.round(distance)} m`;
    }
  }

  canCurrentStepBePostponed(): boolean {
    return this.currentStep ? this.currentStep.canPostpone : false;
  }

  postponeCurrentStep(): void {
    if (this.canCurrentStepBePostponed()) {
      this.treasureHuntService.postponeStep();
    }
  }
}
