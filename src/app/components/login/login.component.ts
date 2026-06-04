import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  async onLogin(event?: Event): Promise<void> {
    if (event) {
      event.preventDefault();
    }

    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor completa tu email y contraseña';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const result = await this.authService.login(this.email, this.password);
      if (result) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'Email o contraseña incorrectos. Verifica tus datos.';
      }
    } catch {
      this.errorMessage = 'Error en el login. Intenta nuevamente.';
    } finally {
      this.isLoading = false;
    }
  }
}
