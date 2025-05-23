// services/photo-storage.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, BehaviorSubject } from 'rxjs';

interface PhotoMemory {
  id: string;
  stepId: number;
  photoBlob: Blob;
  timestamp: number;
  thumbnail?: Blob; // Compressed version for lists
  caption?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PhotoStorageService {
  private dbName = 'TreasureHuntPhotos';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private photosSubject = new BehaviorSubject<Map<number, PhotoMemory>>(
    new Map()
  );

  constructor() {
    this.initializeDB();
  }

  private async initializeDB(): Promise<void> {
    const request = indexedDB.open(this.dbName, this.dbVersion);

    request.onerror = () => console.error('IndexedDB error:', request.error);

    request.onsuccess = () => {
      this.db = request.result;
      this.loadAllPhotos();
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('photos')) {
        const store = db.createObjectStore('photos', { keyPath: 'id' });
        store.createIndex('stepId', 'stepId', { unique: false });
      }
    };
  }

  async savePhoto(
    stepId: number,
    photoBlob: Blob,
    caption?: string
  ): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `photo_${stepId}_${Date.now()}`;
    const thumbnail = await this.createThumbnail(photoBlob);

    const photoMemory: PhotoMemory = {
      id,
      stepId,
      photoBlob,
      thumbnail,
      timestamp: Date.now(),
      caption,
    };

    const transaction = this.db.transaction(['photos'], 'readwrite');
    const store = transaction.objectStore('photos');

    return new Promise((resolve, reject) => {
      const request = store.add(photoMemory);
      request.onsuccess = () => {
        this.loadAllPhotos(); // Refresh the observable
        resolve(id);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPhotoByStepId(stepId: number): Promise<PhotoMemory | null> {
    if (!this.db) return null;

    const transaction = this.db.transaction(['photos'], 'readonly');
    const store = transaction.objectStore('photos');
    const index = store.index('stepId');

    return new Promise((resolve, reject) => {
      const request = index.get(stepId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async createThumbnail(blob: Blob): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      img.onload = () => {
        // Create 200x200 thumbnail
        const size = 200;
        canvas.width = size;
        canvas.height = size;

        // Calculate crop to maintain aspect ratio
        const scale = Math.max(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        canvas.toBlob(
          (thumbnailBlob) => {
            resolve(thumbnailBlob!);
          },
          'image/jpeg',
          0.7
        ); // 70% quality for smaller size
      };

      img.src = URL.createObjectURL(blob);
    });
  }

  getPhotosObservable(): Observable<Map<number, PhotoMemory>> {
    return this.photosSubject.asObservable();
  }

  private async loadAllPhotos(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['photos'], 'readonly');
    const store = transaction.objectStore('photos');
    const request = store.getAll();

    request.onsuccess = () => {
      const photos = new Map<number, PhotoMemory>();
      request.result.forEach((photo: PhotoMemory) => {
        photos.set(photo.stepId, photo);
      });
      this.photosSubject.next(photos);
    };
  }

  // Clean up blob URLs to prevent memory leaks
  createObjectURL(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  revokeObjectURL(url: string): void {
    URL.revokeObjectURL(url);
  }

  async getStorageInfo(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { used: 0, quota: 0 };
  }

  async deletePhoto(stepId: number): Promise<void> {
    if (!this.db) return;

    const photo = await this.getPhotoByStepId(stepId);
    if (!photo) return;

    const transaction = this.db.transaction(['photos'], 'readwrite');
    const store = transaction.objectStore('photos');

    return new Promise((resolve, reject) => {
      const request = store.delete(photo.id);
      request.onsuccess = () => {
        this.loadAllPhotos();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllPhotos(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['photos'], 'readwrite');
    const store = transaction.objectStore('photos');

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        this.loadAllPhotos();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
}
