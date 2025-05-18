import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TreasureHuntService } from '../../services/treasure-hunt.service';
import { ThreeCubeComponent } from '../three-cube/three-cube.component';
import { FinalCassetteComponent } from '../final-cassette/final-cassette.component';
import { CreditsComponent } from '../credits/credits.component';

type EndingModalState = 'cube' | 'cassette' | 'credits';

@Component({
  selector: 'app-ending-modal',
  imports: [
    CommonModule,
    ThreeCubeComponent,
    FinalCassetteComponent,
    CreditsComponent,
  ],

  templateUrl: './ending-modal.component.html',
  styleUrl: './ending-modal.component.scss',
})
export class EndingModalComponent implements OnInit, OnDestroy {
  showModal = false;
  currentState: EndingModalState = 'cube';
  private subscription: Subscription | null = null;

  constructor(private treasureHuntService: TreasureHuntService) {}

  ngOnInit(): void {
    this.subscription = this.treasureHuntService
      .getShowEndingModal()
      .subscribe((show: boolean) => {
        console.log(show);
        this.showModal = show;
        if (show) {
          // Reset to initial state when modal opens
          this.currentState = 'cube';
        }
      });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  onCubeInteracted(): void {
    // Transition from cube to cassette
    this.currentState = 'cassette';
  }

  onCassetteEnded(): void {
    // Transition from cassette to credits
    this.currentState = 'credits';
  }

  onOverlayClick(event: Event): void {
    // Close modal only when clicking on overlay, not on modal content
    if (
      event.target === event.currentTarget &&
      this.currentState === 'credits'
    ) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.treasureHuntService.closeEndingModal();
  }
}
