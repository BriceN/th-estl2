import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router'; // Import Router
import { TreasureHuntService } from '../../services/treasure-hunt.service';
import { Step } from '../../models/step.model';
import { AudioManagerService } from '../../services/audio-manager.service';

@Component({
  selector: 'app-tracer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tracer.component.html',
  styleUrl: './tracer.component.scss',
})
export class TracerComponent implements OnInit, OnDestroy {
  locationPermissionGranted = false;
  currentDistance: number | null = null;
  currentStep: Step | null = null; // The step currently being targeted by the tracer
  private idOfStepBeingTraced: number | null = null;
  private wasStepBeingTracedUnlocked: boolean = false;

  currentCoordinates: { lat: number; lng: number } | null = null;

  private distanceSubscription: Subscription | null = null;
  private coordinatesSubscription: Subscription | null = null;
  private stepsSubscription: Subscription | null = null;
  private isAlreadyPlayingProximitySound = false;

  constructor(
    public treasureHuntService: TreasureHuntService,
    private audioManagerService: AudioManagerService,
    private router: Router // Inject Router
  ) {
    this.checkLocationPermission();
  }

  ngOnInit(): void {
    this.audioManagerService.play('radar.wav', true, true, 500, 0.5); // Initialize currentStep and its state for comparison

    this.currentStep = this.treasureHuntService.getCurrentTrackingStep();
    if (this.currentStep) {
      this.idOfStepBeingTraced = this.currentStep.id;
      this.wasStepBeingTracedUnlocked = this.currentStep.isUnlocked;
    }

    this.distanceSubscription = this.treasureHuntService
      .getCurrentDistance()
      .subscribe((distance: number | null) => {
        this.currentDistance = distance;
      });

    this.coordinatesSubscription = this.treasureHuntService
      .getCurrentCoordinates()
      .subscribe((coordinates: { lat: number; lng: number } | null) => {
        this.currentCoordinates = coordinates;
      });

    this.stepsSubscription = this.treasureHuntService
      .getSteps()
      .subscribe((steps: Step[]) => {
        const latestStateOfTrackedStep =
          this.idOfStepBeingTraced !== null
            ? steps.find((s) => s.id === this.idOfStepBeingTraced)
            : null;

        if (latestStateOfTrackedStep) {
          if (
            latestStateOfTrackedStep.isUnlocked &&
            !this.wasStepBeingTracedUnlocked
          ) {
            // The step we were tracing was just unlocked!
            // TreasureHuntService.unlockCurrentStep already called onStepOpen for this step.
            this.router.navigate(['/carte']);
            this.audioManagerService.play('found.wav');
            // No need to update wasStepBeingTracedUnlocked here as we are navigating away.
          } else {
            // Update unlock status for next check if not redirected
            this.wasStepBeingTracedUnlocked =
              latestStateOfTrackedStep.isUnlocked;
          }
        }

        // Update what step this component is currently showing/tracking towards
        // This should align with what getCurrentTrackingStep() provides as the *next target*
        const newTrackingStep =
          this.treasureHuntService.getCurrentTrackingStep();
        this.currentStep = newTrackingStep;

        if (newTrackingStep) {
          if (this.idOfStepBeingTraced !== newTrackingStep.id) {
            // The service has moved to tracking a new step
            this.idOfStepBeingTraced = newTrackingStep.id;
            this.wasStepBeingTracedUnlocked = newTrackingStep.isUnlocked;
          }
        } else {
          // All steps might be completed
          this.idOfStepBeingTraced = null;
          this.wasStepBeingTracedUnlocked = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.audioManagerService.stop('radar.wav');
    this.audioManagerService.stop('found_something.wav');
    if (this.distanceSubscription) {
      this.distanceSubscription.unsubscribe();
    }
    if (this.coordinatesSubscription) {
      this.coordinatesSubscription.unsubscribe();
    }
    if (this.stepsSubscription) {
      this.stepsSubscription.unsubscribe();
    }
  }

  checkLocationPermission(): void {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        this.locationPermissionGranted = result.state === 'granted';
        result.onchange = () => {
          this.locationPermissionGranted = result.state === 'granted';
        };
      });
    } else if ('geolocation' in navigator) {
      // Fallback for browsers not supporting navigator.permissions (less common)
      // We can't reliably check without prompting, so assume not granted until a successful request.
      this.locationPermissionGranted = false;
    }
  }

  requestLocationPermission(): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          this.locationPermissionGranted = true;
          alert('Accès à la localisation accordé ! La chasse est lancée !');
          // Potentially re-initialize or trigger a check in TreasureHuntService if needed
          this.treasureHuntService.getCurrentTrackingStep(); // Refresh data if permissions were just granted
        },
        () => {
          this.locationPermissionGranted = false;
          alert(
            'Accès à la localisation refusé. Veuillez activer les services de localisation.'
          );
        }
      );
    }
  }

  formatDistance(distance: number | null): string {
    if (distance === null) return '---';
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(2)}km`;
    }
    return `${Math.round(distance)}m`;
  }

  getDistanceColorClass(): string {
    if (this.currentDistance === null) return 'froid';
    if (this.currentDistance <= 5) return 'tres-chaud';
    if (this.currentDistance <= 15) return 'chaud';
    if (this.currentDistance <= 30) return 'tiede';
    return 'froid';
  }

  getRadialProgressBackground(): string {
    if (this.currentDistance === null) return 'none';

    const progress = this.getDistanceProgress();
    const angle = (progress / 100) * 360;

    return `conic-gradient(
    rgba(0, 217, 255, 0.3) 0deg ${angle}deg, 
    transparent ${angle}deg 360deg
  )`;
  }

  getDistanceProgress(): number {
    if (this.currentDistance === null) return 0;

    const proximityRadius = this.treasureHuntService.getProximityRadius();
    const unlockRadius = this.treasureHuntService.getUnlockRadius();

    if (this.currentDistance <= unlockRadius) return 100;

    const percentage =
      100 -
      ((this.currentDistance - unlockRadius) /
        (proximityRadius - unlockRadius)) *
        100;

    return Math.max(0, Math.min(100, percentage));
  }

  isCloseToTarget(threshold: number = 10): boolean {
    const isClose =
      this.currentDistance !== null && this.currentDistance <= threshold;

    if (isClose && !this.isAlreadyPlayingProximitySound) {
      this.isAlreadyPlayingProximitySound = true;
      navigator.vibrate(500);
      this.audioManagerService.play(
        'found_something.wav',
        true,
        true,
        500,
        0.2
      );
    } else if (!isClose && this.isAlreadyPlayingProximitySound) {
      this.isAlreadyPlayingProximitySound = false;
      this.audioManagerService.stop('found_something.wav');
    }

    return isClose;
  }
}
