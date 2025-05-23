// services/photo-export.service.ts
import { Injectable } from '@angular/core';
import { Step } from '../models/step.model';

interface PhotoMemory {
  id: string;
  stepId: number;
  photoBlob: Blob;
  timestamp: number;
  thumbnail?: Blob;
  caption?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PhotoExportService {
  async exportAsZip(
    photos: Map<number, PhotoMemory>,
    steps: Step[]
  ): Promise<void> {
    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Create a photos folder
    const photosFolder = zip.folder('souvenirs-chasse-au-tresor');

    // Add metadata file
    const metadata = {
      exportDate: new Date().toISOString(),
      totalPhotos: photos.size,
      steps: Array.from(photos.entries()).map(([stepId, photo]) => {
        const step = steps.find((s) => s.id === stepId);
        return {
          stepId,
          stepTitle: step?.title || 'Étape inconnue',
          stepYear: step?.year || 'Année inconnue',
          photoDate: new Date(photo.timestamp).toISOString(),
          caption: photo.caption || '',
        };
      }),
    };

    photosFolder!.file('metadata.json', JSON.stringify(metadata, null, 2));

    // Add photos with meaningful names
    const photoPromises: Promise<void>[] = [];

    photos.forEach((photo, stepId) => {
      const step = steps.find((s) => s.id === stepId);
      const safeTitle = (step?.title || 'step')
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
      const filename = `${stepId}_${step?.year || 'unknown'}_${safeTitle}.jpg`;

      photoPromises.push(
        this.addPhotoToZip(photosFolder!, filename, photo.photoBlob)
      );
    });

    await Promise.all(photoPromises);

    // Generate zip file
    const content = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6,
      },
    });

    // Download the zip
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chasse-au-tresor-photos-${
      new Date().toISOString().split('T')[0]
    }.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async addPhotoToZip(
    folder: any,
    filename: string,
    blob: Blob
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        folder.file(filename, reader.result, { binary: true });
        resolve();
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }
}
