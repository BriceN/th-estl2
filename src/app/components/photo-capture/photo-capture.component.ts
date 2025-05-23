// components/photo-capture/photo-capture.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhotoStorageService } from '../../services/photo-storage.service';
import { AudioManagerService } from '../../services/audio-manager.service';

@Component({
  selector: 'app-photo-capture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photo-capture.component.html',
  styleUrls: ['./photo-capture.component.scss'],
})
export class PhotoCaptureComponent implements OnDestroy {
  @Input() stepId!: number;
  @Output() photoCaptured = new EventEmitter<string>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

  showCamera = false;
  photoUrl: string | null = null;
  captureDate: Date | null = null;
  stream: MediaStream | null = null;
  hasMultipleCameras = false;
  currentCamera: 'user' | 'environment' = 'environment';

  constructor(
    private photoStorage: PhotoStorageService,
    private audioManager: AudioManagerService
  ) {}

  ngOnInit() {
    this.loadExistingPhoto();
    this.checkCameraAvailability();
  }

  ngOnDestroy() {
    this.stopCamera();
    if (this.photoUrl) {
      this.photoStorage.revokeObjectURL(this.photoUrl);
    }
  }

  private async loadExistingPhoto() {
    const existingPhoto = await this.photoStorage.getPhotoByStepId(this.stepId);

    if (existingPhoto) {
      this.photoUrl = this.photoStorage.createObjectURL(
        existingPhoto.photoBlob
      );
      this.captureDate = new Date(existingPhoto.timestamp);
    }
  }

  private async checkCameraAvailability() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === 'videoinput');
      this.hasMultipleCameras = cameras.length > 1;
    } catch (error) {
      console.error('Error checking cameras:', error);
    }
  }

  async startCamera() {
    this.showCamera = true;
    // this.audioManager.play('camera_open.wav', false, false, 0, 0.5);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: this.currentCamera,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
      }
    } catch (error) {
      console.error('Camera access error:', error);
      this.showCamera = false;
      alert("Impossible d'accéder à la caméra");
    }
  }

  capturePhoto() {
    if (!this.videoElement || !this.canvas) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d')!;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Play shutter sound
    // this.audioManager.play('camera_shutter.wav', false, false, 0, 0.6);

    // Flash effect
    this.createFlashEffect();

    // Convert to blob and save
    canvas.toBlob(
      async (blob) => {
        if (blob) {
          try {
            const photoId = await this.photoStorage.savePhoto(
              this.stepId,
              blob
            );
            this.photoUrl = this.photoStorage.createObjectURL(blob);
            this.captureDate = new Date();
            this.photoCaptured.emit(photoId);
            this.stopCamera();

            // Vibrate on success
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
          } catch (error) {
            console.error('Error saving photo:', error);
            alert('Erreur lors de la sauvegarde de la photo');
          }
        }
      },
      'image/jpeg',
      0.9
    );
  }

  private createFlashEffect() {
    const flash = document.createElement('div');
    flash.className = 'camera-flash';
    document.body.appendChild(flash);

    setTimeout(() => {
      document.body.removeChild(flash);
    }, 300);
  }

  cancelCamera() {
    this.stopCamera();
    this.audioManager.play('click.wav', false, false, 0, 0.6);
  }

  retakePhoto() {
    if (this.photoUrl) {
      this.photoStorage.revokeObjectURL(this.photoUrl);
      this.photoUrl = null;
    }
    this.startCamera();
  }

  switchCamera() {
    this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';
    this.stopCamera();
    this.startCamera();
  }

  private stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.showCamera = false;
  }
}
