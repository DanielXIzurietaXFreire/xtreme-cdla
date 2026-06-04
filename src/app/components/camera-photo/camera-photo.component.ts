import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-camera-photo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './camera-photo.component.html',
  styleUrls: ['./camera-photo.component.scss']
})
export class CameraPhotoComponent {
  @Input() context: string = 'register';
  @Output() fotoCapturada = new EventEmitter<string>();

  @ViewChild('video') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  cameraActive: boolean = false;
  fotoCapturadaLocal: string = '';
  mediaStream: MediaStream | null = null;
  statusMessage: string = 'Sin foto - haz clic para capturar o subir.';

  async initCamera(): Promise<void> {
    if (this.cameraActive) {
      this.stopCamera();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      this.mediaStream = stream;
      this.cameraActive = true;
      this.statusMessage = 'Cámara activa - presiona "Tomar" para capturar';

      setTimeout(() => {
        if (this.videoElement) {
          this.videoElement.nativeElement.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
      this.statusMessage = 'Error: No se pudo acceder a la cámara';
    }
  }

  capturePhoto(): void {
    if (!this.videoElement || !this.cameraActive) return;

    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      this.fotoCapturadaLocal = canvas.toDataURL('image/jpeg');
      this.fotoCapturada.emit(this.fotoCapturadaLocal);
      this.stopCamera();
      this.statusMessage = 'Foto capturada correctamente ✓';
    }
  }

  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.cameraActive = false;
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement?.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.fotoCapturadaLocal = result;
      this.fotoCapturada.emit(result);
      this.statusMessage = 'Foto subida correctamente ✓';
      this.stopCamera();
    };
    reader.readAsDataURL(file);
  }

  reset(): void {
    this.fotoCapturadaLocal = '';
    this.statusMessage = 'Sin foto - haz clic para capturar o subir.';
    this.stopCamera();
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  get hasFoto(): boolean {
    return !!this.fotoCapturadaLocal;
  }
}
