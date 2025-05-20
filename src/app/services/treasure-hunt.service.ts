import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Step } from '../models/step.model';
import { steps as initialStepsData } from '../models/steps.data';

// Interface for minimal state data to save in localStorage
interface SavedState {
  unlockedStepIds: number[]; // IDs of unlocked steps
  trackingStepIndex: number;
  viewingStepIndex: number;
  debugMode?: boolean; // Optional debug mode state
  stepOrder?: number[]; // Optional: IDs of steps in their current order
  // Time tracking data
  stepTimes?: { [stepId: number]: { startTime?: number; endTime?: number } };
  huntStartTime?: number; // Overall hunt start time
}

// Interface for time tracking data
interface StepTimeData {
  stepId: number;
  title: string;
  startTime?: number;
  endTime?: number;
  duration?: number; // Calculated duration in milliseconds
}

@Injectable({
  providedIn: 'root',
})
export class TreasureHuntService {
  private readonly STORAGE_KEY = 'treasureHuntState_v3'; // Updated version for time tracking
  private readonly LOCATION_CHECK_INTERVAL = 1000; // 1 second
  private readonly UNLOCK_RADIUS = 5; // meters
  private readonly PROXIMITY_RADIUS = 50; // meters - When to show distance indicator
  private preventImmediateSave = false;

  private steps: Step[] = [];
  private trackingStepIndex = 0;
  private viewingStepIndex = 0;
  private stepsSubject = new BehaviorSubject<Step[]>([]);

  private currentDistanceSubject = new BehaviorSubject<number | null>(null);
  private currentCoordinatesSubject = new BehaviorSubject<{
    lat: number;
    lng: number;
  } | null>(null);

  private debugModeSubject = new BehaviorSubject<boolean>(false);
  private showEndingModalSubject = new BehaviorSubject<boolean>(false);

  // Time tracking properties
  private huntStartTime?: number;
  private stepTimeData: Map<number, { startTime?: number; endTime?: number }> =
    new Map();

  constructor() {
    this.loadState();
    if (sessionStorage.getItem('hunt_just_reset') === 'true') {
      sessionStorage.removeItem('hunt_just_reset');
      this.preventImmediateSave = true;
      setTimeout(() => {
        this.preventImmediateSave = false;
      }, 3000);
    }
    this.startLocationTracking();
  }

  getSteps(): Observable<Step[]> {
    return this.stepsSubject.asObservable();
  }

  getCurrentDistance(): Observable<number | null> {
    return this.currentDistanceSubject.asObservable();
  }

  getCurrentCoordinates(): Observable<{ lat: number; lng: number } | null> {
    return this.currentCoordinatesSubject.asObservable();
  }

  getProximityRadius(): number {
    return this.PROXIMITY_RADIUS;
  }

  getUnlockRadius(): number {
    return this.UNLOCK_RADIUS;
  }

  getShowEndingModal(): Observable<boolean> {
    return this.showEndingModalSubject.asObservable();
  }

  openEndingModal(): void {
    this.showEndingModalSubject.next(true);
  }

  closeEndingModal(): void {
    this.showEndingModalSubject.next(false);
  }

  // Time tracking methods
  getHuntStartTime(): number | undefined {
    return this.huntStartTime;
  }

  getCurrentStepStartTime(): number | undefined {
    const currentStep = this.getCurrentTrackingStep();
    if (!currentStep) return undefined;

    const timeData = this.stepTimeData.get(currentStep.id);
    return timeData?.startTime || currentStep.startTime;
  }

  getTotalElapsedTime(): number {
    if (!this.huntStartTime) return 0;
    return Date.now() - this.huntStartTime;
  }

  getCompletedStepsCount(): number {
    return this.steps.filter((step) => step.isUnlocked).length;
  }

  getTotalStepsCount(): number {
    return this.steps.length;
  }

  getStepDuration(stepId: number): number | undefined {
    const timeData = this.stepTimeData.get(stepId);
    if (timeData?.startTime && timeData?.endTime) {
      return timeData.endTime - timeData.startTime;
    }
    return undefined;
  }

  getTotalCompletedDuration(): number {
    let total = 0;
    this.stepTimeData.forEach((timeData) => {
      if (timeData.startTime && timeData.endTime) {
        total += timeData.endTime - timeData.startTime;
      }
    });
    return total;
  }

