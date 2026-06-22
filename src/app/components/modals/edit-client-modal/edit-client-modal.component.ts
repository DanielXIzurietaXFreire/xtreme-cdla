import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ClienteService } from '../../../services/cliente.service';
import { ToastService } from '../../../services/toast.service';
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
  fotoUrl: string = '';
  fechaVencimiento: string = '';
  faceDescriptor: number[] | null = null;
  private tipoPagoSubscription: Subscription | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly clienteService: ClienteService,
    private readonly toastService: ToastService,
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
      this.fechaVencimiento = this.cliente.fechaVencimiento || this.clienteService.calcularVencimiento(this.cliente.fechaPago, this.cliente.tipoPago);
      this.fotoUrl = this.cliente.fotoUrl || '';
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
      numeroMeses: [1, [Validators.required, Validators.min(1)]],
      fechaPago: ['', Validators.required]
    });
  }

  private listenTipoPagoChanges(): void {
    const tipoPagoControl = this.form.get('tipoPago');
    const fechaPagoControl = this.form.get('fechaPago');
    const numeroMesesControl = this.form.get('numeroMeses');
    if (!tipoPagoControl || !fechaPagoControl || !numeroMesesControl) {
      return;
    }

    this.tipoPagoSubscription = tipoPagoControl.valueChanges.subscribe(() => {
      const today = this.formatDate(new Date());
      this.form.patchValue({ fechaPago: today }, { emitEvent: false });
      this.updateNumeroMesesValidators();
      this.calcularFechaVencimiento();
    });

    fechaPagoControl.valueChanges.subscribe(() => {
      this.calcularFechaVencimiento();
    });

    numeroMesesControl.valueChanges.subscribe(() => {
      if (tipoPagoControl.value === 'mensual') {
        this.calcularFechaVencimiento();
      }
    });

    this.updateNumeroMesesValidators();
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private updateNumeroMesesValidators(): void {
    const tipoPago = this.form.get('tipoPago')?.value;
    const numeroMesesControl = this.form.get('numeroMeses');
    if (!numeroMesesControl) {
      return;
    }

    if (tipoPago === 'mensual') {
      numeroMesesControl.enable({ emitEvent: false });
      numeroMesesControl.setValidators([Validators.required, Validators.min(1)]);
    } else {
      numeroMesesControl.setValue(1, { emitEvent: false });
      numeroMesesControl.disable({ emitEvent: false });
      numeroMesesControl.clearValidators();
    }
    numeroMesesControl.updateValueAndValidity({ emitEvent: false });
  }

  private calcularFechaVencimiento(): void {
    const fechaPago = this.form.get('fechaPago')?.value;
    const tipoPago = this.form.get('tipoPago')?.value;
    const numeroMeses = this.form.get('numeroMeses')?.value ?? 1;

    if (fechaPago && tipoPago) {
      this.fechaVencimiento = this.clienteService.calcularVencimiento(fechaPago, tipoPago, numeroMeses);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.show('Por favor completa todos los campos correctamente', 'error');
      return;
    }

    this.isSubmitting = true;
    try {
      const formValue = this.form.value;
      const fechaPago = formValue.fechaPago;
      const tipoPago = formValue.tipoPago;
      const numeroMeses = formValue.numeroMeses ?? 1;
      const fechaVencimiento = this.clienteService.calcularVencimiento(fechaPago, tipoPago, numeroMeses);

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
        this.toastService.show('Cliente actualizado exitosamente ✓', 'success');
        this.clienteActualizado.emit();
      } else {
        this.toastService.show('Error al actualizar el cliente en el servidor', 'error');
      }
    } catch (error) {
      console.error('Error actualizando cliente:', error);
      this.toastService.show('Error al actualizar el cliente', 'error');
    } finally {
      this.isSubmitting = false;
    }
  }

  async onFotoCapturada(foto: string): Promise<void> {
    this.fotoCapturada = foto;
    this.fotoUrl = '';
    this.faceDescriptor = await this.faceRecognitionService.imageToDescriptor(foto);
  }

  onClose(): void {
    this.closeModal.emit();
  }
}
