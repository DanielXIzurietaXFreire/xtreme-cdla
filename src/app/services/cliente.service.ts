import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, firstValueFrom, map, of } from 'rxjs';
import { Cliente } from '../models/cliente.model';
import { environment } from '../../environments/environment';

interface RecognizeResponse {
  id?: string;
  nombre?: string;
  cedula?: string;
  celular?: string;
  tipoPago?: string;
  tipo_pago?: string;
  fechaPago?: string;
  fecha_pago?: string;
  fechaVencimiento?: string;
  fecha_vencimiento?: string;
  fecha_fin?: string;
  fechaRegistro?: string;
  fecha_registro?: string;
  historialEntradas?: string[];
  historial_entradas?: string[];
  embending?: string;
  embedding?: string;
  fotoUrl?: string;
  photoUrl?: string;
  foto_url?: string;
  photo_url?: string;
  user_id?: string;
  cliente?: any;
  data?: any;
  confidence?: number;
  confidencia?: number;
  confianza?: number;
  distancia?: number;
}

const API_URL = `${environment.backendUrl}/rest/v1/clientes`;

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private readonly clientesSubject = new BehaviorSubject<Cliente[]>([]);
  public clientes$: Observable<Cliente[]> = this.clientesSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    this.loadClientes();
  }

  private mapDbCliente(cliente: any): Cliente {
    const rawFaceDescriptor = cliente.descriptor ?? cliente.face_descriptor ?? cliente.embedding ?? cliente.embeding ?? cliente.embending ?? null;
    const faceDescriptor = Array.isArray(rawFaceDescriptor) ? rawFaceDescriptor : null;
    return {
      id: cliente.id,
      nombre: cliente.nombre,
      cedula: cliente.cedula,
      celular: cliente.celular,
      fechaRegistro: cliente.fecha_registro ?? cliente.fecha_inicio ?? '',
      tipoPago: cliente.tipo_pago ?? cliente.tipoPago ?? '',
      fechaPago: cliente.fecha_pago ?? cliente.fecha_inicio ?? '',
      fechaVencimiento: cliente.fecha_vencimiento ?? cliente.fecha_fin ?? '',
      historialEntradas: cliente.historial_entradas ?? cliente.historialEntradas ?? [],
      faceDescriptor,
      fotoUrl: cliente.embending ?? cliente.foto_url ?? cliente.photo_url ?? cliente.image_url ?? cliente.fotoUrl ?? cliente.photoUrl ?? '',
      user_id: cliente.user_id
    };
  }

  private loadClientes(): void {
    firstValueFrom(
      this.http.get<any[]>(`${API_URL}?select=*`)
        .pipe(
          map(rows => rows.map((row: any) => this.mapDbCliente(row))),
          catchError(error => {
            console.error('Error cargando clientes desde backend:', error);
            return of([] as Cliente[]);
          })
        )
    ).then(clientes => this.clientesSubject.next(clientes));
  }

  private async executeInsert(payload: Record<string, any>): Promise<Cliente | null> {
    const headers = new HttpHeaders({ Prefer: 'return=representation' });
    const rows = await firstValueFrom(this.http.post<any[]>(API_URL, payload, { headers }));
    const created = rows?.[0] ?? null;
    if (!created) return null;
    const clienteModel = this.mapDbCliente(created);
    this.clientesSubject.next([...this.clientesSubject.value, clienteModel]);
    return clienteModel;
  }

  private async executePatch(id: string, payload: Record<string, any>): Promise<Cliente | null> {
    const headers = new HttpHeaders({ Prefer: 'return=representation' });
    const rows = await firstValueFrom(this.http.patch<any[]>(`${API_URL}?id=eq.${id}`, payload, { headers }));
    const updated = rows?.[0] ?? null;
    if (!updated) return null;
    const clienteModel = this.mapDbCliente(updated);
    this.clientesSubject.next(this.clientesSubject.value.map(c => c.id === id ? clienteModel : c));
    return clienteModel;
  }

  private hasMissingColumnError(error: any, column: string): boolean {
    const message = error?.error?.message || error?.message || '';
    return typeof message === 'string' && message.includes(`"${column}"`);
  }

  private isTipoPagoConstraintError(error: any): boolean {
    const message = error?.error?.message || error?.message || '';
    return typeof message === 'string' && message.includes('clientes_tipo_pago_check');
  }

  private isValidEmbedding(value: any): boolean {
    return Array.isArray(value) && value.length === 128;
  }

  private validateEmbedding(cliente: Record<string, any>): boolean {
    const descriptor = cliente['descriptor'];
    if (descriptor && !this.isValidEmbedding(descriptor)) {
      console.error('Descriptor inválido: debe tener 128 dimensiones.', Array.isArray(descriptor) ? descriptor.length : typeof descriptor, descriptor);
      return false;
    }
    return true;
  }

  async crearClienteBackend(cliente: Record<string, any>): Promise<Cliente | null> {
    if (!this.validateEmbedding(cliente)) {
      return null;
    }

    return this.tryInsertWithFallbacks(cliente);
  }

  private async tryInsertWithFallbacks(cliente: Record<string, any>): Promise<Cliente | null> {
    try {
      return await this.executeInsert(cliente);
    } catch (error: any) {
      return await this.handleCreateError(error, cliente);
    }
  }

  private async handleCreateError(error: any, cliente: Record<string, any>): Promise<Cliente | null> {
    if (this.hasMissingColumnError(error, 'face_descriptor')) {
      console.warn('Backend schema does not include face_descriptor; retrying without it.');
      const payload = { ...cliente };
      delete payload['face_descriptor'];
      return await this.executeInsert(payload);
    }

    if (this.isTipoPagoConstraintError(error) && typeof cliente['tipo_pago'] === 'string') {
      console.warn('Backend tipo_pago check failed; normalizing to lowercase and retrying.');
      const payload = { ...cliente, tipo_pago: cliente['tipo_pago'].toLowerCase() };
      return await this.executeInsert(payload);
    }

    if (this.hasMissingColumnError(error, 'embedding') || this.hasMissingColumnError(error, 'descriptor') || this.hasMissingColumnError(error, 'fecha_inicio') || this.hasMissingColumnError(error, 'fecha_fin')) {
      console.warn('Backend schema mismatch detected; retrying with legacy cliente schema.');
      const payload = { ...cliente };
      if (payload['embedding']) {
        payload['face_descriptor'] = payload['embedding'];
        delete payload['embedding'];
      }
      if (payload['descriptor']) {
        payload['face_descriptor'] = payload['descriptor'];
        delete payload['descriptor'];
      }
      if (payload['fecha_inicio']) {
        payload['fecha_registro'] = payload['fecha_inicio'];
        payload['fecha_pago'] = payload['fecha_inicio'];
        delete payload['fecha_inicio'];
      }
      if (payload['fecha_fin']) {
        payload['fecha_vencimiento'] = payload['fecha_fin'];
        delete payload['fecha_fin'];
      }
      return await this.executeInsert(payload);
    }

    console.error('Error creando cliente en backend:', error);
    return null;
  }

  async actualizarClienteBackend(id: string, actualizado: Record<string, any>): Promise<Cliente | null> {
    return this.tryPatchWithFallbacks(id, actualizado);
  }

  private async tryPatchWithFallbacks(id: string, actualizado: Record<string, any>): Promise<Cliente | null> {
    try {
      return await this.executePatch(id, actualizado);
    } catch (error: any) {
      return await this.handleUpdateError(id, error, actualizado);
    }
  }

  private async handleUpdateError(id: string, error: any, actualizado: Record<string, any>): Promise<Cliente | null> {
    if (this.hasMissingColumnError(error, 'face_descriptor')) {
      console.warn('Backend schema does not include face_descriptor; retrying update without it.');
      const payload = { ...actualizado };
      delete payload['face_descriptor'];
      return await this.executePatch(id, payload);
    }

    if (this.isTipoPagoConstraintError(error) && typeof actualizado['tipo_pago'] === 'string') {
      console.warn('Backend tipo_pago check failed; normalizing to lowercase and retrying update.');
      const payload = { ...actualizado, tipo_pago: actualizado['tipo_pago'].toLowerCase() };
      return await this.executePatch(id, payload);
    }

    if (this.hasMissingColumnError(error, 'embedding') || this.hasMissingColumnError(error, 'descriptor') || this.hasMissingColumnError(error, 'fecha_inicio') || this.hasMissingColumnError(error, 'fecha_fin')) {
      console.warn('Backend schema mismatch detected; retrying update with legacy cliente schema.');
      const payload = { ...actualizado };
      if (payload['embedding']) {
        payload['face_descriptor'] = payload['embedding'];
        delete payload['embedding'];
      }
      if (payload['descriptor']) {
        payload['face_descriptor'] = payload['descriptor'];
        delete payload['descriptor'];
      }
      if (payload['fecha_inicio']) {
        payload['fecha_pago'] = payload['fecha_inicio'];
        delete payload['fecha_inicio'];
      }
      if (payload['fecha_fin']) {
        payload['fecha_vencimiento'] = payload['fecha_fin'];
        delete payload['fecha_fin'];
      }
      return await this.executePatch(id, payload);
    }

    console.error('Error actualizando cliente en backend:', error);
    return null;
  }

  eliminarClienteBackend(id: string): Promise<boolean> {
    const headers = new HttpHeaders({ Prefer: 'return=representation' });
    return firstValueFrom(
      this.http.delete<any[]>(`${API_URL}?id=eq.${id}`, { headers })
        .pipe(
          map(rows => {
            if (!rows || rows.length === 0) return false;
            this.clientesSubject.next(this.clientesSubject.value.filter(c => c.id !== id));
            return true;
          }),
          catchError(error => {
            console.error('Error eliminando cliente en backend:', error);
            return of(false);
          })
        )
    );
  }

  getClientes(): Cliente[] {
    return this.clientesSubject.value;
  }

  buscarPorCedula(cedula: string): Cliente | undefined {
    return this.getClientes().find(c => c.cedula === cedula);
  }

  buscarPorNombre(nombre: string): Cliente[] {
    const term = nombre.toLowerCase();
    return this.getClientes().filter(c =>
      c.nombre.toLowerCase().includes(term) ||
      c.cedula.includes(term) ||
      c.celular.includes(term)
    );
  }

  async uploadPhoto(file: File, itemId: string): Promise<string | null> {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('itemId', itemId);

    try {
      const response = await firstValueFrom(this.http.post<{ url: string }>(`${environment.backendUrl}/api/upload-photo`, formData));
      const url = response?.url ?? null;
      if (!url) {
        return null;
      }

      const clienteActualizado = await this.updateClientePhotoUrl(itemId, url);
      if (!clienteActualizado) {
        return null;
      }

      return url;
    } catch (error) {
      console.error('Error subiendo foto:', error);
      return null;
    }
  }

  private async updateClientePhotoUrl(id: string, url: string): Promise<Cliente | null> {
    try {
      const updated = await firstValueFrom(this.http.put<any>(`${environment.backendUrl}/api/clientes/${id}/photo-url`, { photoUrl: url }));
      const clienteModel = this.mapDbCliente(updated);
      this.clientesSubject.next(this.clientesSubject.value.map(c => c.id === id ? clienteModel : c));
      return clienteModel;
    } catch (error) {
      console.error('Error guardando photoUrl en cliente:', error);
      return null;
    }
  }

  async recognizeDescriptor(descriptor: number[]): Promise<RecognizeResponse | null> {
    try {
      return await firstValueFrom(this.http.post<RecognizeResponse>(`${environment.backendUrl}/recognize`, { descriptor }));
    } catch (error) {
      console.error('Error en reconocimiento backend:', error);
      return null;
    }
  }

  async registrarEntrada(clienteId: string): Promise<void> {
    const cliente = this.getClientes().find(c => c.id === clienteId);
    if (!cliente) return;

    const ahora = new Date().toISOString();
    const historialEntradas = [...cliente.historialEntradas, ahora];

    const nuevaFecha = new Date(cliente.fechaVencimiento);
    if (cliente.tipoPago === 'diario') {
      nuevaFecha.setDate(nuevaFecha.getDate() + 1);
    } else if (cliente.tipoPago === 'mensual') {
      nuevaFecha.setDate(nuevaFecha.getDate() + 30);
    }

    await this.actualizarClienteBackend(clienteId, {
      historial_entradas: historialEntradas,
      fecha_vencimiento: nuevaFecha.toISOString().split('T')[0]
    });
  }

  calcularDiasRestantes(fechaVencimiento: string): number {
    const vencimiento = new Date(fechaVencimiento);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    vencimiento.setHours(0, 0, 0, 0);
    const diferencia = vencimiento.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }

  obtenerFechaActual(): string {
    return new Date().toISOString().split('T')[0];
  }

  calcularVencimiento(fechaPago: string, tipoPago: string): string {
    const fecha = new Date(fechaPago);
    switch (tipoPago.toLowerCase()) {
      case 'diario':
        fecha.setDate(fecha.getDate() + 1);
        break;
      case 'mensual':
        fecha.setDate(fecha.getDate() + 30);
        break;
      case 'trimestral':
        fecha.setDate(fecha.getDate() + 90);
        break;
      case 'semestral':
        fecha.setDate(fecha.getDate() + 180);
        break;
      case 'anual':
        fecha.setDate(fecha.getDate() + 365);
        break;
      default:
        fecha.setDate(fecha.getDate() + 1);
    }
    return fecha.toISOString().split('T')[0];
  }
}