  getCurrentStepElapsedTime(): number {
    const currentStep = this.getCurrentTrackingStep();
    if (!currentStep) return 0;

    const timeData = this.stepTimeData.get(currentStep.id);
    const startTime = timeData?.startTime || currentStep.startTime;

    if (!startTime) return 0;
    return Date.now() - startTime;
  }

  getAllStepTimeData(): StepTimeData[] {
    return this.steps.map((step) => {
      const timeData = this.stepTimeData.get(step.id);
      const stepData: StepTimeData = {
        stepId: step.id,
        title: step.title,
        startTime: timeData?.startTime || step.startTime,
        endTime: timeData?.endTime || step.endTime,
      };

      if (stepData.startTime && stepData.endTime) {
        stepData.duration = stepData.endTime - stepData.startTime;
      }

      return stepData;
    });
  }

  // Format duration helper
  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private markStepAsStarted(step: Step): void {
    const now = Date.now();

    // Initialize hunt start time if not set
    if (!this.huntStartTime) {
      this.huntStartTime = now;
    }

    // Set step start time if not already set
    if (!this.stepTimeData.has(step.id)) {
      this.stepTimeData.set(step.id, { startTime: now });
      step.startTime = now;
    } else {
      const timeData = this.stepTimeData.get(step.id)!;
      if (!timeData.startTime) {
        timeData.startTime = now;
        step.startTime = now;
      }
    }
  }

  private markStepAsCompleted(step: Step): void {
    const now = Date.now();
    const timeData = this.stepTimeData.get(step.id);

    if (timeData) {
      timeData.endTime = now;
      step.endTime = now;
    } else {
      this.stepTimeData.set(step.id, { endTime: now });
      step.endTime = now;
    }
  }

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

  isInProximity(distance: number | null): boolean {
    if (distance === null) return false;
    return (
      distance <= this.PROXIMITY_RADIUS || this.debugModeSubject.getValue()
    );
  }

  simulateLocationReached(): void {
    const currentTrackingStep = this.getCurrentTrackingStep();
    if (currentTrackingStep && !currentTrackingStep.isUnlocked) {
      this.unlockStep(currentTrackingStep);
    }
  }

  toggleDebugMode(): boolean {
    const newDebugMode = !this.debugModeSubject.getValue();
    this.debugModeSubject.next(newDebugMode);
    this.saveState();
    return newDebugMode;
  }

  getDebugMode(): boolean {
    return this.debugModeSubject.getValue();
  }

  getDebugModeObservable(): Observable<boolean> {
    return this.debugModeSubject.asObservable();
  }

