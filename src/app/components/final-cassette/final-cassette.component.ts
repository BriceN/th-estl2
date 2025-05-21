import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Output,
} from '@angular/core';
import { CassettePlayerComponent } from '../cassette-player/cassette-player.component';
import { AudioManagerService } from '../../services/audio-manager.service';

@Component({
  selector: 'app-final-cassette',
  imports: [CassettePlayerComponent],
  templateUrl: './final-cassette.component.html',
  styleUrl: './final-cassette.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalCassetteComponent implements OnInit {
  constructor(private audioManagerService: AudioManagerService) {}

  ngOnInit(): void {
    this.audioManagerService.play('found.wav', false, false, 0, 0.5);
  }
  @Output() cassetteEnded = new EventEmitter<void>();

  onFinalCassetteEnded(): void {
    // Emit event when the final cassette finishes playing
    this.cassetteEnded.emit();
  }
}
