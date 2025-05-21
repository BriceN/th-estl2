import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TreasureHuntService } from '../../services/treasure-hunt.service';
import { Step } from '../../models/step.model';
import { Subscription } from 'rxjs';
import { AudioManagerService } from '../../services/audio-manager.service';
import { DebugPanelComponent } from '../debug-panel/debug-panel.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, DebugPanelComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  trackingStep: Step | null = null;
  locationActive: boolean = false;
  private stepSubscription: Subscription | null = null;
  private locationSubscription: Subscription | null = null;

  // Variables for the debug mode activation
  private clickCount: number = 0;
  private clickTimeout: any = null;

  constructor(
    private router: Router,
    private treasureHuntService: TreasureHuntService,
    private audioManagerService: AudioManagerService
  ) {}

  ngOnInit(): void {
    // Subscribe to steps to get the current tracking step
    this.stepSubscription = this.treasureHuntService
      .getSteps()
      .subscribe(() => {
        this.trackingStep = this.treasureHuntService.getCurrentTrackingStep();
      });

    // Subscribe to location coordinates to determine if GPS is active
    this.locationSubscription = this.treasureHuntService
      .getCurrentCoordinates()
      .subscribe((coordinates) => {
        this.locationActive = coordinates !== null;
      });
  }

  ngOnDestroy(): void {
    if (this.stepSubscription) {
      this.stepSubscription.unsubscribe();
    }

    if (this.locationSubscription) {
      this.locationSubscription.unsubscribe();
    }

    // Clear timeout if component is destroyed
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
    }
  }

  goBack(): void {
    // Navigate to home page
    this.audioManagerService.play('click.wav', false, false, 0, 0.6);
    this.router.navigate(['/']);
  }

  isHomePage(): boolean {
    // Check if the current URL is the homepage
    return this.router.url === '/';
  }

  // New method to handle circle container clicks
  onCircleContainerClick(): void {
    this.clickCount++;
    console.log(this.clickCount);
    // Clear any existing timeout
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
    }

    // If the click count reaches 10, activate debug mode
    if (this.clickCount >= 10) {
      this.clickCount = 0;
      this.treasureHuntService.toggleDebugMode();
    }

    // Reset click count after 3 seconds of inactivity
    this.clickTimeout = setTimeout(() => {
      this.clickCount = 0;
    }, 3000);
  }
}
