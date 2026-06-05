import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, firstValueFrom, map, of } from 'rxjs';

interface AuthResponse {
  access_token?: string;
  token?: string;
  success?: boolean;
  [key: string]: any;
}

interface AuthStorage {
  email: string;
  token: string;
  loginTime: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly authUrl = 'http://localhost:3000/auth/v1/token?grant_type=password';
  private readonly sessionDurationMs = 4 * 60 * 60 * 1000; // 4 horas
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(this.checkAuth());
  public isAuthenticated$: Observable<boolean> = this.isAuthenticatedSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Promise<boolean> {
    return firstValueFrom(
      this.http.post<AuthResponse>(this.authUrl, { email, password })
        .pipe(
          map(response => {
            const token = response?.access_token ?? response?.token;
            if (token) {
              localStorage.setItem('xtremeGymAuth', JSON.stringify({
                email,
                token,
                loginTime: new Date().toISOString()
              }));
              this.isAuthenticatedSubject.next(true);
              return true;
            }
            return false;
          }),
          catchError(() => of(false))
        )
    );
  }

  logout(): void {
    localStorage.removeItem('xtremeGymAuth');
    this.isAuthenticatedSubject.next(false);
  }

  private getAuthStorage(): AuthStorage | null {
    const raw = localStorage.getItem('xtremeGymAuth');
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthStorage;
    } catch {
      return null;
    }
  }

  private isSessionExpired(storage: AuthStorage | null): boolean {
    if (!storage?.loginTime) {
      return true;
    }

    const loginDate = new Date(storage.loginTime);
    if (Number.isNaN(loginDate.getTime())) {
      return true;
    }

    return Date.now() - loginDate.getTime() >= this.sessionDurationMs;
  }

  private checkAuth(): boolean {
    const storage = this.getAuthStorage();
    if (!storage) {
      return false;
    }

    if (this.isSessionExpired(storage)) {
      this.logout();
      return false;
    }

    return Boolean(storage.token);
  }

  isAuthenticated(): boolean {
    return this.checkAuth();
  }
}
