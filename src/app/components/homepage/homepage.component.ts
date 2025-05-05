import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AudioManagerService } from '../../services/audio-manager.service';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.scss',
})
export class HomepageComponent implements OnInit {
  // Pas besoin de logique particulière pour la page d'accueil
  constructor(private audioManagerService: AudioManagerService) {}
  ngOnInit(): void {
    this.audioManagerService.play('space.ogg', true);
    this.audioManagerService.setVolume('space.ogg', 0.2);
  }
  playClickSound() {
    this.audioManagerService.play('click.wav');
  }
}
