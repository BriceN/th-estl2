import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { AudioManagerService } from '../../services/audio-manager.service';

@Component({
  selector: 'app-credits',
  imports: [],
  templateUrl: './credits.component.html',
  styleUrl: './credits.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditsComponent implements OnInit {
  constructor(private audioManagerService: AudioManagerService) {}
  ngOnInit(): void {
    this.audioManagerService.stopAll();
    this.audioManagerService.play('OuterWilds.mp3', true, true, 1000, 0.5);
  }
}
