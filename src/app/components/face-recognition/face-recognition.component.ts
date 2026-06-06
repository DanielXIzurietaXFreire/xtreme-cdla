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

  recognitionPhotoUrl: string | null = null;
  lastRawResponse: any = null;

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
      const modelsReady = await this.faceRecognitionService.waitForModelsLoaded(15000);
      if (!modelsReady) {
        this.statusMessage = 'Error: modelos de reconocimiento no cargaron a tiempo.';
        this.toastService.show('Los modelos no están listos. Intenta recargar la página', 'error');
        this.isLoading = false;
        return;
      }
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

  private readonly descriptorCache = new Map<string, number[]>();

  private isValidDescriptor(descriptor: number[] | null): descriptor is number[] {
    return Array.isArray(descriptor) && descriptor.length === 128;
  }

  private resolveClientImageUrl(cliente: Cliente): string | null {
    if (cliente.fotoUrl) {
      return cliente.fotoUrl;
    }
    return null;
  }

  private async getDescriptorForClient(cliente: Cliente): Promise<number[] | null> {
    if (this.isValidDescriptor(cliente.faceDescriptor ?? null)) {
      return cliente.faceDescriptor as number[];
    }

    const imageUrl = this.resolveClientImageUrl(cliente);
    if (!imageUrl) {
      return null;
    }

    if (this.descriptorCache.has(imageUrl)) {
      return this.descriptorCache.get(imageUrl) ?? null;
    }

    const descriptor = await this.faceRecognitionService.imageUrlToDescriptor(imageUrl);
    if (descriptor) {
      this.descriptorCache.set(imageUrl, descriptor);
    }
    return descriptor;
  }

  private async getRegisteredDescriptors() {
    const clientes = this.clienteService.getClientes();
    const descriptorsList: Array<{ descriptor: number[]; id: string; nombre: string }> = [];

    for (const cliente of clientes) {
      const descriptor = await this.getDescriptorForClient(cliente);
      if (descriptor) {
        descriptorsList.push({
          descriptor,
          id: cliente.id,
          nombre: cliente.nombre
        });
      }
    }

    return descriptorsList;
  }

  private async matchFaceDescriptor(queryDescriptor: number[]): Promise<any> {
    const descriptorsList = await this.getRegisteredDescriptors();
    if (descriptorsList.length === 0) {
      this.statusMessage = 'No hay clientes registrados con descriptor facial o URL de imagen para comparar';
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

      // Asegurarse que los modelos estén listos y que haya exactamente un rostro detectable
      const modelsReady = await this.faceRecognitionService.waitForModelsLoaded(10000);
      if (!modelsReady) {
        this.statusMessage = 'Modelos no listos para reconocimiento.';
        return;
      }

      const detection = await this.faceRecognitionService.detectFace(canvas);
      if (!detection) {
        this.statusMessage = 'No se detectó rostro en el frame.';
        return;
      }

      const queryDescriptor = await this.faceRecognitionService.generateDescriptor(canvas);
      if (!this.isValidDescriptor(queryDescriptor)) {
        this.statusMessage = 'No se pudo generar descriptor facial (128 dims requeridas). Asegúrate de buena iluminación y posicionamiento.';
        return;
      }

      // Asegurar que el descriptor sea un array JSON de números
      const descriptorPayload = queryDescriptor.map(n => Number(n));

      // Primero intentar coincidencia local usando la tabla de clientes
      const localMatch = await this.matchFaceDescriptor(queryDescriptor);
      if (localMatch) {
        console.debug('Match local encontrado:', localMatch);
        const clientes = this.clienteService.getClientes();
        const matchedCliente = clientes.find(c => c.id === localMatch.id || (c.nombre && c.nombre.trim().toLowerCase() === (localMatch.nombre ?? '').trim().toLowerCase()));
        if (matchedCliente) {
          this.recognitionPhotoUrl = matchedCliente.fotoUrl ?? null;
          this.recognitionResult = {
            cliente: matchedCliente,
            confianza: localMatch.confianza ?? (1 - localMatch.distancia / 1.5),
            distancia: localMatch.distancia ?? NaN
          };
          this.statusMessage = `COINCIDENCIA LOCAL — ${matchedCliente.nombre}`;
          this.toastService.show(`Cliente identificado: ${matchedCliente.nombre}`, 'success');
          // No registrar entrada ni abrir torniquete automáticamente en modo sólo lectura
          return;
        }
      }

      const response = await this.clienteService.recognizeDescriptor(descriptorPayload);
      console.debug('Recognize response:', response);
      if (!response) {
        this.statusMessage = 'Sin respuesta del servicio de reconocimiento (backend).';
        this.recognitionResult = null;
        this.recognitionPhotoUrl = null;
        return;
      }

      this.lastRawResponse = response;

      const payload = response?.cliente ?? response?.data ?? response;
      console.debug('Payload para reconocimiento:', payload);

      const confidence = this.getRecognitionConfidence(response, payload);
      const distance = this.getRecognitionDistance(response, payload);
      if (!this.shouldAcceptRecognition(confidence, distance)) {
        this.statusMessage = 'ACCESO DENEGADO';
        this.recognitionResult = null;
        this.recognitionPhotoUrl = null;
        return;
      }
      const photoUrl = this.resolveRecognitionPhotoUrl(payload) ?? this.resolveRecognitionPhotoUrl(response);
      this.recognitionPhotoUrl = photoUrl;

      const recognizedId = payload.id ?? response?.id ?? payload.user_id ?? response?.user_id ?? this.extractField(response, ['id', 'user.id']);
      const normalizedName = (payload.nombre ?? payload.name ?? this.extractField(response, ['nombre', 'name', 'user.name']))?.toString().trim().toLowerCase();
      const existingCliente = this.clienteService.getClientes().find(cliente =>
        (recognizedId && cliente.id === recognizedId) ||
        (normalizedName && cliente.nombre?.trim().toLowerCase() === normalizedName)
      );
      const clienteReconocido: Cliente = {
        id: payload.id ?? response?.id ?? existingCliente?.id ?? recognizedId ?? '',
        nombre: payload.nombre ?? payload.name ?? existingCliente?.nombre ?? this.extractField(response, ['nombre', 'name', 'user.name']) ?? '',
        cedula: payload.cedula ?? payload.identification ?? existingCliente?.cedula ?? this.extractField(response, ['cedula', 'dni', 'identification']) ?? '',
        celular: payload.celular ?? payload.phone ?? existingCliente?.celular ?? this.extractField(response, ['celular', 'phone']) ?? '',
        fechaRegistro:
          payload.fechaRegistro ?? payload.fecha_registro ?? response?.fechaRegistro ?? response?.fecha_registro ?? existingCliente?.fechaRegistro ?? '',
        tipoPago:
          payload.tipoPago ?? payload.tipo_pago ?? response?.tipoPago ?? response?.tipo_pago ?? existingCliente?.tipoPago ?? '',
        fechaPago:
          payload.fechaPago ?? payload.fecha_pago ?? response?.fechaPago ?? response?.fecha_pago ?? existingCliente?.fechaPago ?? '',
        fechaVencimiento:
          payload.fechaVencimiento ?? payload.fecha_vencimiento ?? payload.fecha_fin ?? response?.fechaVencimiento ?? response?.fecha_vencimiento ?? response?.fecha_fin ?? existingCliente?.fechaVencimiento ?? '',
        historialEntradas:
          payload.historialEntradas ?? payload.historial_entradas ?? response?.historialEntradas ?? response?.historial_entradas ?? existingCliente?.historialEntradas ?? [],
        faceDescriptor: null,
        fotoUrl: photoUrl ?? existingCliente?.fotoUrl ?? '',
        user_id: payload.user_id ?? response?.user_id ?? existingCliente?.user_id ?? ''
      };

      // Fallback: si algunos campos clave vienen vacíos, intentar extraerlos recursivamente
      if (!clienteReconocido.nombre) {
        const f = this.recursiveFind(this.lastRawResponse, ['nombre', 'name', 'cliente.nombre', 'user.name', 'data.nombre']);
        if (f) clienteReconocido.nombre = String(f);
      }
      if (!clienteReconocido.cedula) {
        const f = this.recursiveFind(this.lastRawResponse, ['cedula', 'dni', 'identification', 'cliente.cedula']);
        if (f) clienteReconocido.cedula = String(f);
      }
      if (!clienteReconocido.celular) {
        const f = this.recursiveFind(this.lastRawResponse, ['celular', 'phone', 'telefono', 'cliente.celular']);
        if (f) clienteReconocido.celular = String(f);
      }
      if (!clienteReconocido.fotoUrl) {
        const f = this.recursiveFind(this.lastRawResponse, ['fotoUrl', 'photoUrl', 'foto_url', 'image_url', 'imageUrl']);
        if (f) clienteReconocido.fotoUrl = String(f);
      }

      this.recognitionResult = {
        cliente: clienteReconocido,
        confianza: confidence,
        distancia: distance
      };
      const displayName = clienteReconocido.nombre || clienteReconocido.user_id || 'Desconocido';
      this.statusMessage = `ACCESO PERMITIDO — ${displayName}`;
      this.toastService.show(`¡Bienvenido ${displayName}!`, 'success');

      const now = Date.now();
      const shouldRegister =
        this.recognitionResult.cliente.id && (
          !this.lastRegisteredAt ||
          this.lastRegisteredClienteId !== this.recognitionResult.cliente.id ||
          (now - this.lastRegisteredAt) >= this.autoRegisterCooldownMs
        );

      if (shouldRegister) {
        await this.clienteService.registrarEntrada(this.recognitionResult.cliente.id);
        this.toastService.show(`Entrada registrada para ${this.recognitionResult.cliente.nombre}`, 'success');
        this.statusMessage = `Entrada registrada para ${this.recognitionResult.cliente.nombre}.`;

        await this.openTurnstile();

        this.lastRegisteredClienteId = this.recognitionResult.cliente.id;
        this.lastRegisteredAt = now;
      }
    } catch (error) {
      console.error('Error en reconocimiento:', error);
      this.statusMessage = 'Error durante el reconocimiento facial';
    } finally {
      this.isRecognizing = false;
    }
  }

  private resolveRecognitionPhotoUrl(response: any): string | null {
    return (
      response.fotoUrl ?? response.photoUrl ?? response.foto_url ?? response.photo_url ??
      response.embedding ?? response.embending ?? response.imageUrl ?? response.image_url ?? null
    );
  }

  private extractField(response: any, keys: string[]): any {
    if (!response) return null;
    for (const key of keys) {
      const parts = key.split('.');
      let val: any = response;
      for (const p of parts) {
        if (val == null) { val = null; break; }
        val = val[p];
      }
      if (val != null) return val;

      if (response.cliente) {
        val = response.cliente;
        for (const p of parts) { if (val == null) { val = null; break; } val = val[p]; }
        if (val != null) return val;
      }

      if (response.data) {
        val = response.data;
        for (const p of parts) { if (val == null) { val = null; break; } val = val[p]; }
        if (val != null) return val;
      }
    }
    return null;
  }

  private recursiveFind(obj: any, keys: string[] | string): any {
    const patterns = Array.isArray(keys) ? keys : [keys];
    const queue: any[] = [obj];
    while (queue.length) {
      const cur = queue.shift();
      if (cur == null) continue;
      if (typeof cur === 'object') {
        for (const k of Object.keys(cur)) {
          try {
            // check direct key matches patterns
            for (const p of patterns) {
              if (k === p || k.toLowerCase() === p.toLowerCase()) {
                const val = cur[k];
                if (val != null && (typeof val === 'string' || typeof val === 'number')) return val;
              }
            }
          } catch { /**/ }
          const val = cur[k];
          if (val && typeof val === 'object') queue.push(val);
          if (Array.isArray(val)) queue.push(...val);
        }
      }
    }
    return null;
  }

  private getRecognitionConfidence(response: any, payload: any): number {
    const raw = response?.confianza ?? response?.confidencia ?? response?.confidence ??
      payload?.confianza ?? payload?.confidencia ?? payload?.confidence;
    const parsed = typeof raw === 'string' ? parseFloat(raw) : raw;
    return typeof parsed === 'number' && !isNaN(parsed) ? parsed : NaN;
  }

  private getRecognitionDistance(response: any, payload: any): number {
    const raw = response?.distancia ?? payload?.distancia ?? response?.distance ?? payload?.distance;
    const parsed = typeof raw === 'string' ? parseFloat(raw) : raw;
    return typeof parsed === 'number' && !isNaN(parsed) ? parsed : NaN;
  }

  private shouldAcceptRecognition(confidence: number, distance: number): boolean {
    const hasConfidence = !isNaN(confidence);
    const hasDistance = !isNaN(distance);

    if (hasConfidence && confidence < 0.7) {
      return false;
    }

    if (hasDistance && distance > 0.6) {
      return false;
    }

    return true;
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
    const fecha = new Date(fechaVencimiento);
    if (isNaN(fecha.getTime())) {
      return NaN;
    }
    return this.clienteService.calcularDiasRestantes(fechaVencimiento);
  }

  getStatusClass(dias: number): string {
    if (isNaN(dias)) return 'sin-vencimiento';
    if (dias < 0) return 'vencido';
    if (dias <= 3) return 'proximo';
    return 'vigente';
  }

  getStatusText(dias: number): string {
    if (isNaN(dias)) return 'Sin fecha';
    if (dias < 0) return 'Vencido';
    if (dias === 0) return 'Hoy';
    return `${dias} días`;
  }

  getRemainingDaysText(fechaVencimiento: string): string {
    const dias = this.getDiasRestantes(fechaVencimiento);
    if (isNaN(dias)) return 'Fecha no disponible';
    if (dias < 0) return `Venció hace ${Math.abs(dias)} días`;
    if (dias === 0) return 'Vence hoy';
    return `Faltan ${dias} días`;
  }
}
