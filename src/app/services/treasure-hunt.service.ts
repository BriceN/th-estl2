import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { Step } from "../models/step.model";
import { steps } from "../models/steps.data";

// Interface for minimal state data to save in localStorage
interface SavedState {
  unlockedStepIds: number[]; // IDs of unlocked steps
  trackingStepIndex: number;
  viewingStepIndex: number;
  debugMode?: boolean; // Optional debug mode state
}

@Injectable({
  providedIn: "root",
})
export class TreasureHuntService {
  private readonly STORAGE_KEY = "treasureHuntState";
  private readonly LOCATION_CHECK_INTERVAL = 1000; // 1 second
  private readonly UNLOCK_RADIUS = 5; // meters
  private readonly PROXIMITY_RADIUS = 50; // meters - When to show distance indicator

  private steps: Step[] = [];
  private trackingStepIndex = 0;
  private viewingStepIndex = 0;
  private stepsSubject = new BehaviorSubject<Step[]>([]);

  // Add BehaviorSubjects for the current distance and coordinates
  private currentDistanceSubject = new BehaviorSubject<number | null>(null);
  private currentCoordinatesSubject = new BehaviorSubject<{
    lat: number;
    lng: number;
  } | null>(null);

  // Debug mode flag
  private isDebugMode = false;

  constructor() {
    this.initializeSteps();
    this.loadState();
    this.startLocationTracking();
  }

  getSteps(): Observable<Step[]> {
    return this.stepsSubject.asObservable();
  }

  // Method to get the current distance as an Observable
  getCurrentDistance(): Observable<number | null> {
    return this.currentDistanceSubject.asObservable();
  }

  // Method to get the current coordinates as an Observable
  getCurrentCoordinates(): Observable<{ lat: number; lng: number } | null> {
    return this.currentCoordinatesSubject.asObservable();
  }

  // Get the proximity radius (for components to use)
  getProximityRadius(): number {
    return this.PROXIMITY_RADIUS;
  }

  // Get the unlock radius (for components to use)
  getUnlockRadius(): number {
    return this.UNLOCK_RADIUS;
  }

  // Calculate distance to a specific step
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
  }

  // Check if a location is in proximity
  isInProximity(distance: number | null): boolean {
    if (distance === null) return false;
    return distance <= this.PROXIMITY_RADIUS || this.isDebugMode;
  }

  // Debug method to simulate being at the current location
  simulateLocationReached(): void {
    if (this.trackingStepIndex < this.steps.length) {
      this.unlockCurrentStep();
    }
  }

  // Toggle debug mode
  toggleDebugMode(): boolean {
    this.isDebugMode = !this.isDebugMode;
    this.saveState(); // Save debug mode state
    return this.isDebugMode;
  }

  // Check if debug mode is enabled
  getDebugMode(): boolean {
    return this.isDebugMode;
  }

  private initializeSteps(): void {
    this.steps = steps;
  }

  private startLocationTracking(): void {
    if ("geolocation" in navigator) {
      setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => this.checkLocation(position),
          (error) => console.error("Erreur de géolocalisation:", error),
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
    if (!trackingStep || !trackingStep.coordinates) {
      // Skip if step or coordinates are undefined, set distance to null
      this.currentDistanceSubject.next(null);
      return;
    }

    const distance = this.calculateDistance(
      position.coords.latitude,
      position.coords.longitude,
      trackingStep.coordinates.lat,
      trackingStep.coordinates.lng
    );

    // Always update the distance subject
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
      this.steps[this.trackingStepIndex].isUnlocked = true;

      if (this.trackingStepIndex < this.steps.length - 1) {
        this.trackingStepIndex++;
        this.updateStepStatus();
      }

      this.saveState();
      this.stepsSubject.next([...this.steps]);
    }
  }

  private updateStepStatus(): void {
    this.steps.forEach((step, index) => {
      step.isCurrent = index === this.viewingStepIndex;
      step.isAccessible = index <= this.trackingStepIndex;
    });
    this.stepsSubject.next([...this.steps]);
  }

  onStepOpen(openedStep: Step): void {
    const stepIndex = this.steps.findIndex((step) => step.id === openedStep.id);

    if (stepIndex !== -1) {
      this.viewingStepIndex = stepIndex;

      // Auto-expand the panel - make the step current
      this.steps.forEach((step, index) => {
        step.isCurrent = index === this.viewingStepIndex;
      });

      this.updateStepStatus();
      this.saveState(); // Save the state to persist viewingStepIndex
      this.stepsSubject.next([...this.steps]);
    }
  }

  private loadState(): void {
    const savedStateStr = localStorage.getItem(this.STORAGE_KEY);
    if (savedStateStr) {
      try {
        const savedState: SavedState = JSON.parse(savedStateStr);

        // Restore unlocked steps
        if (
          savedState.unlockedStepIds &&
          Array.isArray(savedState.unlockedStepIds)
        ) {
          savedState.unlockedStepIds.forEach((id) => {
            const step = this.steps.find((s) => s.id === id);
            if (step) {
              step.isUnlocked = true;
            }
          });
        }

        // Restore indices
        if (typeof savedState.trackingStepIndex === "number") {
          this.trackingStepIndex = savedState.trackingStepIndex;
        }

        if (typeof savedState.viewingStepIndex === "number") {
          this.viewingStepIndex = savedState.viewingStepIndex;
        }

        // Restore debug mode if present
        if (typeof savedState.debugMode === "boolean") {
          this.isDebugMode = savedState.debugMode;
        }

        this.updateStepStatus();
      } catch (error) {
        console.error("Erreur lors du chargement de l'état sauvegardé:", error);
        // Fallback to initial setup
        this.initializeSteps();
        this.updateStepStatus();
      }
    }
    this.updateStepStatus(); // Ensure steps are updated whether loaded or initialized
  }

  private saveState(): void {
    try {
      // Create minimal state object
      const savedState: SavedState = {
        // Save only the IDs of unlocked steps
        unlockedStepIds: this.steps
          .filter((step) => step.isUnlocked)
          .map((step) => step.id),
        trackingStepIndex: this.trackingStepIndex,
        viewingStepIndex: this.viewingStepIndex,
        debugMode: this.isDebugMode,
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(savedState));
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'état:", error);
    }
  }

  resetHunt(): void {
    localStorage.clear();
    location.reload();
  }

  isTrackingStep(step: Step): boolean {
    return this.steps.indexOf(step) === this.trackingStepIndex;
  }

  // Helper method to get the current tracking step
  getCurrentTrackingStep(): Step | null {
    if (this.trackingStepIndex < this.steps.length) {
      return this.steps[this.trackingStepIndex];
    }
    return null;
  }

  // Helper method to get the current active step (the one that's currently visible/selected)
  getCurrentActiveStep(): Step | null {
    const currentStep = this.steps.find((step) => step.isCurrent);
    return currentStep || null;
  }
}
