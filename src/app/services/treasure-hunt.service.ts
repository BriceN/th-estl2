import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Step } from '../models/step.model';
import { steps as initialStepsData } from '../models/steps.data'; // Renommé pour clarté

// Interface for minimal state data to save in localStorage
interface SavedState {
  unlockedStepIds: number[]; // IDs of unlocked steps
  trackingStepIndex: number;
  viewingStepIndex: number;
  debugMode?: boolean; // Optional debug mode state
  stepOrder?: number[]; // Optional: IDs of steps in their current order
}

@Injectable({
  providedIn: 'root',
})
export class TreasureHuntService {
  private readonly STORAGE_KEY = 'treasureHuntState_v2'; // Clé mise à jour pour éviter conflits avec ancienne structure
  private readonly LOCATION_CHECK_INTERVAL = 1000; // 1 second
  private readonly UNLOCK_RADIUS = 5; // meters
  private readonly PROXIMITY_RADIUS = 50; // meters - When to show distance indicator
  private preventImmediateSave = false;

  private steps: Step[] = [];
  private trackingStepIndex = 0; // Index dans le tableau `this.steps` (potentiellement réordonné)
  private viewingStepIndex = 0; // Index dans le tableau `this.steps` (potentiellement réordonné)
  private stepsSubject = new BehaviorSubject<Step[]>([]);

  private currentDistanceSubject = new BehaviorSubject<number | null>(null);
  private currentCoordinatesSubject = new BehaviorSubject<{
    lat: number;
    lng: number;
  } | null>(null);

  private debugModeSubject = new BehaviorSubject<boolean>(false);

  constructor() {
    // L'initialisation et le chargement se feront dans loadState pour gérer l'ordre
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
        // Si l'ordre sauvegardé est invalide (ex: étapes supprimées/ajoutées), on réinitialise à l'ordre par défaut
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

    const trackingStep = this.getCurrentTrackingStep(); // Utilise la méthode qui retourne l'étape actuelle à suivre
    if (!trackingStep) {
      this.currentDistanceSubject.next(null);
      return;
    }

    // Si l'étape à suivre est déjà déverrouillée, la distance n'est pas pertinente pour *cette* étape.
    // Cependant, l'UI pourrait toujours vouloir afficher la distance à la prochaine étape non déverrouillée.
    // getCurrentTrackingStep() s'assure que `trackingStep` est la bonne cible.
    if (trackingStep.isUnlocked) {
      // Si l'étape actuellement suivie est déjà déverrouillée, cela signifie que nous attendons la suivante
      // ou que toutes les étapes sont terminées. getCurrentTrackingStep() devrait retourner null si tout est terminé.
      // Pour l'affichage, on peut mettre la distance à null ou à la distance de la prochaine étape non déverrouillée.
      // Pour l'instant, on met à null si l'étape ciblée est déjà déverrouillée.
      this.currentDistanceSubject.next(null); // Ou calculer la distance à la prochaine étape non déverrouillée si nécessaire pour l'UI.
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
    const R = 6371e3; // Rayon de la Terre en mètres
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
      stepToUnlock.isUnlocked = true;

      // Trouver l'index de l'étape qui vient d'être déverrouillée
      const unlockedStepIndexInCurrentOrder = this.steps.findIndex(
        (s) => s.id === stepToUnlock.id
      );

      // Mettre à jour trackingStepIndex pour pointer vers la *prochaine* étape non déverrouillée dans l'ordre actuel
      let nextTrackingStepFound = false;
      for (let i = 0; i < this.steps.length; i++) {
        if (!this.steps[i].isUnlocked) {
          this.trackingStepIndex = i;
          nextTrackingStepFound = true;
          break;
        }
      }
      if (!nextTrackingStepFound) {
        // Toutes les étapes sont déverrouillées
        this.trackingStepIndex = this.steps.length; // ou une autre valeur pour indiquer la fin
      }

      // Mettre à jour viewingStepIndex pour afficher l'étape qui vient d'être déverrouillée
      this.viewingStepIndex = unlockedStepIndexInCurrentOrder;

      this.updateStepStatus();
      this.saveState();
      this.stepsSubject.next([...this.steps]);
    }
  }

  private updateStepStatus(): void {
    // `trackingStepIndex` est l'index de la *prochaine* étape à déverrouiller ou `steps.length` si tout est fait.
    // `viewingStepIndex` est l'index de l'étape actuellement affichée/ouverte dans l'UI.
    this.steps.forEach((step, index) => {
      step.isCurrent = index === this.viewingStepIndex;
      // Une étape est accessible si elle est déjà déverrouillée,
      // ou si c'est la prochaine étape à déverrouiller (selon trackingStepIndex),
      // ou si toutes les étapes précédentes dans l'ordre actuel sont déverrouillées.
      if (index === 0) {
        // La première étape est toujours accessible initialement
        step.isAccessible = true;
      } else {
        // L'accessibilité dépend de l'état de déverrouillage de l'étape précédente DANS L'ORDRE ACTUEL
        step.isAccessible = this.steps[index - 1].isUnlocked;
      }
      // Si une étape est déverrouillée, elle doit être accessible
      if (step.isUnlocked) {
        step.isAccessible = true;
      }
    });
  }

  onStepOpen(openedStep: Step): void {
    const stepIndex = this.steps.findIndex((step) => step.id === openedStep.id);
    if (stepIndex !== -1 && this.steps[stepIndex].isAccessible) {
      // Vérifier l'accessibilité
      this.viewingStepIndex = stepIndex;
      this.updateStepStatus();
      this.saveState();
      this.stepsSubject.next([...this.steps]);
    }
  }

