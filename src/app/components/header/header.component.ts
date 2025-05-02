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
  private subscription: Subscription | null = null;

  constructor(
    private router: Router,
    private treasureHuntService: TreasureHuntService
  ) {}

  ngOnInit(): void {
    // Subscribe to steps to get the current tracking step
    this.subscription = this.treasureHuntService.getSteps().subscribe(() => {
      // Instead of finding the "current" step, get the tracking step directly
      this.trackingStep = this.treasureHuntService.getCurrentTrackingStep();
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
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
