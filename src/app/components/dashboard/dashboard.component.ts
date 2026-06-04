import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ClienteService } from '../../services/cliente.service';
import { RegisterClientComponent } from '../register-client/register-client.component';
import { ClientsListComponent } from '../clients-list/clients-list.component';

import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RegisterClientComponent,
    ClientsListComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  sidebarOpen: boolean = false;
  currentTab: 'register' | 'clients' | 'face-recognition' = 'register';
  
  constructor(
    private authService: AuthService,
    private clienteService: ClienteService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  selectTab(tab: 'register' | 'clients' | 'face-recognition'): void {
    // Si el usuario quiere ver el escáner, lo abrimos en una ventana aparte.
    if (tab === 'face-recognition') {
      this.openScannerInNewWindow();
      this.currentTab = tab;
      this.sidebarOpen = false;
      return;
    }

    this.currentTab = tab;
    this.sidebarOpen = false;
  }

  private openScannerInNewWindow(): void {
    // Nota: El SO/navegador decide en qué monitor abrir el popup.
    // Para evitar bloqueos por popup, solo se ejecuta desde un click.
    const url = '/scanner-window';
    const win = window.open(url, 'scanner-window', 'noopener,noreferrer');
    if (!win) {
      this.toastService.show('Pop-up bloqueado. Permite ventanas emergentes para el escáner.', 'error');
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout(): void {
    this.authService.logout();
    this.toastService.show('Sesión cerrada', 'success');
    this.router.navigate(['/login']);
  }

  getTabTitle(): string {
    switch (this.currentTab) {
      case 'register':
        return 'Registrar nuevo cliente';
      case 'clients':
        return 'Lista de clientes';
      case 'face-recognition':
        return 'Escáner de rostro';
      default:
        return 'Dashboard';
    }
  }
}
