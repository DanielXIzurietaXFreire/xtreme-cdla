import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './services/auth.guard';
import { ScannerWindowComponent } from './components/scanner-window/scanner-window.component';


export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'scanner-window',
    component: ScannerWindowComponent,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '/login' }
];
