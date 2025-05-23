import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreasureHuntService } from '../../services/treasure-hunt.service';
import { Step } from '../../models/step.model';
import { Subscription, interval } from 'rxjs';
import { PhotoStorageService } from '../../services/photo-storage.service';
import { PhotoExportService } from '../../services/photo-export.service';

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
  postponableSteps: Step[] = [];

  // Time tracking properties
  currentStepElapsedTime: string = '0s';
  totalElapsedTime: string = '0s';
  completedSteps: number = 0;
  totalSteps: number = 0;
  progressPercentage: number = 0;
  hasPhotos: boolean = false;

  debugMode = false;
  private debugModeSubscription: Subscription | null = null;
  private coordinatesSubscription: Subscription | null = null;
  private distanceSubscription: Subscription | null = null;
  private stepsSubscription: Subscription | null = null;
  private timeUpdateSubscription: Subscription | null = null;
  private photosSubscription: Subscription | null = null;

  constructor(
    private treasureHuntService: TreasureHuntService,
    private photoStorage: PhotoStorageService,
    private photoExport: PhotoExportService
  ) {}

  ngOnInit(): void {
    this.photosSubscription = this.photoStorage
      .getPhotosObservable()
      .subscribe((photos) => {
        this.hasPhotos = photos.size > 0;
      });

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
        this.updatePostponableSteps(); // Add this line
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
    this.photosSubscription?.unsubscribe();
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

  // Add this method to get postponable steps
  updatePostponableSteps(): void {
    // Get all postponable steps
    const allPostponableSteps = this.treasureHuntService.getPostponableSteps();

    // Display all postponable steps
    this.postponableSteps = allPostponableSteps;
  }

  // Add this method to handle step selection
  makeStepCurrent(step: Step): void {
    if (this.currentStep && step.id === this.currentStep.id) {
      // This is already the current step, nothing to do
      return;
    }

    if (
      confirm(
        `Voulez-vous faire de "${step.title}" l'étape courante ? L'étape actuelle sera placée juste après.`
      )
    ) {
      this.treasureHuntService.makeStepCurrent(step.id);
    }
  }

  postponeCurrentStep(): void {
    if (this.canCurrentStepBePostponed()) {
      this.treasureHuntService.postponeStep();
    }
  }

  async exportPhotos(): Promise<void> {
    try {
      const photos = await this.photoStorage.getAllPhotos();
      const steps = await this.treasureHuntService.getStepsSnapshot(); // Add this method

      if (photos.size === 0) {
        alert('Aucune photo à exporter');
        return;
      }

      await this.photoExport.exportAsZip(photos, steps);
    } catch (error) {
      console.error('Export error:', error);
      alert("Erreur lors de l'export des photos");
    }
  }

  async clearPhotos(): Promise<void> {
    if (confirm('Êtes-vous sûr de vouloir supprimer toutes les photos ?')) {
      await this.photoStorage.clearAllPhotos();
    }
  }
}
