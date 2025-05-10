import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import * as confetti from 'canvas-confetti';
import { Subscription } from 'rxjs';
import { TreasureHuntService } from '../../services/treasure-hunt.service';
import { Step } from '../../models/step.model'; // Import the Step model

@Component({
  selector: 'app-confettis',
  standalone: true, // Ensure this component is standalone
  imports: [], // CommonModule is not strictly needed for this template/logic
  templateUrl: './confettis.component.html',
  styleUrl: './confettis.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfettisComponent implements OnInit, OnDestroy {
  private stepsSubscription: Subscription | null = null;
  private previouslyUnlockedStepIds: Set<number> = new Set();
  private confettiCanvas!: HTMLCanvasElement | null;
  private myConfetti: confetti.CreateTypes | null = null;

  constructor(private treasureHuntService: TreasureHuntService) {}

  ngOnInit(): void {
    // Get the canvas element once during initialization
    this.confettiCanvas = document.getElementById(
      'confettisCanvas'
    ) as HTMLCanvasElement;

    if (this.confettiCanvas) {
      this.myConfetti = confetti.create(this.confettiCanvas, {
        resize: true,
        useWorker: true, // Recommended for performance
      });
    }

    // Initialize the set of previously unlocked steps
    // This ensures we don't fire confetti for steps already unlocked when the component loads
    const initialSteps = this.treasureHuntService.getCurrentTrackingStep(); // Or a method to get all steps synchronously if available
    // For simplicity, let's assume we can get the current list of steps to initialize.
    // If not, the first subscription will handle it, but might fire for initially unlocked steps if not handled carefully.
    // A better approach might be to get all steps from the service if such a method exists,
    // or to rely on the BehaviorSubject's initial emission.

    // For now, let's initialize with currently known unlocked steps from the service
    // This part might need adjustment based on how you want to handle initial state.
    // A simple way is to populate it on the first emission of getSteps().
    let firstEmission = true;

    this.stepsSubscription = this.treasureHuntService
      .getSteps()
      .subscribe((steps: Step[]) => {
        const currentUnlockedStepIds = new Set<number>();
        steps.forEach((step) => {
          if (step.isUnlocked) {
            currentUnlockedStepIds.add(step.id);
          }
        });

        if (firstEmission) {
          this.previouslyUnlockedStepIds = new Set(currentUnlockedStepIds);
          firstEmission = false;
        } else {
          // Check for newly unlocked steps
          currentUnlockedStepIds.forEach((id) => {
            if (!this.previouslyUnlockedStepIds.has(id)) {
              // A new step has been unlocked
              this.launchConfettis();
            }
          });
          this.previouslyUnlockedStepIds = new Set(currentUnlockedStepIds);
        }
      });
  }

  launchConfettis() {
    if (!this.myConfetti) {
      // Attempt to re-initialize if it wasn't ready in ngOnInit
      this.confettiCanvas = document.getElementById(
        'confettisCanvas'
      ) as HTMLCanvasElement;
      if (this.confettiCanvas) {
        this.myConfetti = confetti.create(this.confettiCanvas, {
          resize: true,
          useWorker: true,
        });
      } else {
        console.error('Confetti canvas not found.');
        return;
      }
    }

    // Standard confetti launch from both sides
    this.myConfetti({
      particleCount: 150,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 }, // Adjusted origin for better visual
      colors: ['#00ff9d', '#d644ff', '#16a2ff', '#ffffff'], // Thematic colors
    });
    this.myConfetti({
      particleCount: 150,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 }, // Adjusted origin for better visual
      colors: ['#00ff9d', '#d644ff', '#16a2ff', '#ffffff'], // Thematic colors
    });

    // Add a little burst from the center top for more celebration
    this.myConfetti({
      particleCount: 100,
      angle: 90,
      spread: 80,
      origin: { y: 0.2 }, // From the top center
      colors: ['#00ff9d', '#d644ff', '#16a2ff', '#ffffff'],
    });
  }

  ngOnDestroy(): void {
    if (this.stepsSubscription) {
      this.stepsSubscription.unsubscribe();
    }
    // Clean up confetti instance if it supports it (optional, canvas-confetti handles resize)
    if (
      this.myConfetti &&
      typeof (this.myConfetti as any).reset === 'function'
    ) {
      (this.myConfetti as any).reset();
    }
  }
}
