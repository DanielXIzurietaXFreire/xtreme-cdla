export interface Cliente {
  id: string;
  nombre: string;
  cedula: string;
  celular: string;
  fechaRegistro: string;
  tipoPago: string;
  fechaPago: string;
  fechaVencimiento: string;
  historialEntradas: string[]; // dates
  faceDescriptor?: number[] | null; // face-api.js descriptor
  user_id?: string;
}

export interface HistorialEntrada {
  clienteId: string;
  fecha: string;
  hora: string;
}
