import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaceRecognitionService } from '../../services/face-recognition.service';
import { ClienteService } from '../../services/cliente.service';
import { ToastService } from '../../services/toast.service';
import { Cliente } from '../../models/cliente.model';

interface RecognitionResult {
  cliente: Cliente;
  confianza: number;
  distancia: number;
}

@Component({
  selector: 'app-face-recognition',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './face-recognition.component.html',
  styleUrls: ['./face-recognition.component.scss']
})
export class FaceRecognitionComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  isLoading: boolean = false;
  cameraActive: boolean = false;
  mediaStream: MediaStream | null = null;
  recognitionResult: RecognitionResult | null = null;
  isRecognizing: boolean = false;
  modelsLoaded: boolean = false;
  statusMessage: string = 'Inicializando modelos de reconocimiento facial...';

  private recognitionInterval: any;

  // Anti-duplicados: evita registrar la misma persona en cada frame/intervalo.
  private lastRegisteredClienteId: string | null = null;
  private lastRegisteredAt: number = 0;
  private readonly autoRegisterCooldownMs: number = 10_000;
  private readonly turnstileApiUrl = 'http://192.168.1.42:5000/abrir';

  constructor(
    private readonly faceRecognitionService: FaceRecognitionService,
    private readonly clienteService: ClienteService,
    private readonly toastService: ToastService
  ) {}

  private async openTurnstile(): Promise<void> {
    try {
      const response = await fetch(this.turnstileApiUrl, {
        method: 'GET',
        mode: 'cors'
      });

      if (!response.ok) {
        console.warn('No se pudo abrir el torniquete:', response.status, response.statusText);
        return;
      }

      this.toastService.show('Torniquete abierto correctamente.', 'success');
    } catch (error) {
      console.error('Error llamando API del torniquete:', error);
      this.toastService.show('Error al abrir el torniquete.', 'error');
    }
  }

  ngOnInit(): void {
    this.initializeModels();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    if (this.recognitionInterval) {
      clearInterval(this.recognitionInterval);
    }
  }

  private initializeModels(): void {
    this.faceRecognitionService.modelsLoaded$.subscribe(loaded => {
      if (loaded) {
        this.modelsLoaded = true;
        this.statusMessage = 'Modelos cargados. Presiona "Iniciar cámara" para comenzar.';
      }
    });
  }

  async startCamera(): Promise<void> {
    if (this.cameraActive) {
      this.stopCamera();
      return;
    }

    try {
      this.isLoading = true;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      this.mediaStream = stream;
      this.cameraActive = true;

      setTimeout(() => {
        if (this.videoElement) {
          this.videoElement.nativeElement.srcObject = stream;
          this.statusMessage = 'Cámara activa. Presiona "Capturar y buscar" para identificar.';
        }
      }, 100);

      // Auto-recognition cada 2 segundos
      this.recognitionInterval = setInterval(() => {
        if (this.cameraActive && !this.isRecognizing) {
          this.captureAndRecognize();
        }
      }, 2000);
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
      this.statusMessage = 'Error: No se pudo acceder a la cámara';
      this.toastService.show('Error accediendo a la cámara', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.cameraActive = false;
    if (this.recognitionInterval) {
      clearInterval(this.recognitionInterval);
    }
  }

  private isValidDescriptor(descriptor: number[] | null): descriptor is number[] {
    return Array.isArray(descriptor) && descriptor.length === 128;
  }

  private getRegisteredDescriptors() {
    return this.clienteService.getClientes()
      .filter(c => this.isValidDescriptor(c.faceDescriptor ?? null))
      .map(c => ({
        descriptor: c.faceDescriptor as number[],
        id: c.id,
        nombre: c.nombre
      }));
  }

  private async matchFaceDescriptor(queryDescriptor: number[]): Promise<any> {
    const descriptorsList = this.getRegisteredDescriptors();
    if (descriptorsList.length === 0) {
      this.statusMessage = 'No hay clientes registrados con descriptor facial para comparar';
      return null;
    }

    return this.faceRecognitionService.findBestMatch(queryDescriptor, descriptorsList, 0.6);
  }

  async captureAndRecognize(): Promise<void> {
    if (!this.videoElement || !this.cameraActive || this.isRecognizing) {
      return;
    }

    this.isRecognizing = true;
    try {
      const video = this.videoElement.nativeElement;
      const canvas = await this.faceRecognitionService.captureFrameFromVideo(video);

      if (!canvas) {
        this.statusMessage = 'No se pudo capturar frame';
        return;
      }

      const queryDescriptor = await this.faceRecognitionService.generateDescriptor(canvas);
      if (!this.isValidDescriptor(queryDescriptor)) {
        this.statusMessage = 'No se pudo generar descriptor facial. Asegúrate de que el rostro esté bien iluminado y centrado.';
        return;
      }

      const match = await this.matchFaceDescriptor(queryDescriptor);
      if (!match) {
        this.statusMessage = 'Rostro no reconocido. Intenta acercarte más o verifica que el cliente esté registrado.';
        this.recognitionResult = null;
        return;
      }

      const clienteCompleto = this.clienteService.getClientes().find(c => c.id === match.id);
      if (!clienteCompleto) {
        this.statusMessage = 'Error al cargar datos del cliente identificado.';
        this.recognitionResult = null;
        return;
      }

      this.recognitionResult = {
        cliente: clienteCompleto,
        confianza: match.confianza,
        distancia: match.distancia
      };
      this.statusMessage = `✓ Identificado: ${match.nombre} (Confianza: ${(match.confianza * 100).toFixed(1)}%)`;
      this.toastService.show(`¡Bienvenido ${match.nombre}!`, 'success');

      const now = Date.now();
      const shouldRegister =
        !this.lastRegisteredAt ||
        this.lastRegisteredClienteId !== clienteCompleto.id ||
        (now - this.lastRegisteredAt) >= this.autoRegisterCooldownMs;

      if (shouldRegister) {
        await this.clienteService.registrarEntrada(clienteCompleto.id);
        this.toastService.show(`Entrada registrada para ${clienteCompleto.nombre}`, 'success');
        this.statusMessage = `Entrada registrada para ${clienteCompleto.nombre}.`;

        await this.openTurnstile();

        this.lastRegisteredClienteId = clienteCompleto.id;
        this.lastRegisteredAt = now;
      }
    } catch (error) {
      console.error('Error en reconocimiento:', error);
      this.statusMessage = 'Error durante el reconocimiento facial';
    } finally {
      this.isRecognizing = false;
    }
  }

  registerEntry(): void {
    if (!this.recognitionResult) {
      this.toastService.show('No hay cliente identificado', 'error');
      return;
    }

    try {
      this.clienteService.registrarEntrada(this.recognitionResult.cliente.id);
      this.toastService.show(`Entrada registrada para ${this.recognitionResult.cliente.nombre}`, 'success');
      this.statusMessage = `Entrada registrada. Presiona "Capturar y buscar" para continuar.`;
      this.recognitionResult = null;
    } catch (error) {
      console.error('Error registrando entrada:', error);
      this.toastService.show('Error registrando entrada', 'error');
    }
  }

  clearResult(): void {
    this.recognitionResult = null;
    this.statusMessage = 'Esperando siguiente cliente...';
  }

  getDiasRestantes(fechaVencimiento: string): number {
    return this.clienteService.calcularDiasRestantes(fechaVencimiento);
  }

  getStatusClass(dias: number): string {
    if (dias < 0) return 'vencido';
    if (dias <= 3) return 'proximo';
    return 'vigente';
  }

  getStatusText(dias: number): string {
    if (dias < 0) return 'Vencido';
    if (dias === 0) return 'Hoy';
    return `${dias} días`;
  }
}
