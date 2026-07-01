import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidationErrors } from '@angular/forms';
import { ClienteService } from '../../services/cliente.service';
import { FaceRecognitionService } from '../../services/face-recognition.service';
import { ToastService } from '../../services/toast.service';
import { CameraPhotoComponent } from '../camera-photo/camera-photo.component';

@Component({
  selector: 'app-register-client',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CameraPhotoComponent],
  templateUrl: './register-client.component.html',
  styleUrls: ['./register-client.component.scss']
})
export class RegisterClientComponent implements OnInit {
  form!: FormGroup;
  isSubmitting: boolean = false;
  fotoCapturada: string = '';
  fotoFile: File | null = null;
  fotoUrl: string = '';
  fechaVencimiento: string = '';

  @ViewChild(CameraPhotoComponent) cameraComponent!: CameraPhotoComponent;

  constructor(
    private readonly fb: FormBuilder,
    private readonly clienteService: ClienteService,
    private readonly toastService: ToastService,
    private readonly faceRecognitionService: FaceRecognitionService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.setTodayDate();
    this.form.get('cedula')?.valueChanges.subscribe(() => {
      const cedulaControl = this.form.get('cedula');
      if (cedulaControl?.hasError('duplicate')) {
        const errors: ValidationErrors = { ...cedulaControl.errors };
        delete errors['duplicate'];
        cedulaControl.setErrors(Object.keys(errors).length ? errors : null);
      }
    });
    this.listenTipoPagoChanges();
  }

