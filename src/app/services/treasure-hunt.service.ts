import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Step } from '../models/step.model';
import { steps } from '../models/steps.data';

// Interface for minimal state data to save in localStorage
interface SavedState {
  unlockedStepIds: number[]; // IDs of unlocked steps
  trackingStepIndex: number;
  viewingStepIndex: number;
  debugMode?: boolean; // Optional debug mode state
}

@Injectable({
  providedIn: 'root',
})
export class TreasureHuntService {
  private readonly STORAGE_KEY = 'treasureHuntState';
  private readonly LOCATION_CHECK_INTERVAL = 1000; // 1 second
  private readonly UNLOCK_RADIUS = 5; // meters
  private readonly PROXIMITY_RADIUS = 50; // meters - When to show distance indicator
  private preventImmediateSave = false;

  private steps: Step[] = [];
  private trackingStepIndex = 0;
  private viewingStepIndex = 0;
  private stepsSubject = new BehaviorSubject<Step[]>([]); // Add BehaviorSubjects for the current distance and coordinates

  private currentDistanceSubject = new BehaviorSubject<number | null>(null);
  private currentCoordinatesSubject = new BehaviorSubject<{
    lat: number;
    lng: number;
  } | null>(null); // Debug mode Subject

  private debugModeSubject = new BehaviorSubject<boolean>(false);

  constructor() {
    this.initializeSteps();
    this.loadState(); // Check if we just reset
    if (sessionStorage.getItem('hunt_just_reset') === 'true') {
      // Clear the flag
      sessionStorage.removeItem('hunt_just_reset'); // Prevent saving state for a short time after reload
      this.preventImmediateSave = true;
      setTimeout(() => {
        this.preventImmediateSave = false;
      }, 3000); // Prevent saving for 3 seconds
    }

    this.startLocationTracking();
  }

  getSteps(): Observable<Step[]> {
    return this.stepsSubject.asObservable();
  } // Method to get the current distance as an Observable

  getCurrentDistance(): Observable<number | null> {
    return this.currentDistanceSubject.asObservable();
  } // Method to get the current coordinates as an Observable

  getCurrentCoordinates(): Observable<{ lat: number; lng: number } | null> {
    return this.currentCoordinatesSubject.asObservable();
  } // Get the proximity radius (for components to use)

  getProximityRadius(): number {
    return this.PROXIMITY_RADIUS;
  } // Get the unlock radius (for components to use)

  getUnlockRadius(): number {
    return this.UNLOCK_RADIUS;
  } // Calculate distance to a specific step

  calculateDistanceToStep(stepId: number): number | null {
    const currentCoords = this.currentCoordinatesSubject.getValue();
    if (!currentCoords) return null;

    const step = this.steps.find((s) => s.id === stepId);
    if (!step || !step.coordinates) return null;

    return this.calculateDistance(
      currentCoords.lat,
      currentCoords.lng,
      step.coordinates.lat,
      step.coordinates.lng
    );
  } // Check if a location is in proximity
  isInProximity(distance: number | null): boolean {
    if (distance === null) return false;
    return (
      distance <= this.PROXIMITY_RADIUS || this.debugModeSubject.getValue()
    );
  } // Debug method to simulate being at the current location

  simulateLocationReached(): void {
    if (this.trackingStepIndex < this.steps.length) {
      this.unlockCurrentStep();
    }
  } // Toggle debug mode

  toggleDebugMode(): boolean {
    const newDebugMode = !this.debugModeSubject.getValue();
    this.debugModeSubject.next(newDebugMode);
    this.saveState(); // Save debug mode state
    return newDebugMode;
  } // Check if debug mode is enabled

  getDebugMode(): boolean {
    return this.debugModeSubject.getValue();
  } // Get debug mode as an Observable

  getDebugModeObservable(): Observable<boolean> {
    return this.debugModeSubject.asObservable();
  }

  private initializeSteps(): void {
    this.steps = JSON.parse(JSON.stringify(steps)); // Deep copy to avoid modifying original data
  }

