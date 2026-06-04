import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClienteService } from '../../../services/cliente.service';
import { Cliente } from '../../../models/cliente.model';

@Component({
  selector: 'app-delete-client-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-client-modal.component.html',
  styleUrls: ['./delete-client-modal.component.scss']
})
export class DeleteClientModalComponent {
  @Input() cliente!: Cliente;
  @Output() clienteEliminado = new EventEmitter<void>();
  @Output() closeModal = new EventEmitter<void>();

  isSubmitting: boolean = false;

  constructor(private readonly clienteService: ClienteService) {}

  async onConfirmDelete(): Promise<void> {
    this.isSubmitting = true;
    const eliminado = await this.clienteService.eliminarClienteBackend(this.cliente.id);
    if (eliminado) {
      this.clienteEliminado.emit();
    }
    this.isSubmitting = false;
  }

  onClose(): void {
    this.closeModal.emit();
  }
}
