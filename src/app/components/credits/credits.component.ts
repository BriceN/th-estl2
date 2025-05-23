import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioManagerService } from '../../services/audio-manager.service';
import { TreasureHuntService } from '../../services/treasure-hunt.service';
import { Step } from '../../models/step.model';
import { Subject, takeUntil } from 'rxjs';
import { PhotoStorageService } from '../../services/photo-storage.service';

@Component({
  selector: 'app-credits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './credits.component.html',
  styleUrl: './credits.component.scss',
})
export class CreditsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('creditsContent') creditsContent!: ElementRef;

  steps: Step[] = [];
  journeyYears: number[] = [];
  Math = Math; // Expose Math to the template
  stepPhotos: Map<number, string> = new Map();

  private destroy$ = new Subject<void>();
  private readonly CREDITS_DURATION_MS = 146000; // 2 min 26 seconds

  constructor(
    private audioManagerService: AudioManagerService,
    private treasureHuntService: TreasureHuntService,
    private photoStorage: PhotoStorageService
  ) {}

  ngOnInit(): void {
    // Stop all audio and play credits music
    this.audioManagerService.stopAll();
    this.audioManagerService.play('OuterWilds.mp3', false, true, 1000, 0.5);

    // Get steps data
    this.treasureHuntService
      .getSteps()
      .pipe(takeUntil(this.destroy$))
      .subscribe((steps) => {
        // Filter only unlocked steps and sort by year
        this.steps = steps
          .filter((step) => step.isUnlocked)
          .sort((a, b) => a.year - b.year);

        // Extract unique years for the journey summary
        this.journeyYears = [...new Set(this.steps.map((step) => step.year))];
      });

    // Load all photos
    this.photoStorage
      .getPhotosObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe((photos) => {
        // Clean up old URLs
        this.stepPhotos.forEach((url) => URL.revokeObjectURL(url));

        // Create new URLs
        this.stepPhotos.clear();
        photos.forEach((photo, stepId) => {
          const url = URL.createObjectURL(photo.photoBlob);
          this.stepPhotos.set(stepId, url);
        });
      });
  }

  ngAfterViewInit(): void {
    // Wait a short moment to ensure content is fully rendered
    setTimeout(() => {
      if (this.creditsContent && this.creditsContent.nativeElement) {
        const contentElement = this.creditsContent.nativeElement;
        const totalScrollHeight =
          contentElement.scrollHeight - contentElement.clientHeight;

        // Calculate scroll speed (pixels per ms)
        const scrollSpeed = totalScrollHeight / this.CREDITS_DURATION_MS;

        // Start auto scrolling
        this.startAutoScroll(scrollSpeed);
      }
    }, 500);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Restore music when component is destroyed
    this.audioManagerService.stopAll();
    this.audioManagerService.play('space.ogg', true, true, 1000, 0.05);
    this.stepPhotos.forEach((url) => URL.revokeObjectURL(url));
  }

  private startAutoScroll(scrollSpeed: number): void {
    let startTime: number | null = null;
    let animationFrameId: number;

    const scrollStep = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (elapsed < this.CREDITS_DURATION_MS) {
        const scrollPosition = Math.min(
          elapsed * scrollSpeed,
          this.creditsContent.nativeElement.scrollHeight
        );
        this.creditsContent.nativeElement.scrollTop = scrollPosition;
        animationFrameId = requestAnimationFrame(scrollStep);
      }
    };

    animationFrameId = requestAnimationFrame(scrollStep);

    // Cleanup function for animation frame
    this.destroy$.subscribe(() => {
      cancelAnimationFrame(animationFrameId);
    });
  }

  getTotalJourneyYears(): number {
    if (this.steps.length === 0) return 0;

    const firstYear = Math.min(...this.steps.map((s) => s.year));
    const lastYear = Math.max(...this.steps.map((s) => s.year));

    return lastYear - firstYear;
  }

  getJourneyDuration(): string {
    if (this.steps.length === 0) return '0';

    const completedSteps = this.steps.filter((s) => s.isUnlocked);
    if (completedSteps.length === 0) return '0';

    // Calculate total duration in milliseconds
    let totalDuration = 0;

    completedSteps.forEach((step) => {
      const duration = this.treasureHuntService.getStepDuration(step.id);
      if (duration) {
        totalDuration += duration;
      }
    });

    // Format duration
    const hours = Math.floor(totalDuration / (1000 * 60 * 60));
    const minutes = Math.floor(
      (totalDuration % (1000 * 60 * 60)) / (1000 * 60)
    );

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Handle image errors
  handleImageError(event: any): void {
    const imgElement = event.target;
    imgElement.src = '/images/unlocked/default.jpg'; // Fallback image
  }
}