  private startLocationTracking(): void {
    if ('geolocation' in navigator) {
      setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => this.checkLocation(position),
          (error) => console.error('Erreur de géolocalisation:', error),
          { enableHighAccuracy: true }
        );
      }, this.LOCATION_CHECK_INTERVAL);
    } else {
      console.error(
        "La géolocalisation n'est pas supportée par ce navigateur."
      );
    }
  }

  private checkLocation(position: GeolocationPosition): void {
    // Always update the current coordinates
    this.currentCoordinatesSubject.next({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });

    if (this.trackingStepIndex >= this.steps.length) {
      // All steps are complete, set distance to null
      this.currentDistanceSubject.next(null);
      return;
    }

    const trackingStep = this.steps[this.trackingStepIndex];
    if (!trackingStep || !trackingStep.coordinates || trackingStep.isUnlocked) {
      // Also check if already unlocked
      // Skip if step or coordinates are undefined, or if step is already unlocked
      // If the current tracking step is already unlocked, effectively means we are waiting for the next one
      // or all are done. If all done, trackingStepIndex would be >= steps.length
      // If current tracking step is unlocked, distance to it is not relevant for unlocking *it*.
      // Distance should be to the *next* uncompleted tracking step.
      // This logic is simplified by getCurrentTrackingStep() returning the *next uncompleted* step.
      // For now, we keep distance to the defined trackingStep.
      this.currentDistanceSubject.next(
        this.calculateDistanceToStep(trackingStep.id) ?? null
      );
      return;
    }

    const distance = this.calculateDistance(
      position.coords.latitude,
      position.coords.longitude,
      trackingStep.coordinates.lat,
      trackingStep.coordinates.lng
    ); // Always update the distance subject

    this.currentDistanceSubject.next(distance);

    if (distance <= this.UNLOCK_RADIUS) {
      this.unlockCurrentStep();
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  private unlockCurrentStep(): void {
    if (this.trackingStepIndex < this.steps.length) {
      const stepToUnlock = this.steps[this.trackingStepIndex];

      if (!stepToUnlock.isUnlocked) {
        stepToUnlock.isUnlocked = true; // If it's not the last step, advance the *tracking* index for future accessibility checks.

        if (this.trackingStepIndex < this.steps.length - 1) {
          this.trackingStepIndex++;
        } // Set the stepToUnlock as the current one to be viewed. // onStepOpen will handle setting viewingStepIndex, calling updateStepStatus, saving, and emitting.

        this.onStepOpen(stepToUnlock);
      }
    }
  }

  private updateStepStatus(): void {
    this.steps.forEach((step, index) => {
      step.isCurrent = index === this.viewingStepIndex;
      step.isAccessible = index <= this.trackingStepIndex;
    }); // No emission here; caller (onStepOpen or loadState) will emit.
  }
  /**
   * Opens a step and closes all others (used for accordion behavior)
   */

  onStepOpen(openedStep: Step): void {
    const stepIndex = this.steps.findIndex((step) => step.id === openedStep.id);

    if (stepIndex !== -1) {
      this.viewingStepIndex = stepIndex;
      this.updateStepStatus(); // Update .isCurrent and .isAccessible flags
      this.saveState();
      this.stepsSubject.next([...this.steps]); // Emit the updated steps array
    }
  }
  /**
   * Closes all steps (sets isCurrent to false for all steps)
   * Used for accordion behavior when toggling a step that's already open
   */

  closeAllSteps(): void {
    // To close all, we effectively set no step as current for viewing.
    // A common way is to set viewingStepIndex to an invalid index or handle it in updateStepStatus.
    // For simplicity, let's assume closing means the *current tracking step* (if not last) becomes the default view.
    // Or, if the desire is truly to close all expanded views without opening another,
    // then viewingStepIndex could be set to a sentinel like -1 and updateStepStatus would make all isCurrent false.
    // Given the current structure, if a step is clicked to close it, MapComponent's toggleStep
    // might decide to set a default open step or truly close all.
    // The existing `closeAllSteps` just sets `isCurrent = false`.
    this.steps.forEach((step) => {
      step.isCurrent = false;
    });
    // If we want to ensure viewingStepIndex reflects this "none open" state:
    // this.viewingStepIndex = -1; // Or some other indicator that nothing is explicitly open.
    // However, `updateStepStatus` would still make one current if viewingStepIndex is valid.
    // Let's stick to the direct modification for now as per existing `closeAllSteps` logic.

    this.stepsSubject.next([...this.steps]);
    this.saveState(); // Save this "all closed" state if viewingStepIndex is managed accordingly.
  }

  private loadState(): void {
    const savedStateStr = localStorage.getItem(this.STORAGE_KEY);
    if (savedStateStr) {
      try {
        const savedState: SavedState = JSON.parse(savedStateStr);

        if (
          savedState.unlockedStepIds &&
          Array.isArray(savedState.unlockedStepIds)
        ) {
          this.steps.forEach((step) => {
            // Reset all to not unlocked first
            step.isUnlocked = false;
          });
          savedState.unlockedStepIds.forEach((id) => {
            const step = this.steps.find((s) => s.id === id);
            if (step) {
              step.isUnlocked = true;
            }
          });
        }

        this.trackingStepIndex =
          typeof savedState.trackingStepIndex === 'number'
            ? savedState.trackingStepIndex
            : 0;
        this.viewingStepIndex =
          typeof savedState.viewingStepIndex === 'number'
            ? savedState.viewingStepIndex
            : 0;
        this.debugModeSubject.next(
          typeof savedState.debugMode === 'boolean'
            ? savedState.debugMode
            : false
        );
      } catch (error) {
        console.error("Erreur lors du chargement de l'état sauvegardé:", error);
        this.trackingStepIndex = 0; // Fallback
        this.viewingStepIndex = 0; // Fallback
        this.debugModeSubject.next(false); // Fallback
      }
    }
    // Ensure the first step is accessible and current if no state was loaded or indices are off
    if (this.steps.length > 0 && this.trackingStepIndex >= this.steps.length) {
      this.trackingStepIndex = 0;
    }
    if (this.steps.length > 0 && this.viewingStepIndex >= this.steps.length) {
      this.viewingStepIndex = 0;
    }

    this.updateStepStatus();
    this.stepsSubject.next([...this.steps]); // Emit initial state
  }

  private saveState(): void {
    if (this.preventImmediateSave) return;
    try {
      const savedState: SavedState = {
        unlockedStepIds: this.steps
          .filter((step) => step.isUnlocked)
          .map((step) => step.id),
        trackingStepIndex: this.trackingStepIndex,
        viewingStepIndex: this.viewingStepIndex,
        debugMode: this.debugModeSubject.getValue(),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(savedState));
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'état:", error);
    }
  }

  resetHunt(): void {
    this.preventImmediateSave = true;
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem('has_seen_intro');
    sessionStorage.setItem('hunt_just_reset', 'true');
    location.reload();
  }

  isTrackingStep(step: Step): boolean {
    return this.steps.indexOf(step) === this.trackingStepIndex;
  }

  getCurrentTrackingStep(): Step | null {
    if (
      this.trackingStepIndex < this.steps.length &&
      !this.steps[this.trackingStepIndex].isUnlocked
    ) {
      return this.steps[this.trackingStepIndex];
    }
    // If current tracking step is already unlocked or index is out of bounds, find the first uncompleted step
    const firstUncompleted = this.steps.find((step) => !step.isUnlocked);
    if (firstUncompleted) {
      this.trackingStepIndex = this.steps.indexOf(firstUncompleted);
      return firstUncompleted;
    }
    return null; // All steps completed
  }

  getCurrentActiveStep(): Step | null {
    const currentStep = this.steps.find((step) => step.isCurrent);
    return currentStep || null;
  }
}
