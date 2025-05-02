import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreasureHuntService } from '../../services/treasure-hunt.service';
import { Step } from '../../models/step.model';

@Component({
  selector: 'app-debug-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './debug-panel.component.html',
  styleUrl: './debug-panel.component.scss',
})
export class DebugPanelComponent implements OnChanges {
  @Input() currentStep: Step | null = null;
  @Input() currentCoordinates: { lat: number; lng: number } | null = null;
  @Input() currentDistance: number | null = null;

  debugMode = false;

  constructor(private treasureHuntService: TreasureHuntService) {
    this.debugMode = this.treasureHuntService.getDebugMode();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // React to any input changes if needed
  }

  toggleDebug(): void {
    this.debugMode = this.treasureHuntService.toggleDebugMode();
  }

  simulateLocation(): void {
    this.treasureHuntService.simulateLocationReached();
    alert("Arrivée à l'emplacement simulée !");
  }

  resetHunt(): void {
    if (
      confirm(
        'Êtes-vous sûr de vouloir réinitialiser votre progression ? Cette action ne peut pas être annulée.'
      )
    ) {
      this.treasureHuntService.resetHunt();
    }
  }

  isCloseToTarget(): boolean {
    return this.currentDistance !== null && this.currentDistance <= 10;
  }

  formatDistance(distance: number | null): string {
    if (distance === null) return 'Inconnue';

    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(2)} km`;
    } else {
      return `${Math.round(distance)} m`;
    }
  }
}
