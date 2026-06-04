# 📦 Estructura del Proyecto - Guía Visual

```
xtreme/
│
├── src/                           # Código fuente principal
│   ├── app/
│   │   ├── components/            # Componentes UI
│   │   │   ├── login/
│   │   │   │   ├── login.component.ts
│   │   │   │   ├── login.component.html
│   │   │   │   └── login.component.scss
│   │   │   │
│   │   │   ├── dashboard/         # Contenedor principal
│   │   │   │   ├── dashboard.component.ts
│   │   │   │   ├── dashboard.component.html
│   │   │   │   └── dashboard.component.scss
│   │   │   │
│   │   │   ├── register-client/   # Registro de clientes
│   │   │   │   ├── register-client.component.ts
│   │   │   │   ├── register-client.component.html
│   │   │   │   └── register-client.component.scss
│   │   │   │
│   │   │   ├── clients-list/      # Lista de clientes
│   │   │   │   ├── clients-list.component.ts
│   │   │   │   ├── clients-list.component.html
│   │   │   │   └── clients-list.component.scss
│   │   │   │
│   │   │   ├── face-recognition/  # Escáner facial
│   │   │   │   ├── face-recognition.component.ts
│   │   │   │   ├── face-recognition.component.html
│   │   │   │   └── face-recognition.component.scss
│   │   │   │
│   │   │   ├── camera-photo/      # Captura de fotos
│   │   │   │   ├── camera-photo.component.ts
│   │   │   │   ├── camera-photo.component.html
│   │   │   │   └── camera-photo.component.scss
│   │   │   │
│   │   │   ├── toast-container/   # Notificaciones
│   │   │   │   ├── toast-container.component.ts
│   │   │   │   ├── toast-container.component.html
│   │   │   │   └── toast-container.component.scss
│   │   │   │
│   │   │   └── modals/            # Modales personalizados
│   │   │       ├── edit-client-modal/
│   │   │       │   ├── edit-client-modal.component.ts
│   │   │       │   ├── edit-client-modal.component.html
│   │   │       │   └── edit-client-modal.component.scss
│   │   │       │
│   │   │       └── delete-client-modal/
│   │   │           ├── delete-client-modal.component.ts
│   │   │           ├── delete-client-modal.component.html
│   │   │           └── delete-client-modal.component.scss
│   │   │
│   │   ├── models/                # Modelos de datos
│   │   │   └── cliente.model.ts   # Interfaz Cliente
│   │   │
│   │   ├── services/              # Servicios compartidos
│   │   │   ├── auth.service.ts              # Autenticación
│   │   │   ├── cliente.service.ts          # CRUD Clientes
│   │   │   ├── face-recognition.service.ts # Reconocimiento facial
│   │   │   ├── toast.service.ts            # Notificaciones
│   │   │   └── auth.guard.ts               # Protección de rutas
│   │   │
│   │   ├── app.component.ts       # Root component
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   ├── app.routes.ts          # Configuración de rutas
│   │   └── app.config.ts          # Configuración de app
│   │
│   ├── styles.scss                # Estilos globales (variables, reset, utilidades)
│   ├── main.ts                    # Entry point Angular
│   ├── index.html                 # HTML base
│   └── assets/                    # Recursos estáticos
│       ├── logo.png              # Logo del gimnasio
│       └── portada.jpg           # Imagen de portada
│
├── angular.json                   # Configuración de Angular CLI
├── tsconfig.json                  # Configuración de TypeScript
├── tsconfig.app.json
├── tsconfig.spec.json
├── package.json                   # Dependencias de npm
├── package-lock.json
├── .gitignore                     # Archivos ignorados por git
├── .env.example                   # Variables de entorno ejemplo
│
├── README.md                      # Documentación principal
├── QUICKSTART.md                  # Guía de inicio rápido
├── COMPLETED.md                   # Estado de implementación
└── GETTING_STARTED.md             # Este archivo
```

## 🔄 Flujo de componentes

```
AppComponent (root)
│
├─ Router Outlet
│  │
│  ├─ LoginComponent (ruta: /login)
│  │   └─ AuthService (login/logout)
│  │
│  └─ DashboardComponent (ruta: /dashboard, protegido por AuthGuard)
│     │
│     ├─ RegisterClientComponent
│     │  ├─ CameraPhotoComponent (emisor de fotos)
│     │  ├─ ClienteService (guardar cliente)
│     │  └─ FaceRecognitionService (generar descriptor)
│     │
│     ├─ ClientsListComponent
│     │  ├─ Tabla de clientes
│     │  ├─ EditClientModalComponent
│     │  │  ├─ CameraPhotoComponent
│     │  │  └─ ClienteService (actualizar)
│     │  │
│     │  └─ DeleteClientModalComponent
│     │     └─ ClienteService (eliminar)
│     │
│     └─ FaceRecognitionComponent
│        ├─ Video stream (cámara)
│        ├─ FaceRecognitionService (detectar/comparar)
│        ├─ ClienteService (buscar/registrar entrada)
│        └─ Result display
│
└─ ToastContainerComponent (global)
   └─ ToastService (mensajes)
```

