import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { Step } from '../../models/step.model';
import { TreasureHuntService } from '../../services/treasure-hunt.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
})
export class MapComponent implements OnInit, OnDestroy {
  steps: Step[] = [];
  private subscription: Subscription | null = null;

  constructor(public treasureHuntService: TreasureHuntService) {}

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

  onStepOpen(step: Step): void {
    this.treasureHuntService.onStepOpen(step);
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
      this.onStepOpen(nextStep);
    }
  }
}