  private initForm(): void {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      cedula: ['', [
        Validators.required,
        Validators.pattern(/^\d{10}$/)
      ]],
      celular: ['', [
        Validators.required,
        Validators.pattern(/^09\d{8}$/)
      ]],
      tipoPago: ['diario', Validators.required],
      numeroMeses: [1, [Validators.required, Validators.min(1)]],
      fechaPago: ['', Validators.required]
    });
  }

  private disableFormControls(): void {
    this.form.disable({ emitEvent: false });
  }

  private enableFormControls(): void {
    this.form.enable({ emitEvent: false });
  }

  private setTodayDate(): void {
    const today = this.clienteService.obtenerFechaActual();
    this.form.patchValue({ fechaPago: today });
    this.calcularFechaVencimiento();
  }

  private listenTipoPagoChanges(): void {
    const tipoPagoControl = this.form.get('tipoPago');
    const fechaPagoControl = this.form.get('fechaPago');
    const numeroMesesControl = this.form.get('numeroMeses');
    
    if (!tipoPagoControl || !fechaPagoControl || !numeroMesesControl) {
      return;
    }

    tipoPagoControl.valueChanges.subscribe(() => {
      const today = this.clienteService.obtenerFechaActual();
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
    
    if (fechaPago && tipoPago) {
      const numeroMeses = this.form.get('numeroMeses')?.value ?? 1;
      this.fechaVencimiento = this.clienteService.calcularVencimiento(fechaPago, tipoPago, numeroMeses);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || !this.fotoCapturada) {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
      }
      this.toastService.show('Por favor completa todos los campos con valores válidos y captura una foto', 'error');
      return;
    }

    // Validar cédula única
    const cedula = this.form.get('cedula')?.value;
    if (this.clienteService.buscarPorCedula(cedula)) {
      this.form.get('cedula')?.setErrors({ duplicate: true });
      this.toastService.show('La cédula ya está registrada en el sistema', 'error');
      return;
    }

    this.isSubmitting = true;
    this.disableFormControls();

    try {
      const formValue = this.form.value;
      const fechaPago = formValue.fechaPago;
      const tipoPago = formValue.tipoPago;
      const numeroMeses = formValue.numeroMeses ?? 1;
      const fechaVencimiento = this.clienteService.calcularVencimiento(fechaPago, tipoPago, numeroMeses);

      const nuevoClienteBackend: Record<string, any> = {
        nombre: formValue.nombre,
        cedula: formValue.cedula,
        celular: formValue.celular,
        fecha_inicio: fechaPago,
        fecha_fin: fechaVencimiento,
        tipo_pago: tipoPago
      };

      // Generar descriptor facial (128 dims) y enviar sólo el descriptor en el JSON.
      if (this.fotoCapturada) {
        try {
          const modelsReady = await this.faceRecognitionService.waitForModelsLoaded(10000);
          if (modelsReady) {
            const descriptor = await this.faceRecognitionService.imageToDescriptor(this.fotoCapturada);
            if (Array.isArray(descriptor) && descriptor.length === 128) {
              nuevoClienteBackend['descriptor'] = descriptor;
            } else {
              console.warn('Descriptor inválido al crear cliente: debe tener 128 dimensiones.', Array.isArray(descriptor) ? descriptor.length : typeof descriptor);
              this.toastService.show('Error procesando la foto: descriptor facial inválido.', 'error');
              this.isSubmitting = false;
              this.enableFormControls();
              return;
            }
          } else {
            console.warn('Modelos de reconocimiento no listos al crear cliente');
            this.toastService.show('Los modelos de reconocimiento facial no se cargaron. Intenta nuevamente.', 'error');
            this.isSubmitting = false;
            this.enableFormControls();
            return;
          }
        } catch (err) {
          console.error('Error generando descriptor para cliente:', err);
          this.toastService.show('Error procesando la foto. Intenta nuevamente.', 'error');
          this.isSubmitting = false;
          this.enableFormControls();
          return;
        }
      }

      const clienteCreado = await this.clienteService.crearClienteBackend(nuevoClienteBackend);
      if (!clienteCreado) {
        this.toastService.show('Error al registrar el cliente en el servidor', 'error');
        return;
      }

      const selectedPhotoFile = this.cameraComponent?.getSelectedPhotoFile() ?? this.fotoFile;
      if (selectedPhotoFile && clienteCreado.id) {
        const uploadedUrl = await this.clienteService.uploadPhoto(selectedPhotoFile, clienteCreado.id);
        if (!uploadedUrl) {
          this.toastService.show('Cliente registrado, pero la foto no se pudo subir.', 'info');
        }
      }

      const torniqueteAbierto = await this.openTurnstile();
      if (torniqueteAbierto) {
        this.toastService.show('Cliente registrado exitosamente ✓ Torniquete abierto.', 'success');
      } else {
        this.toastService.show('Cliente registrado exitosamente ✓ No se pudo abrir el torniquete.', 'info');
      }

      this.resetForm();
    } catch (error) {
      console.error('Error registrando cliente:', error);
      this.toastService.show('Error al registrar el cliente', 'error');
    } finally {
      this.isSubmitting = false;
      this.enableFormControls();
    }
  }

  resetForm(): void {
    this.form.reset();
    this.fotoCapturada = '';
    this.fotoFile = null;
    if (this.cameraComponent) {
      this.cameraComponent.reset();
    }
    this.setTodayDate();
  }

  getFieldError(controlName: string): string | null {
    const control = this.form.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return null;
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio';
    }
    if (controlName === 'cedula') {
      if (control.errors['pattern']) {
        return 'La cédula debe tener 10 dígitos numéricos';
      }
      if (control.errors['duplicate']) {
        return 'Esta cédula ya está registrada';
      }
    }
    if (controlName === 'celular') {
      if (control.errors['pattern']) {
        return 'El celular debe ser un número válido de 10 dígitos que comience con 09';
      }
    }
    if (controlName === 'numeroMeses') {
      if (control.errors['required']) {
        return 'Debes ingresar la cantidad de meses';
      }
      if (control.errors['min']) {
        return 'El número de meses debe ser al menos 1';
      }
    }
    return 'Por favor ingresa un valor válido';
  }

  private async openTurnstile(): Promise<boolean> {
    try {
      const response = await fetch('https://torniqueteapi.uk/abrir', {
        method: 'GET',
        mode: 'cors'
      });
      if (!response.ok) {
        console.warn('No se pudo abrir el torniquete:', response.status, response.statusText);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error llamando al torniquete:', error);
      return false;
    }
  }

  onFotoCapturada(foto: string): void {
    this.fotoCapturada = foto;
    this.fotoFile = this.cameraComponent?.getSelectedPhotoFile() ?? null;
    this.fotoUrl = '';
  }

  get isFormValid(): boolean {
    return this.form.valid && this.fotoCapturada !== '';
  }
}
