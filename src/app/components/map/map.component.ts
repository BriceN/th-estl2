// map.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import {
  trigger,
  state,
  style,
  transition,
  animate,
  query,
  stagger,
} from '@angular/animations';
import { CassettePlayerComponent } from '../cassette-player/cassette-player.component';
import { Step } from '../../models/step.model';
import { TreasureHuntService } from '../../services/treasure-hunt.service';
import { StepIndicatorComponent } from '../step-indicator/step-indicator.component';
import { AudioManagerService } from '../../services/audio-manager.service';
import { FinalStepComponent } from '../final-step/final-step.component';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    CommonModule,
    StepIndicatorComponent,
    CassettePlayerComponent,
    FinalStepComponent,
  ],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
  animations: [
    // Slide animation for timeline content
    trigger('slideInOut', [
      transition(':enter', [
        style({
          height: '0px',
          opacity: 0,
          paddingTop: '0px',
          paddingBottom: '0px',
          overflow: 'hidden',
        }),
        animate(
          '400ms ease-in-out',
          style({
            height: '*',
            opacity: 1,
            paddingTop: '*',
            paddingBottom: '*',
          })
        ),
      ]),
      transition(':leave', [
        style({ overflow: 'hidden' }),
        animate(
          '300ms ease-in-out',
          style({
            height: '0px',
            opacity: 0,
            paddingTop: '0px',
            paddingBottom: '0px',
          })
        ),
      ]),
    ]),

    // Stagger animation for timeline items
    trigger('staggeredFadeIn', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(50px)' }),
            stagger(100, [
              animate(
                '300ms ease-out',
                style({ opacity: 1, transform: 'translateY(0)' })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
  ],
})
export class MapComponent implements OnInit, OnDestroy {
  steps: Step[] = [];
  private subscription: Subscription | null = null;

  // Track which steps should render content for performance
  visibleSteps = new Set<number>();

  constructor(
    public treasureHuntService: TreasureHuntService,
    private audioManagerService: AudioManagerService
  ) {}

  ngOnInit(): void {
    this.subscription = this.treasureHuntService
      .getSteps()
      .subscribe((steps) => {
        this.steps = steps;
        // Only show content for current step and accessible steps
        this.updateVisibleSteps();
      });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private updateVisibleSteps(): void {
    this.visibleSteps.clear();
    this.steps.forEach((step) => {
      // Always render current step and unlocked steps
      // Also render the next accessible step
      if (
        step.isCurrent ||
        step.isUnlocked ||
        (step.isAccessible && !step.isUnlocked)
      ) {
        this.visibleSteps.add(step.id);
      }
    });
  }

  shouldRenderStepContent(step: Step): boolean {
    return this.visibleSteps.has(step.id);
  }

  // Implement accordion behavior with performance optimization
  toggleStep(step: Step): void {
    if (step.isCurrent) {
      // Close current step
      this.treasureHuntService.closeAllSteps();
      this.audioManagerService.play('close.wav');
    } else {
      // Open new step and ensure its content is visible
      this.visibleSteps.add(step.id);
      this.treasureHuntService.onStepOpen(step);
      this.audioManagerService.play('open.wav');
    }
  }

  // Lazy load step content when it becomes accessible
  onStepBecomeAccessible(step: Step): void {
    if (step.isAccessible && !this.visibleSteps.has(step.id)) {
      this.visibleSteps.add(step.id);
    }
  }

  // Check if there's a next step
  hasNextStep(currentIndex: number): boolean {
    return (
      currentIndex < this.steps.length - 1 &&
      this.steps[currentIndex + 1].isAccessible
    );
  }

  // Navigate to the next step
  goToNextStep(currentIndex: number): void {
    if (this.hasNextStep(currentIndex)) {
      const nextStep = this.steps[currentIndex + 1];
      this.visibleSteps.add(nextStep.id);
      this.treasureHuntService.onStepOpen(nextStep);
    }
  }

  // Check if this is the last step
  isLastStep(index: number): boolean {
    return index === this.steps.length - 1;
  }

  // Get formatted duration for a completed step
  getStepDuration(step: Step): string {
    if (!step.isUnlocked) return '';
    const duration = this.treasureHuntService.getStepDuration(step.id);
    if (duration !== undefined) {
      return this.treasureHuntService.formatDuration(duration);
    }
    return 'Temps inconnu';
  }

  // Check if step has valid duration data
  hasStepDuration(step: Step): boolean {
    if (!step.isUnlocked) return false;
    const duration = this.treasureHuntService.getStepDuration(step.id);
    return duration !== undefined;
  }

  // TrackBy function for ngFor performance
  trackStepById(index: number, step: Step): number {
    return step.id;
  }
}
