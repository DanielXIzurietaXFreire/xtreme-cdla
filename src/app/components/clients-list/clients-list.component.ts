import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClienteService } from '../../services/cliente.service';
import { ToastService } from '../../services/toast.service';
import { Cliente } from '../../models/cliente.model';
import { EditClientModalComponent } from '../modals/edit-client-modal/edit-client-modal.component';
import { DeleteClientModalComponent } from '../modals/delete-client-modal/delete-client-modal.component';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, EditClientModalComponent, DeleteClientModalComponent],
  templateUrl: './clients-list.component.html',
  styleUrls: ['./clients-list.component.scss']
})
export class ClientsListComponent implements OnInit {
  clientes: Cliente[] = [];
  filteredClientes: Cliente[] = [];
  searchTerm: string = '';
  showEditModal: boolean = false;
  showDeleteModal: boolean = false;
  selectedCliente: Cliente | null = null;

  constructor(
    private clienteService: ClienteService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadClientes();
  }

  private loadClientes(): void {
    this.clienteService.clientes$.subscribe(clientes => {
      this.clientes = clientes;
      this.filterClientes();
    });
  }

  filterClientes(): void {
    if (!this.searchTerm) {
      this.filteredClientes = this.clientes;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredClientes = this.clientes.filter(c =>
        c.nombre.toLowerCase().includes(term) ||
        c.cedula.includes(term) ||
        c.celular.includes(term)
      );
    }
  }

  onSearchChange(): void {
    this.filterClientes();
  }

  openEditModal(cliente: Cliente): void {
    this.selectedCliente = cliente;
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedCliente = null;
  }

  onClienteActualizado(): void {
    this.closeEditModal();
    this.toastService.show('Cliente actualizado exitosamente ✓', 'success');
  }

  openDeleteModal(cliente: Cliente): void {
    this.selectedCliente = cliente;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedCliente = null;
  }

  onClienteEliminado(): void {
    this.closeDeleteModal();
    this.toastService.show('Cliente eliminado correctamente', 'success');
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
