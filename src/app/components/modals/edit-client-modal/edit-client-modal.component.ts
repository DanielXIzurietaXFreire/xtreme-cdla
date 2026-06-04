import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ClienteService } from '../../../services/cliente.service';
import { Cliente } from '../../../models/cliente.model';
import { FaceRecognitionService } from '../../../services/face-recognition.service';
import { CameraPhotoComponent } from '../../camera-photo/camera-photo.component';

@Component({
  selector: 'app-edit-client-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CameraPhotoComponent],
  templateUrl: './edit-client-modal.component.html',
  styleUrls: ['./edit-client-modal.component.scss']
})
export class EditClientModalComponent implements OnInit, OnDestroy {
  @Input() cliente!: Cliente;
  @Output() clienteActualizado = new EventEmitter<void>();
  @Output() closeModal = new EventEmitter<void>();

  form!: FormGroup;
  isSubmitting: boolean = false;
  fotoCapturada: string = '';
  faceDescriptor: number[] | null = null;
  fechaVencimiento: string = '';
  private tipoPagoSubscription: Subscription | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly clienteService: ClienteService,
    private readonly faceRecognitionService: FaceRecognitionService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    if (this.cliente) {
      this.form.patchValue({
        nombre: this.cliente.nombre,
        celular: this.cliente.celular,
        tipoPago: this.cliente.tipoPago,
        fechaPago: this.cliente.fechaPago
      });
      this.calcularFechaVencimiento();
    }

    this.listenTipoPagoChanges();
  }

  ngOnDestroy(): void {
    this.tipoPagoSubscription?.unsubscribe();
  }

  private initForm(): void {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      celular: ['', [Validators.required, Validators.minLength(7)]],
      tipoPago: ['diario', Validators.required],
      fechaPago: ['', Validators.required]
    });
  }

  private listenTipoPagoChanges(): void {
    const tipoPagoControl = this.form.get('tipoPago');
    const fechaPagoControl = this.form.get('fechaPago');
    
    if (!tipoPagoControl || !fechaPagoControl) {
      return;
    }

    this.tipoPagoSubscription = tipoPagoControl.valueChanges.subscribe(() => {
      const today = this.formatDate(new Date());
      this.form.patchValue({ fechaPago: today }, { emitEvent: false });
      this.calcularFechaVencimiento();
    });

    fechaPagoControl.valueChanges.subscribe(() => {
      this.calcularFechaVencimiento();
    });
  }

  private calcularFechaVencimiento(): void {
    const fechaPago = this.form.get('fechaPago')?.value;
    const tipoPago = this.form.get('tipoPago')?.value;
    
    if (fechaPago && tipoPago) {
      this.fechaVencimiento = this.clienteService.calcularVencimiento(fechaPago, tipoPago);
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.isSubmitting = true;
    try {
      const formValue = this.form.value;
      const fechaPago = formValue.fechaPago;
      const tipoPago = formValue.tipoPago;
      const fechaVencimiento = this.clienteService.calcularVencimiento(fechaPago, tipoPago);

      const actualizado: Record<string, any> = {
        nombre: formValue.nombre,
        celular: formValue.celular,
        tipo_pago: tipoPago,
        fecha_inicio: fechaPago,
        fecha_fin: fechaVencimiento
      };

      if (this.faceDescriptor) {
        actualizado['embedding'] = this.faceDescriptor;
      }

      const clienteActualizado = await this.clienteService.actualizarClienteBackend(this.cliente.id, actualizado);
      if (clienteActualizado) {
        this.clienteActualizado.emit();
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  async onFotoCapturada(foto: string): Promise<void> {
    this.fotoCapturada = foto;
    this.faceDescriptor = await this.faceRecognitionService.imageToDescriptor(foto);
  }

  onClose(): void {
    this.closeModal.emit();
  }
}
