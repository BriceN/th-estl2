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
    this.distanceSubscription = this.treasureHuntService
      .getCurrentDistance()
      .subscribe((distance: number | null) => {
        this.currentDistance = distance;
        this.currentStep = this.treasureHuntService.getCurrentTrackingStep();
      });

    this.coordinatesSubscription = this.treasureHuntService
      .getCurrentCoordinates()
      .subscribe((coordinates: { lat: number; lng: number } | null) => {
        this.currentCoordinates = coordinates;
      });
  }

  ngOnDestroy(): void {
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
      this.locationPermissionGranted = true;
    }
  }

  requestLocationPermission(): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          this.locationPermissionGranted = true;
          alert('Accès à la localisation accordé ! La chasse est lancée !');
        },
        () => {
          this.locationPermissionGranted = false;
          alert(
            'Accès à la localisation refusé. Veuillez activer les services de localisation.'
          );
        }
      );
    }
  }

  formatDistance(distance: number | null): string {
    if (distance === null) return '---';
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(2)}km`;
    }
    return `${Math.round(distance)}m`;
  }

  getDistanceColorClass(): string {
    if (this.currentDistance === null) return 'froid';
    if (this.currentDistance <= 5) return 'tres-chaud';
    if (this.currentDistance <= 15) return 'chaud';
    if (this.currentDistance <= 30) return 'tiede';
    return 'froid';
  }

  getRadialProgressBackground(): string {
    if (this.currentDistance === null) return 'none';

    const progress = this.getDistanceProgress();
    const angle = (progress / 100) * 360;

    return `conic-gradient(
      from 0deg,
      rgba(0, 217, 255, 0.3) ${angle}deg,
      transparent ${angle}deg
    )`;
  }

  getDistanceProgress(): number {
    if (this.currentDistance === null) return 0;

    const proximityRadius = this.treasureHuntService.getProximityRadius();
    const unlockRadius = this.treasureHuntService.getUnlockRadius();

    if (this.currentDistance <= unlockRadius) return 100;

    const percentage =
      100 -
      ((this.currentDistance - unlockRadius) /
        (proximityRadius - unlockRadius)) *
        100;

    return Math.max(0, Math.min(100, percentage));
  }

  isCloseToTarget(threshold: number = 10): boolean {
    return this.currentDistance !== null && this.currentDistance <= threshold;
  }
}
