import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$: Observable<Toast[]> = this.toastsSubject.asObservable();

  show(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000): void {
    const id = Date.now().toString();
    const toast: Toast = {
      id,
      message,
      type,
      duration
    };

    const toasts = this.toastsSubject.value;
    toasts.push(toast);
    this.toastsSubject.next(toasts);

    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  remove(id: string): void {
    const toasts = this.toastsSubject.value.filter(t => t.id !== id);
    this.toastsSubject.next(toasts);
  }
}
