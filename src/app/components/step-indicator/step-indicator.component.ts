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

  private indicatorElement: HTMLElement | null = null;
  private wrapperElement: HTMLElement | null = null;
  private scrollListener: (() => void) | null = null;
  private originalTop: number = 0;
  private indicatorHeight: number = 0;
  private indicatorWidth: number = 0;
  private placeholderElement: HTMLElement | null = null;

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    setTimeout(() => this.initStickyBehavior(), 100);
  }

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

  ngOnDestroy() {
    if (this.scrollListener && this.wrapperElement) {
      this.wrapperElement.removeEventListener('scroll', this.scrollListener);
    }

    if (this.placeholderElement && this.placeholderElement.parentNode) {
      this.placeholderElement.parentNode.removeChild(this.placeholderElement);
    }
  }

  private initStickyBehavior() {
    this.indicatorElement =
      this.elementRef.nativeElement.querySelector('.step-indicator');
    this.wrapperElement = document.querySelector('.app-container .wrapper');

    if (!this.indicatorElement || !this.wrapperElement) return;

    // Store original positions and dimensions
    this.originalTop =
      this.indicatorElement.getBoundingClientRect().top -
      this.wrapperElement.getBoundingClientRect().top;
    this.indicatorHeight = this.indicatorElement.offsetHeight;

    // Store the original width for later use
    this.indicatorWidth = this.indicatorElement.offsetWidth;

    // Create the scroll handler
    this.scrollListener = () => this.handleScroll();
    this.wrapperElement.addEventListener('scroll', this.scrollListener);
  }

  private handleScroll() {
    if (!this.wrapperElement || !this.indicatorElement) return;

    const scrollTop = this.wrapperElement.scrollTop;
    const triggerPoint = this.originalTop - 20;

    if (scrollTop > triggerPoint) {
      if (!this.placeholderElement) {
        // Create placeholder to prevent content jump
        this.placeholderElement = document.createElement('div');
        this.placeholderElement.style.height = `${this.indicatorHeight + 20}px`;
        this.indicatorElement.parentNode?.insertBefore(
          this.placeholderElement,
          this.indicatorElement
        );

        // Get wrapper width for centering calculation
        const wrapperWidth = window.innerWidth;

        // Calculate the left position to center the element
        const leftPosition = Math.max(
          0,
          (wrapperWidth - this.indicatorWidth) / 2
        );

        // Apply absolute positioning relative to the wrapper
        this.indicatorElement.style.position = 'fixed';
        this.indicatorElement.style.top = '90px';
        this.indicatorElement.style.left = `${leftPosition}px`;
        this.indicatorElement.style.width = `${this.indicatorWidth}px`;
        this.indicatorElement.style.zIndex = '100';

        // Append to the wrapper to make it stick at the top
        this.wrapperElement.appendChild(this.indicatorElement);
      }
    } else if (this.placeholderElement) {
      // Restore original position
      this.indicatorElement.style.position = '';
      this.indicatorElement.style.top = '';
      this.indicatorElement.style.left = '';
      this.indicatorElement.style.width = '';
      this.indicatorElement.style.zIndex = '';

      // Move back to original location
      this.placeholderElement.parentNode?.insertBefore(
        this.indicatorElement,
        this.placeholderElement
      );

      // Remove placeholder
      this.placeholderElement.parentNode?.removeChild(this.placeholderElement);
      this.placeholderElement = null;
    }
  }

  private scrollToStep(index: number) {
    const dotWidth = 40;
    const container = this.dotsContainer.nativeElement;
    const containerWidth = container.offsetWidth;
    const scrollPosition = index * dotWidth - containerWidth / 2 + dotWidth / 2;
    container.scrollLeft = Math.max(0, scrollPosition);
  }
}