  private initializeSteps(savedOrderIds?: number[]): void {
    let baseSteps = JSON.parse(JSON.stringify(initialStepsData)) as Step[];

    if (savedOrderIds && savedOrderIds.length === baseSteps.length) {
      const reorderedSteps: Step[] = [];
      const stepMap = new Map(baseSteps.map((step) => [step.id, step]));
      let allIdsFound = true;

      for (const id of savedOrderIds) {
        const step = stepMap.get(id);
        if (step) {
          reorderedSteps.push(step);
        } else {
          allIdsFound = false;
          break;
        }
      }
      if (allIdsFound) {
        this.steps = reorderedSteps;
      } else {
        this.steps = baseSteps;
        console.warn(
          "L'ordre des étapes sauvegardé est invalide. Réinitialisation à l'ordre par défaut."
        );
      }
    } else {
      this.steps = baseSteps;
    }
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
    this.currentCoordinatesSubject.next({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });

    const trackingStep = this.getCurrentTrackingStep();
    if (!trackingStep) {
      this.currentDistanceSubject.next(null);
      return;
    }

    if (trackingStep.isUnlocked) {
      this.currentDistanceSubject.next(null);
      return;
    }

    const distance = this.calculateDistance(
      position.coords.latitude,
      position.coords.longitude,
      trackingStep.coordinates.lat,
      trackingStep.coordinates.lng
    );

    this.currentDistanceSubject.next(distance);

    if (distance <= this.UNLOCK_RADIUS && !trackingStep.isUnlocked) {
      this.unlockStep(trackingStep);
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3;
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

  private unlockStep(stepToUnlock: Step): void {
    if (!stepToUnlock.isUnlocked) {
      // Mark step as completed
      this.markStepAsCompleted(stepToUnlock);
      stepToUnlock.isUnlocked = true;

      const unlockedStepIndexInCurrentOrder = this.steps.findIndex(
        (s) => s.id === stepToUnlock.id
      );

      // Find next tracking step and mark it as started
      let nextTrackingStepFound = false;
      for (let i = 0; i < this.steps.length; i++) {
        if (!this.steps[i].isUnlocked) {
          this.trackingStepIndex = i;
          this.markStepAsStarted(this.steps[i]); // Mark new step as started
          nextTrackingStepFound = true;
          break;
        }
      }
      if (!nextTrackingStepFound) {
        this.trackingStepIndex = this.steps.length;
      }

      this.viewingStepIndex = unlockedStepIndexInCurrentOrder;

      this.updateStepStatus();
      this.saveState();
      this.stepsSubject.next([...this.steps]);
    }
  }

  private updateStepStatus(): void {
    this.steps.forEach((step, index) => {
      step.isCurrent = index === this.viewingStepIndex;
      if (index === 0) {
        step.isAccessible = true;
        // Mark first step as started if not already marked and hunt is starting
        if (!step.isUnlocked && !this.stepTimeData.has(step.id)) {
          this.markStepAsStarted(step);
        }
      } else {
        step.isAccessible = this.steps[index - 1].isUnlocked;
      }
      if (step.isUnlocked) {
        step.isAccessible = true;
      }
    });
  }

  onStepOpen(openedStep: Step): void {
    const stepIndex = this.steps.findIndex((step) => step.id === openedStep.id);
    if (stepIndex !== -1 && this.steps[stepIndex].isAccessible) {
      this.viewingStepIndex = stepIndex;
      this.updateStepStatus();
      this.saveState();
      this.stepsSubject.next([...this.steps]);
    }
  }

  closeAllSteps(): void {
    const currentTrackingStep = this.getCurrentTrackingStep();
    if (currentTrackingStep) {
      this.viewingStepIndex = this.steps.findIndex(
        (s) => s.id === currentTrackingStep.id
      );
    } else {
      this.viewingStepIndex = this.steps.length > 0 ? this.steps.length - 1 : 0;
    }
    this.updateStepStatus();
    this.stepsSubject.next([...this.steps]);
    this.saveState();
  }

  private loadState(): void {
    const savedStateStr = localStorage.getItem(this.STORAGE_KEY);
    let savedState: SavedState | null = null;

    if (savedStateStr) {
      try {
        savedState = JSON.parse(savedStateStr) as SavedState;
      } catch (error) {
        console.error("Erreur lors du chargement de l'état sauvegardé:", error);
      }
    }

    // Initialize steps
    this.initializeSteps(savedState?.stepOrder);

    // Apply unlock status
    if (
      savedState?.unlockedStepIds &&
      Array.isArray(savedState.unlockedStepIds)
    ) {
      this.steps.forEach((step) => {
        step.isUnlocked = savedState!.unlockedStepIds.includes(step.id);
      });
    }

    // Load time tracking data
    if (savedState?.huntStartTime) {
      this.huntStartTime = savedState.huntStartTime;
    }

    if (savedState?.stepTimes) {
      Object.entries(savedState.stepTimes).forEach(([stepIdStr, timeData]) => {
        const stepId = parseInt(stepIdStr, 10);
        this.stepTimeData.set(stepId, timeData);

        // Apply time data to steps
        const step = this.steps.find((s) => s.id === stepId);
        if (step) {
          step.startTime = timeData.startTime;
          step.endTime = timeData.endTime;
        }
      });
    }

    // Determine trackingStepIndex
    let firstUncompletedIndex = -1;
    for (let i = 0; i < this.steps.length; i++) {
      if (!this.steps[i].isUnlocked) {
        firstUncompletedIndex = i;
        break;
      }
    }
    this.trackingStepIndex =
      firstUncompletedIndex !== -1 ? firstUncompletedIndex : this.steps.length;

    // Determine viewingStepIndex
    if (
      savedState &&
      typeof savedState.viewingStepIndex === 'number' &&
      savedState.viewingStepIndex < this.steps.length &&
      savedState.viewingStepIndex >= 0
    ) {
      this.viewingStepIndex = savedState.viewingStepIndex;
    } else {
      this.viewingStepIndex =
        this.trackingStepIndex < this.steps.length
          ? this.trackingStepIndex
          : this.steps.length > 0
          ? this.steps.length - 1
          : 0;
    }

    // Load debug mode
    this.debugModeSubject.next(savedState?.debugMode ?? false);

    // Update status and emit
    this.updateStepStatus();
    this.stepsSubject.next([...this.steps]);
  }

  private saveState(): void {
    if (this.preventImmediateSave) return;
    try {
      const currentStepOrderIds = this.steps.map((step) => step.id);

      // Convert stepTimeData Map to plain object for serialization
      const stepTimesObj: {
        [stepId: number]: { startTime?: number; endTime?: number };
      } = {};
      this.stepTimeData.forEach((timeData, stepId) => {
        stepTimesObj[stepId] = timeData;
      });

      const savedState: SavedState = {
        unlockedStepIds: this.steps
          .filter((step) => step.isUnlocked)
          .map((step) => step.id),
        trackingStepIndex: this.trackingStepIndex,
        viewingStepIndex: this.viewingStepIndex,
        debugMode: this.debugModeSubject.getValue(),
        stepOrder: currentStepOrderIds,
        stepTimes: stepTimesObj,
        huntStartTime: this.huntStartTime,
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

  getCurrentTrackingStep(): Step | null {
    for (let i = 0; i < this.steps.length; i++) {
      if (!this.steps[i].isUnlocked) {
        return this.steps[i];
      }
    }
    return null;
  }

  getCurrentActiveStep(): Step | null {
    if (
      this.viewingStepIndex >= 0 &&
      this.viewingStepIndex < this.steps.length
    ) {
      return this.steps[this.viewingStepIndex];
    }
    return null;
  }

  // Method to get all steps that can be postponed
  getPostponableSteps(): Step[] {
    return this.steps.filter((step) => step.canPostpone);
  }

  // Method to make a specific step the current step
  makeStepCurrent(stepId: number): void {
    // Find the step to make current
    const stepToMakeCurrent = this.steps.find((step) => step.id === stepId);

    if (!stepToMakeCurrent || !stepToMakeCurrent.canPostpone) {
      console.warn('Step not found or cannot be made current');
      return;
    }

    // Get the current tracking step
    const currentTrackingStep = this.getCurrentTrackingStep();
    if (!currentTrackingStep) {
      console.warn('No current tracking step to swap');
      return;
    }

    // Make a copy of the steps array for manipulation
    const stepsCopy = [...this.steps];

    // Remove both steps from the array
    const stepsWithoutTarget = stepsCopy.filter(
      (s) => s.id !== stepId && s.id !== currentTrackingStep.id
    );

    // Create a new array with the target step first, followed by the current tracking step,
    // and then all other steps in their original order
    const stepIndex = stepsCopy.findIndex((s) => s.id === stepId);
    const currentIndex = stepsCopy.findIndex(
      (s) => s.id === currentTrackingStep.id
    );

    // Find where to insert the two steps
    let insertIndex = Math.min(stepIndex, currentIndex);

    // Create the new steps array
    this.steps = [
      ...stepsWithoutTarget.slice(0, insertIndex),
      stepToMakeCurrent,
      currentTrackingStep,
      ...stepsWithoutTarget.slice(insertIndex),
    ];

    // Update the tracking step index and view step index
    this.trackingStepIndex = insertIndex;
    this.viewingStepIndex = insertIndex;

    // Mark new current step as started if it wasn't already
    if (!stepToMakeCurrent.startTime) {
      this.markStepAsStarted(stepToMakeCurrent);
    }

    // Update status and save state
    this.updateStepStatus();
    this.saveState();
    this.stepsSubject.next([...this.steps]);
  }

  postponeStep(): void {
    const currentTrackStep = this.getCurrentTrackingStep();
    if (!currentTrackStep || !currentTrackStep.canPostpone) {
      console.warn(
        "L'étape actuelle ne peut pas être repoussée ou n'existe pas."
      );
      return;
    }

    const currentIndex = this.steps.findIndex(
      (s) => s.id === currentTrackStep.id
    );

    if (currentIndex === -1 || currentIndex >= this.steps.length - 1) {
      console.warn(
        'Impossible de repousser la dernière étape ou étape non trouvée.'
      );
      return;
    }

    const nextStepIndex = currentIndex + 1;

    // Swap steps
    [this.steps[currentIndex], this.steps[nextStepIndex]] = [
      this.steps[nextStepIndex],
      this.steps[currentIndex],
    ];

    // Update tracking step index
    let firstUncompletedIndex = -1;
    for (let i = 0; i < this.steps.length; i++) {
      if (!this.steps[i].isUnlocked) {
        firstUncompletedIndex = i;
        break;
      }
    }
    this.trackingStepIndex =
      firstUncompletedIndex !== -1 ? firstUncompletedIndex : this.steps.length;

    this.viewingStepIndex = currentIndex;

    this.updateStepStatus();
    this.saveState();
    this.stepsSubject.next([...this.steps]);
  }
}
