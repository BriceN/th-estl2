import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TreasureHuntService } from '../../services/treasure-hunt.service';
import { Step } from '../../models/step.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  trackingStep: Step | null = null;
  locationActive: boolean = false;
  private stepSubscription: Subscription | null = null;
  private locationSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private treasureHuntService: TreasureHuntService
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
  }

  goBack(): void {
    // Navigate to home page
    this.router.navigate(['/']);
  }

  isHomePage(): boolean {
    // Check if the current URL is the homepage
    return this.router.url === '/';
  }

  toggleDebugMode(): void {
    this.treasureHuntService.toggleDebugMode();
  }
}
