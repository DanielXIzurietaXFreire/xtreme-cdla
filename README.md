# Xtreme Gym - Sistema de Control Administrativo

Aplicación web profesional desarrollada con **Angular 17 Standalone Components** para la gestión administrativa del gimnasio Xtreme Gym en Ambato.

## 🎯 Características principales

✅ **Autenticación** - Login simulado con persistencia en localStorage  
✅ **Registro de clientes** - Formularios reactivos con validación  
✅ **Captura de fotos** - Cámara integrada usando `navigator.mediaDevices`  
✅ **Lista de clientes** - Tabla interactiva con búsqueda en tiempo real  
✅ **Edición de datos** - Modal personalizado para actualizar clientes  
✅ **Eliminación segura** - Modal de confirmación antes de eliminar  
✅ **Reconocimiento facial** - Identificación automática usando **face-api.js**  
✅ **Registro de entradas** - Control automático de acceso al gimnasio  
✅ **Gestión de vencimientos** - Actualización automática de fechas de pago  
✅ **Persistencia** - Todo guardado en localStorage  

## 🛠️ Tecnologías

- **Angular 17+** (Standalone Components)
- **TypeScript** (Programación tipada)
- **SCSS/CSS3** (Estilos profesionales)
- **RxJS** (Programación reactiva)
- **face-api.js** (Reconocimiento facial con IA)
- **FontAwesome 6.5** (Iconografía)
- **localStorage API** (Persistencia)

## 📁 Estructura del proyecto

```
src/
├── app/
│   ├── models/
│   │   └── cliente.model.ts          # Interfaz de Cliente
│   ├── services/
│   │   ├── auth.service.ts           # Autenticación
│   │   ├── cliente.service.ts        # CRUD de clientes
│   │   ├── face-recognition.service.ts  # Reconocimiento facial
│   │   ├── toast.service.ts          # Notificaciones
│   │   └── auth.guard.ts             # Protección de rutas
│   ├── components/
│   │   ├── login/                    # Pantalla de login
│   │   ├── dashboard/                # Contenedor principal
│   │   ├── register-client/          # Registro de cliente
│   │   ├── clients-list/             # Tabla de clientes
│   │   ├── face-recognition/         # Escáner facial
│   │   ├── camera-photo/             # Captura de foto
│   │   └── modals/
│   │       ├── edit-client-modal/    # Modal edición
│   │       └── delete-client-modal/  # Modal eliminación
│   ├── app.component.ts              # Root component
│   ├── app.routes.ts                 # Configuración de rutas
│   └── app.config.ts                 # Configuración de app
├── styles.scss                       # Estilos globales (variables, utilidades)
├── main.ts                           # Entry point
└── index.html                        # HTML principal
```

## 🚀 Instalación y ejecución

### Requisitos previos
- Node.js 18+ 
- npm o yarn

### Pasos

```bash
# 1. Navegar a la carpeta del proyecto
cd c:\Users\ASUS\Documents\Xtreme\Front-end\xtreme

# 2. Instalar dependencias
npm install

# 3. Ejecutar servidor de desarrollo
npm start

# 4. Abre en el navegador
# http://localhost:4200
```

## 🔐 Credenciales de login

El login es simulado - puedes usar cualquier usuario y contraseña:
- **Usuario:** admin@xtreme.com
- **Contraseña:** cualquiera

O presiona el botón **"Simular acceso"** para llenar automáticamente.

## 📊 Modelos de datos

### Cliente
```typescript
interface Cliente {
  id: string;
  nombre: string;
  cedula: string;
  celular: string;
  fechaRegistro: string;
  tipoPago: 'Diario' | 'Mensual';
  fechaPago: string;
  fechaVencimiento: string;
  foto: string;                    // Base64
  historialEntradas: string[];     // Fechas
  faceDescriptor?: number[];       // Descriptor facial
}
```

## 🎓 Servicios principales

### AuthService
- `login(usuario, contraseña)` - Autenticación
- `logout()` - Cerrar sesión
- `isAuthenticated()` - Verificar autenticación

### ClienteService
- `getClientes()` - Obtener todos los clientes
- `agregarCliente(cliente)` - Crear nuevo cliente
- `actualizarCliente(id, datos)` - Actualizar cliente
- `eliminarCliente(id)` - Eliminar cliente
- `buscarPorCedula(cedula)` - Buscar por cédula
- `buscarPorNombre(nombre)` - Buscar por nombre
- `registrarEntrada(clienteId)` - Registrar entrada
- `calcularDiasRestantes(fecha)` - Calcular días de vigencia

### FaceRecognitionService
- `loadModels()` - Cargar modelos de face-api.js
- `detectFace(input)` - Detectar rostro en imagen
- `generateDescriptor(input)` - Generar descriptor facial
- `compareFaces(desc1, desc2)` - Comparar descriptores
- `findBestMatch(query, descriptors)` - Encontrar mejor coincidencia
- `imageToDescriptor(base64)` - Convertir imagen a descriptor

## 🎨 Paleta de colores

```scss
--bg-dark: #0a0a0a        // Negro profundo
--bg-dark-2: #121217      // Gris oscuro
--accent: #e63946         // Rojo principal
--text-light: #f0f0f0     // Texto claro
--text-dark: #0a0a0a      // Texto oscuro
```

## 🔄 Flujo de reconocimiento facial

1. Usuario inicia cámara
2. Se detecta rostro en tiempo real
3. Se genera descriptor facial del frame actual
4. Se compara con descriptores almacenados de clientes
5. Si hay coincidencia (confianza > 60%), se identifica el cliente
6. Se muestra información del cliente con opción de registrar entrada
7. Al registrar entrada, se actualiza automáticamente el vencimiento

## 📝 Validaciones

### Registro de cliente
- ✓ Nombre: Requerido, mínimo 3 caracteres
- ✓ Cédula: Requerida, única en sistema, mínimo 8 caracteres
- ✓ Celular: Requerido, mínimo 7 caracteres
- ✓ Foto: Capturada desde cámara o subida desde archivos
- ✓ Tipo de pago: Diario o Mensual

### Edición de cliente
- ✓ No se puede cambiar cédula
- ✓ Se puede actualizar nombre, celular, tipo de pago, fecha de pago
- ✓ Se puede cambiar foto

## 🌐 Responsive Design

- ✓ Desktop completo (1200px+)
- ✓ Tablets (768px - 1199px)
- ✓ Móvil (< 768px) - Sidebar colapsable

## 📦 Build para producción

```bash
npm run build:prod
```

Los archivos compilados estarán en `dist/xtreme-gym-app`

## 🐛 Solución de problemas

### La cámara no funciona
- Verifica que el navegador tenga permisos para acceder a la cámara
- Usa un navegador moderno (Chrome, Firefox, Edge, Safari)
- Si usas HTTP local, algunos navegadores pueden bloquear el acceso

### El reconocimiento facial no reconoce clientes
- Asegúrate de que los clientes estén registrados con foto
- La foto debe ser de buena calidad y bien iluminada
- Acércate más a la cámara para mejor detección
- El umbral de confianza está establecido en 60% - requiere coincidencia significativa

### Los datos se pierden después de cerrar la pestaña
- Verifica que localStorage esté habilitado en el navegador
- Abre la consola (F12) y comprueba si hay errores
- Intenta limpiar cache del navegador

## 👥 Autor

Sistema desarrollado para **Xtreme Gym Ambato**

## 📄 Licencia

Privado - Todos los derechos reservados

---

**Última actualización:** Mayo 2026
