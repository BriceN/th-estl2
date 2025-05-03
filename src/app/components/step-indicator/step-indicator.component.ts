import {
  Component,
  Input,
  ElementRef,
  AfterViewInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Step } from '../../models/step.model';

@Component({
  selector: 'app-step-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-indicator.component.html',
  styleUrl: './step-indicator.component.scss',
})
export class StepIndicatorComponent implements AfterViewInit {
  @Input() steps: Step[] = [];
  @ViewChild('dotsContainer') dotsContainer!: ElementRef;

  ngAfterViewInit() {
    // Scroll to current step if one exists
    if (this.steps.length > 0) {
      setTimeout(() => {
        const currentIndex = this.steps.findIndex((step) => step.isCurrent);
        if (currentIndex !== -1) {
          this.scrollToStep(currentIndex);
        }
      }, 100);
    }
  }

  private scrollToStep(index: number) {
    const dotWidth = 40; // Approximate width of each dot with spacing
    const container = this.dotsContainer.nativeElement;
    const containerWidth = container.offsetWidth;

    // Calculate position to center the current step
    const scrollPosition = index * dotWidth - containerWidth / 2 + dotWidth / 2;

    container.scrollLeft = Math.max(0, scrollPosition);
  }
}
