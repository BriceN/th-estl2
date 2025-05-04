import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-intro-modal',
  standalone: true,
  imports: [CommonModule],
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

  ngOnInit() {
    // Check if user has seen the intro before
    const hasSeenIntro = localStorage.getItem(this.STORAGE_KEY);
    if (!hasSeenIntro) {
      this.showModal = true;
    }
  }

  startUnlockAnimation() {
    if (this.isAnimating) return;

    this.isAnimating = true;
    // Start the animation and transition to second layer after 3 seconds
    setTimeout(() => {
      this.showFirstLayer = false;
      this.showSecondLayer = true;
      this.isAnimating = false;
    }, 3000);
  }

  closeModal() {
    this.showModal = false;
    // Save that user has seen the intro
    localStorage.setItem(this.STORAGE_KEY, 'true');
    this.modalClosed.emit();
  }
}
