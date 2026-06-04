import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaceRecognitionComponent } from '../face-recognition/face-recognition.component';

@Component({
  selector: 'app-scanner-window',
  standalone: true,
  imports: [CommonModule, FaceRecognitionComponent],
  templateUrl: './scanner-window.component.html',
})
export class ScannerWindowComponent {}

