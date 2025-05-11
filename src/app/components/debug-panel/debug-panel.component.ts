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
  currentStep: Step | null = null; // L'étape activement suivie pour le déverrouillage
  currentStepForView: Step | null = null; // L'étape actuellement ouverte/vue dans l'UI (peut être différente)
  currentCoordinates: { lat: number; lng: number } | null = null;
  currentDistance: number | null = null;

  debugMode = false;
  private debugModeSubscription: Subscription | null = null;
  private coordinatesSubscription: Subscription | null = null;
  private distanceSubscription: Subscription | null = null;
  private stepsSubscription: Subscription | null = null;

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

    // S'abonner aux étapes pour obtenir l'étape de suivi et l'étape de visualisation
    this.stepsSubscription = this.treasureHuntService
      .getSteps()
      .subscribe(() => {
        this.currentStep = this.treasureHuntService.getCurrentTrackingStep();
        this.currentStepForView =
          this.treasureHuntService.getCurrentActiveStep();
      });

    // Initial fetch
    this.currentStep = this.treasureHuntService.getCurrentTrackingStep();
    this.currentStepForView = this.treasureHuntService.getCurrentActiveStep();
  }

  ngOnDestroy(): void {
    this.debugModeSubscription?.unsubscribe();
    this.coordinatesSubscription?.unsubscribe();
    this.distanceSubscription?.unsubscribe();
    this.stepsSubscription?.unsubscribe();
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
    // La distance est calculée par rapport à `currentStep` (l'étape de suivi)
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

  // Nouvelle méthode pour vérifier si l'étape de *suivi* peut être repoussée
  canCurrentStepBePostponed(): boolean {
    return this.currentStep ? this.currentStep.canPostpone : false;
  }

  // Nouvelle méthode pour appeler le service pour repousser l'étape
  postponeCurrentStep(): void {
    if (this.canCurrentStepBePostponed()) {
      this.treasureHuntService.postponeStep();
    }
  }
}
