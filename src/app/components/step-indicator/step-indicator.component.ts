import {
  Component,
  Input,
  ElementRef,
  AfterViewInit,
  ViewChild,
  OnInit,
  OnDestroy,
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
export class StepIndicatorComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() steps: Step[] = [];
  @ViewChild('dotsContainer') dotsContainer!: ElementRef;

  constructor() {}

  ngOnInit() {}

  ngAfterViewInit() {
    if (this.steps.length > 0) {
      setTimeout(() => {
        const currentIndex = this.steps.findIndex((step) => step.isCurrent);
        if (currentIndex !== -1) {
          this.scrollToStep(currentIndex);
        }
      }, 100);
    }
  }

  ngOnDestroy() {}

  private scrollToStep(index: number) {
    const dotWidth = 40;
    const container = this.dotsContainer.nativeElement;
    const containerWidth = container.offsetWidth;
    const scrollPosition = index * dotWidth - containerWidth / 2 + dotWidth / 2;
    container.scrollLeft = Math.max(0, scrollPosition);
  }
}
