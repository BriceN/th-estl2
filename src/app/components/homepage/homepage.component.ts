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
    this.audioManagerService.play('space.ogg', true, true, 1000, 0.05);
  }
  playClickSound() {
    this.audioManagerService.play('click.wav', false, false, 0, 0.6);
  }
}
