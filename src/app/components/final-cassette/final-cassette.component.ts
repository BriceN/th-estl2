import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';
import { CassettePlayerComponent } from '../cassette-player/cassette-player.component';

@Component({
  selector: 'app-final-cassette',
  imports: [CassettePlayerComponent],
  templateUrl: './final-cassette.component.html',
  styleUrl: './final-cassette.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalCassetteComponent {
  @Output() cassetteEnded = new EventEmitter<void>();

  onFinalCassetteEnded(): void {
    // Emit event when the final cassette finishes playing
    this.cassetteEnded.emit();
  }
}
