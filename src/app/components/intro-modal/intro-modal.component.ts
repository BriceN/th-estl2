import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioManagerService } from '../../services/audio-manager.service';
import { CassettePlayerComponent } from '../cassette-player/cassette-player.component';

@Component({
  selector: 'app-intro-modal',
  standalone: true,
  imports: [CommonModule, CassettePlayerComponent],
  templateUrl: './intro-modal.component.html',
  styleUrl: './intro-modal.component.scss',
})
export class IntroModalComponent implements OnInit {
  @Output() modalClosed = new EventEmitter<void>();

  showModal = false;
  showFirstLayer = true;
  showSecondLayer = false;
  isAnimating = false;

  private readonly STORAGE_KEY = 'has_seen_intro';

  constructor(private audioManagerService: AudioManagerService) {}

  ngOnInit() {
    // Check if user has seen the intro before
    const hasSeenIntro = localStorage.getItem(this.STORAGE_KEY);
    if (!hasSeenIntro) {
      this.showModal = true;
      setTimeout(() => {
        this.audioManagerService.stopAll();
      }, 1000);
    }
  }

  playIntro() {
    this.audioManagerService.play('transformers.wav', true);
  }

  startUnlockAnimation() {
    if (this.isAnimating) return;
    const self = this;
    this.audioManagerService
      .playMultiple(['servo.wav', 'tension.wav'])
      .then(function () {
        self.audioManagerService.stop('transformers.wav');
        self.audioManagerService.play('space.ogg', true, true, 1000, 0.05);
      });

    this.isAnimating = true;
    document
      .querySelector('.central-mechanism')
      ?.classList.add('scaleMecanism');
    // Start the animation and transition to second layer after 3 seconds
    setTimeout(() => {
      this.showFirstLayer = false;
      this.showSecondLayer = true;
      this.isAnimating = false;
    }, 9000);
  }

  closeModal() {
    this.audioManagerService.play('click.wav', false, false, 0, 0.2);
    this.showModal = false;
    // Save that user has seen the intro
    localStorage.setItem(this.STORAGE_KEY, 'true');
    this.modalClosed.emit();
  }
}
