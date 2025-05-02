import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { TreasureHuntService } from '../../services/treasure-hunt.service';
import { Step } from '../../models/step.model';
import { DebugPanelComponent } from '../debug-panel/debug-panel.component';

@Component({
  selector: 'app-tracer',
  standalone: true,
  imports: [CommonModule, RouterLink, DebugPanelComponent],
  templateUrl: './tracer.component.html',
  styleUrl: './tracer.component.scss',
})
export class TracerComponent implements OnInit, OnDestroy {
  locationPermissionGranted = false;
  currentDistance: number | null = null;
  currentStep: Step | null = null;
  currentCoordinates: { lat: number; lng: number } | null = null;

  private distanceSubscription: Subscription | null = null;
  private coordinatesSubscription: Subscription | null = null;

  constructor(public treasureHuntService: TreasureHuntService) {
    this.checkLocationPermission();
  }

  ngOnInit(): void {
    // Subscribe to distance updates
    this.distanceSubscription = this.treasureHuntService
      .getCurrentDistance()
      .subscribe((distance: number | null) => {
        this.currentDistance = distance;
        this.currentStep = this.treasureHuntService.getCurrentTrackingStep();
      });

    // Subscribe to coordinate updates
    this.coordinatesSubscription = this.treasureHuntService
      .getCurrentCoordinates()
      .subscribe((coordinates: { lat: number; lng: number } | null) => {
        this.currentCoordinates = coordinates;
      });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.distanceSubscription) {
      this.distanceSubscription.unsubscribe();
    }

    if (this.coordinatesSubscription) {
      this.coordinatesSubscription.unsubscribe();
    }
  }

  checkLocationPermission(): void {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        this.locationPermissionGranted = result.state === 'granted';

        result.onchange = () => {
          this.locationPermissionGranted = result.state === 'granted';
        };
      });
    } else if ('geolocation' in navigator) {
      // Fallback - we don't know permission state, so we'll assume it might be granted
      this.locationPermissionGranted = true;
    }
  }

  requestLocationPermission(): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.locationPermissionGranted = true;
          alert('Accès à la localisation accordé ! La chasse est lancée !');
        },
        (error) => {
          this.locationPermissionGranted = false;
          alert(
            'Accès à la localisation refusé. Veuillez activer les services de localisation.'
          );
        }
      );
    }
  }

  // Helper method to format distance for display
  formatDistance(distance: number | null): string {
    if (distance === null) return 'Inconnue';

    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(2)} km`;
    } else {
      return `${Math.round(distance)} m`;
    }
  }

  // Determine the color class for the distance bar
  getDistanceColorClass(): string {
    if (this.currentDistance === null) return 'froid';

    if (this.currentDistance <= 5) {
      return 'tres-chaud';
    } else if (this.currentDistance <= 15) {
      return 'chaud';
    } else if (this.currentDistance <= 30) {
      return 'tiede';
    } else {
      return 'froid';
    }
  }

  // Returns the appropriate icon based on distance
  getDistanceIcon(): string {
    if (this.currentDistance === null) return '❓';

    if (this.currentDistance <= 5) {
      return '🔥'; // Feu pour très proche
    } else if (this.currentDistance <= 15) {
      return '♨️'; // Chaud pour proche
    } else if (this.currentDistance <= 30) {
      return '🌡️'; // Thermomètre pour moyen
    } else {
      return '❄️'; // Flocon pour loin
    }
  }

  // Calculate the progress percentage for distance bar
  getDistanceProgress(): number {
    if (this.currentDistance === null) return 0;

    const proximityRadius = this.treasureHuntService.getProximityRadius();
    const unlockRadius = this.treasureHuntService.getUnlockRadius();

    // If we're very close, show high percentage
    if (this.currentDistance <= unlockRadius) {
      return 100;
    }

    // Calculate percentage from proximityRadius to unlockRadius
    const percentage =
      100 -
      ((this.currentDistance - unlockRadius) /
        (proximityRadius - unlockRadius)) *
        100;

    // Cap between 0 and 100
    return Math.max(0, Math.min(100, percentage));
  }

  // Check if we're close to target
  isCloseToTarget(threshold: number = 10): boolean {
    return this.currentDistance !== null && this.currentDistance <= threshold;
  }
}
