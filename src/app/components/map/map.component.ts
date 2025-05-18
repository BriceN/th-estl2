import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
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
})
export class MapComponent implements OnInit, OnDestroy {
  steps: Step[] = [];
  private subscription: Subscription | null = null;

  constructor(
    public treasureHuntService: TreasureHuntService,
    private audioManagerService: AudioManagerService
  ) {}

  ngOnInit(): void {
    this.subscription = this.treasureHuntService
      .getSteps()
      .subscribe((steps) => {
        this.steps = steps;
      });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  // Implement accordion behavior
  toggleStep(step: Step): void {
    if (step.isCurrent) {
      // If the step is already open, close it
      this.treasureHuntService.closeAllSteps();
      this.audioManagerService.play('close.wav');
    } else {
      // Open the clicked step (close all others)
      this.treasureHuntService.onStepOpen(step);
      this.audioManagerService.play('open.wav');
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
}