## 📊 Flujo de datos

### Autenticación
```
LoginComponent 
  → AuthService.login()
    → localStorage (sessionStorage)
    → redirect a /dashboard
```

### Registro de cliente
```
RegisterClientComponent
  → CameraPhotoComponent (captura foto)
  → ClienteService.agregarCliente()
    → FaceRecognitionService (genera descriptor)
    → localStorage (guarda cliente)
    → ToastService (notificación)
```

### Reconocimiento facial
```
FaceRecognitionComponent
  → Video stream
    → FaceRecognitionService.detectFace()
    → FaceRecognitionService.generateDescriptor()
    → FaceRecognitionService.findBestMatch()
    → Mostrar cliente identificado
    → ClienteService.registrarEntrada()
      → Actualizar vencimiento
      → localStorage
```

## 🔑 Servicios clave

### AuthService
```typescript
- login(usuario, contraseña): Promise<boolean>
- logout(): void
- isAuthenticated(): boolean
```

### ClienteService
```typescript
- getClientes(): Cliente[]
- agregarCliente(cliente): Cliente
- actualizarCliente(id, datos): Cliente | null
- eliminarCliente(id): boolean
- buscarPorCedula(cedula): Cliente | undefined
- buscarPorNombre(nombre): Cliente[]
- registrarEntrada(clienteId): void
- calcularDiasRestantes(fecha): number
```

### FaceRecognitionService
```typescript
- loadModels(): Promise<void>
- detectFace(input): Promise<any>
- generateDescriptor(input): Promise<number[] | null>
- compareFaces(desc1, desc2): number
- findBestMatch(query, list): any
- captureFrameFromVideo(video): Promise<Canvas>
- imageToDescriptor(base64): Promise<number[]>
```

### ToastService
```typescript
- show(message, type, duration): void
- remove(id): void
```

## 🎨 Variables SCSS globales

```scss
:root {
  --bg-dark: #0a0a0a;           // Fondo negro
  --bg-dark-2: #121217;         // Gris oscuro
  --bg-light: #f8f8fa;          // Fondo claro
  --accent: #e63946;            // Rojo principal
  --accent-hover: #ff6b6b;      // Rojo hover
  --text-light: #f0f0f0;        // Texto claro
  --text-dark: #0a0a0a;         // Texto oscuro
  --muted-light: #cccccc;       // Gris medio
  --muted-dark: #666666;        // Gris oscuro
  --border-light: rgba(230, 57, 70, 0.2);
  --shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

## 📱 Responsive Breakpoints

```scss
@media (max-width: 1200px) { /* Tablets grandes */ }
@media (max-width: 768px)  { /* Tablets y móviles */ }
@media (max-width: 480px)  { /* Móviles pequeños */ }
```

## 🔐 Protección de rutas

```typescript
// AuthGuard verifica si el usuario está autenticado
// Si NO está autenticado:
//   → Redirige a /login
// Si SÍ está autenticado:
//   → Permite acceso a /dashboard
```

## 💾 Persistencia

```javascript
// localStorage keys
xtremeGymClientes     // Array de clientes JSON
xtremeGymAuth         // Info de autenticación JSON

// Formato Cliente en localStorage
{
  id: "1234567890",
  nombre: "Juan Pérez",
  cedula: "1234567890",
  celular: "0987654321",
  fechaRegistro: "2026-05-24",
  tipoPago: "Mensual",
  fechaPago: "2026-05-24",
  fechaVencimiento: "2026-06-23",
  foto: "data:image/jpeg;base64,...",
  historialEntradas: ["2026-05-24T10:30:00Z"],
  faceDescriptor: [0.123, 0.456, ...]
}
```

## 🚀 Comandos de desarrollo

```powershell
# Instalar dependencias
npm install

# Ejecutar en desarrollo (con hot reload)
npm start

# Ver estructura de carpetas
tree /F

# Compilar para producción
npm run build:prod

# Limpiar compilaciones anteriores
rm -r dist node_modules
npm install
```

## 📖 Documentos relacionados

- **README.md** - Documentación completa y detallada
- **QUICKSTART.md** - Inicio rápido paso a paso
- **COMPLETED.md** - Estado actual de implementación

---

**Última actualización:** Mayo 2026
