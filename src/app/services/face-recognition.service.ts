import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FaceRecognitionService {
  private readonly modelsLoadedSubject = new BehaviorSubject<boolean>(false);
  public readonly modelsLoaded$: Observable<boolean> = this.modelsLoadedSubject.asObservable();

  private scriptLoaded = false;
  private faceapi: any;

  constructor() {
    this.loadFaceApiScript();
  }

  private loadFaceApiScript(): void {
    if (this.scriptLoaded) return;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
    script.async = true;
    script.onload = () => {
      this.faceapi = (globalThis as any).faceapi;
      this.loadModels();
    };
    script.onerror = () => {
      console.error('Error cargando face-api.js');
    };
    document.head.appendChild(script);
    this.scriptLoaded = true;
  }

  private async loadModels(): Promise<void> {
    if (!this.faceapi) {
      console.error('face-api no está cargado');
      return;
    }

    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
    try {
      await Promise.all([
        this.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        this.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        this.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      this.modelsLoadedSubject.next(true);
    } catch (error) {
      console.error('Error cargando modelos de face-api:', error);
    }
  }

  async detectFace(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<any> {
    await this.waitForModelsLoaded();
    if (!this.faceapi) return null;

    try {
      const detection = await this.faceapi.detectSingleFace(input, new this.faceapi.TinyFaceDetectorOptions());
      return detection;
    } catch (error) {
      console.error('Error detectando rostro:', error);
      return null;
    }
  }

  async generateDescriptor(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<number[] | null> {
    await this.waitForModelsLoaded();
    if (!this.faceapi) return null;

    try {
      const detectionWithDescriptor = await this.faceapi
        .detectSingleFace(input, new this.faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detectionWithDescriptor && detectionWithDescriptor.descriptor) {
        const arr = Array.from(detectionWithDescriptor.descriptor as Iterable<number>).map(n => Number(n));
        if (arr.length === 128) return arr;
        console.warn('Descriptor generado no tiene 128 dimensiones:', arr.length);
      }
      return null;
    } catch (error) {
      console.error('Error generando descriptor:', error);
      return null;
    }
  }

  compareFaces(descriptor1: number[], descriptor2: number[]): number {
    if (!descriptor1 || !descriptor2) return 1;

    // Distancia euclidiana
    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
      const diff = descriptor1[i] - descriptor2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  findBestMatch(queryDescriptor: number[], descriptorsList: { descriptor: number[], id: string, nombre: string }[], umbral: number = 0.6): any {
    let mejorMatch = null;
    let menorDistancia = Infinity;

    for (const item of descriptorsList) {
      if (!item.descriptor) continue;
      const distancia = this.compareFaces(queryDescriptor, item.descriptor);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        mejorMatch = {
          ...item,
          distancia,
          confianza: 1 - (distancia / 1.5) // Normalizar confianza
        };
      }
    }

    if (mejorMatch && mejorMatch.distancia < umbral) {
      return mejorMatch;
    }

    return null;
  }

  async captureFrameFromVideo(video: HTMLVideoElement): Promise<HTMLCanvasElement | null> {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        return canvas;
      }
      return null;
    } catch (error) {
      console.error('Error capturando frame:', error);
      return null;
    }
  }

  async imageToDescriptor(imageBase64: string): Promise<number[] | null> {
    if (!this.faceapi || !this.modelsLoadedSubject.value) return null;

    try {
      const img = new Image();
      img.src = imageBase64;
      await new Promise(resolve => {
        img.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        return await this.generateDescriptor(canvas);
      }
      return null;
    } catch (error) {
      console.error('Error convirtiendo imagen a descriptor:', error);
      return null;
    }
  }

  async imageUrlToDescriptor(url: string): Promise<number[] | null> {
    if (!this.faceapi || !this.modelsLoadedSubject.value) return null;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = () => reject(new Error('No se pudo cargar la imagen desde la URL'));
      });

      return await this.generateDescriptor(img);
    } catch (error) {
      console.error('Error convertiendo URL de imagen a descriptor:', error);
      return null;
    }
  }

  async waitForModelsLoaded(timeoutMs: number = 10000): Promise<boolean> {
    if (this.modelsLoadedSubject.value) {
      return true;
    }

    return new Promise<boolean>(resolve => {
      let subscription: Subscription | null = null;

      const timeout = globalThis.setTimeout(() => {
        resolve(this.modelsLoadedSubject.value);
        subscription?.unsubscribe();
      }, timeoutMs);

      subscription = this.modelsLoaded$.subscribe(loaded => {
        if (loaded) {
          globalThis.clearTimeout(timeout);
          resolve(true);
          subscription?.unsubscribe();
        }
      });
    });
  }
}
