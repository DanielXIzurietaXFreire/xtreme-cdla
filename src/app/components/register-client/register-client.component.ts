import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidationErrors } from '@angular/forms';
import { ClienteService } from '../../services/cliente.service';
import { ToastService } from '../../services/toast.service';
import { FaceRecognitionService } from '../../services/face-recognition.service';
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
  }

  private isValidFaceDescriptor(descriptor: number[] | null): descriptor is number[] {
    return Array.isArray(descriptor) && descriptor.length === 128;
  }

  private async waitForFaceRecognitionModels(): Promise<boolean> {
    const loaded = await this.faceRecognitionService.waitForModelsLoaded(10000);
    if (!loaded) {
      this.toastService.show('Los modelos de reconocimiento facial no están listos aún. Espera unos segundos y vuelve a intentarlo.', 'error');
    }
    return loaded;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || !this.fotoCapturada) {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
      }
      this.toastService.show('Por favor completa todos los campos con valores válidos y captura una foto', 'error');
      return;
    }

    if (!(await this.waitForFaceRecognitionModels())) {
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
      const fechaVencimiento = this.clienteService.calcularVencimiento(fechaPago, tipoPago);

      const faceDescriptor = this.fotoCapturada
        ? await this.faceRecognitionService.imageToDescriptor(this.fotoCapturada)
        : null;

      if (!this.isValidFaceDescriptor(faceDescriptor)) {
        this.toastService.show('No se pudo generar un descriptor facial válido. Asegúrate de tomar una foto clara y vuelve a intentarlo.', 'error');
        console.error('Descriptor facial inválido o nulo:', faceDescriptor);
        return;
      }

      const nuevoClienteBackend = {
        nombre: formValue.nombre,
        cedula: formValue.cedula,
        celular: formValue.celular,
        fecha_inicio: fechaPago,
        fecha_fin: fechaVencimiento,
        tipo_pago: tipoPago,
        embedding: faceDescriptor
      };

      const clienteCreado = await this.clienteService.crearClienteBackend(nuevoClienteBackend);
      if (!clienteCreado) {
        this.toastService.show('Error al registrar el cliente en el servidor', 'error');
        return;
      }

      this.toastService.show('Cliente registrado exitosamente ✓', 'success');

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
    return 'Por favor ingresa un valor válido';
  }

  onFotoCapturada(foto: string): void {
    this.fotoCapturada = foto;
  }

  get isFormValid(): boolean {
    return this.form.valid && this.fotoCapturada !== '';
  }
}