  closeAllSteps(): void {
    // Trouve l'étape de suivi actuelle (la première non déverrouillée)
    const currentTrackingStep = this.getCurrentTrackingStep();
    if (currentTrackingStep) {
      this.viewingStepIndex = this.steps.findIndex(
        (s) => s.id === currentTrackingStep.id
      );
    } else {
      // Si toutes les étapes sont terminées, on peut pointer vers la dernière ou une valeur par défaut
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
        // Ne pas réinitialiser ici, on utilisera les valeurs par défaut
      }
    }

    // 1. Initialiser les étapes (potentiellement avec l'ordre sauvegardé)
    this.initializeSteps(savedState?.stepOrder);

    // 2. Appliquer l'état de déverrouillage
    if (
      savedState?.unlockedStepIds &&
      Array.isArray(savedState.unlockedStepIds)
    ) {
      this.steps.forEach((step) => {
        step.isUnlocked = savedState!.unlockedStepIds.includes(step.id);
      });
    }

    // 3. Déterminer trackingStepIndex (index de la première étape non déverrouillée dans l'ordre actuel)
    let firstUncompletedIndex = -1;
    for (let i = 0; i < this.steps.length; i++) {
      if (!this.steps[i].isUnlocked) {
        firstUncompletedIndex = i;
        break;
      }
    }
    this.trackingStepIndex =
      firstUncompletedIndex !== -1 ? firstUncompletedIndex : this.steps.length;

    // 4. Déterminer viewingStepIndex
    // Si un viewingStepIndex valide est sauvegardé et que cette étape existe toujours, l'utiliser.
    // Sinon, faire en sorte que viewingStepIndex soit égal à trackingStepIndex (si valide) ou à la dernière étape si tout est complété.
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

    // 5. Charger le mode debug
    this.debugModeSubject.next(savedState?.debugMode ?? false);

    // 6. Mettre à jour le statut et émettre
    this.updateStepStatus();
    this.stepsSubject.next([...this.steps]);
  }

  private saveState(): void {
    if (this.preventImmediateSave) return;
    try {
      const currentStepOrderIds = this.steps.map((step) => step.id);
      const savedState: SavedState = {
        unlockedStepIds: this.steps
          .filter((step) => step.isUnlocked)
          .map((step) => step.id),
        trackingStepIndex: this.trackingStepIndex,
        viewingStepIndex: this.viewingStepIndex,
        debugMode: this.debugModeSubject.getValue(),
        stepOrder: currentStepOrderIds,
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
    // Retourne la première étape non déverrouillée dans l'ordre actuel des étapes.
    // C'est l'étape que l'utilisateur doit activement chercher.
    for (let i = 0; i < this.steps.length; i++) {
      if (!this.steps[i].isUnlocked) {
        return this.steps[i];
      }
    }
    return null; // Toutes les étapes sont complétées
  }

  getCurrentActiveStep(): Step | null {
    // Retourne l'étape qui est actuellement marquée comme `isCurrent` (celle ouverte dans l'UI)
    if (
      this.viewingStepIndex >= 0 &&
      this.viewingStepIndex < this.steps.length
    ) {
      return this.steps[this.viewingStepIndex];
    }
    return null;
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

    // S'assurer qu'il y a une étape suivante avec laquelle échanger
    if (currentIndex === -1 || currentIndex >= this.steps.length - 1) {
      console.warn(
        'Impossible de repousser la dernière étape ou étape non trouvée.'
      );
      return;
    }

    const nextStepIndex = currentIndex + 1;

    // Intervertir les étapes dans le tableau `this.steps`
    [this.steps[currentIndex], this.steps[nextStepIndex]] = [
      this.steps[nextStepIndex],
      this.steps[currentIndex],
    ];

    // Mettre à jour `trackingStepIndex` pour qu'il pointe vers la nouvelle étape "actuelle" (celle qui était à nextStepIndex)
    // Si l'étape repoussée était celle que nous suivions, le `trackingStepIndex` doit maintenant pointer vers l'étape qui a pris sa place.
    // Comme `getCurrentTrackingStep()` trouve la première non déverrouillée, et que l'ordre a changé,
    // nous devons recalculer `trackingStepIndex`.
    let firstUncompletedIndex = -1;
    for (let i = 0; i < this.steps.length; i++) {
      if (!this.steps[i].isUnlocked) {
        firstUncompletedIndex = i;
        break;
      }
    }
    this.trackingStepIndex =
      firstUncompletedIndex !== -1 ? firstUncompletedIndex : this.steps.length;

    // Mettre à jour `viewingStepIndex` pour qu'il suive la nouvelle `trackingStepIndex` (ou l'étape qui est maintenant à la position `currentIndex`)
    // Après le report, l'étape qui était à `nextStepIndex` est maintenant à `currentIndex`.
    // C'est cette étape qui devient la nouvelle étape "active" à suivre.
    this.viewingStepIndex = currentIndex;

    this.updateStepStatus();
    this.saveState(); // Sauvegarde le nouvel ordre et les index
    this.stepsSubject.next([...this.steps]);
    console.log(
      'Étape repoussée. Nouvel ordre:',
      this.steps.map((s) => s.id)
    );
    console.log('Nouveau trackingStepIndex:', this.trackingStepIndex);
    console.log('Nouveau viewingStepIndex:', this.viewingStepIndex);
  }
}
