import { Component, Input, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cassette-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cassette-player.component.html',
  styleUrl: './cassette-player.component.scss',
})
export class CassettePlayerComponent implements OnInit {
  @Input() cassetteFile: string = '';
  @ViewChild('cassetteVideo') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('cassetteAudio') audioElement!: ElementRef<HTMLAudioElement>;

  isPlaying: boolean = false;

  ngOnInit() {}

  togglePlayPause() {
    console.log('here');
    if (!this.videoElement || !this.audioElement) return;

    const video = this.videoElement.nativeElement;
    const audio = this.audioElement.nativeElement;

    if (this.isPlaying) {
      video.pause();
      audio.pause();
    } else {
      video.play();
      audio.play();
    }
    this.isPlaying = !this.isPlaying;
  }

  onVideoPlay() {
    if (this.audioElement) {
      this.audioElement.nativeElement.play();
    }
    this.isPlaying = true;
  }

  onVideoPause() {
    if (this.audioElement) {
      this.audioElement.nativeElement.pause();
    }
    this.isPlaying = false;
  }

  onVideoEnd() {
    if (this.audioElement) {
      this.audioElement.nativeElement.pause();
      this.audioElement.nativeElement.currentTime = 0;
    }
    this.isPlaying = false;
  }

  onAudioEnded() {
    if (this.videoElement) {
      this.videoElement.nativeElement.pause();
    }
    this.isPlaying = false;
  }
}
