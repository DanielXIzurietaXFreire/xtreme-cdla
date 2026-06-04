# 🚀 Guía de inicio rápido - Xtreme Gym Angular

## Pasos inmediatos

### 1️⃣ Instalar dependencias
```powershell
cd "c:\Users\ASUS\Documents\Xtreme\Front-end\xtreme"
npm install
```

### 2️⃣ Ejecutar en desarrollo
```powershell
npm start
```
- Abre: http://localhost:4200
- La aplicación se recargará automáticamente al modificar archivos

### 3️⃣ Acceder al sistema
- **Cualquier usuario/contraseña funciona** (login simulado)
- O presiona "Simular acceso" para autocompletar

## 📌 Checklist pre-lanzamiento

- [ ] **Agregar logo** (reemplaza `src/assets/logo.png`)
- [ ] **Agregar imagen de portada** (reemplaza `src/assets/portada.jpg`)
- [ ] **Probar captura de cámara** en diferentes navegadores
- [ ] **Probar reconocimiento facial** registrando clientes con foto
- [ ] **Validar localStorage** en navegadores destino
- [ ] **Compilar producción:** `npm run build:prod`

## 🎯 Funcionalidades listas

### ✅ Completadas
- Login con persistencia
- Dashboard con navegación
- Registro de clientes con formulario reactivo
- Captura de fotos desde cámara o archivo
- Tabla de clientes con búsqueda
- Edición de clientes en modal
- Eliminación con confirmación
- Reconocimiento facial con face-api.js
- Generación automática de descriptores faciales
- Registro de entradas
- Actualización automática de vencimientos
- Persistencia en localStorage
- Diseño responsive
- Estilos replicados exactamente al prototipo

### 🔮 Opcionales (mejoras futuras)
- Backend API (reemplazar localStorage)
- Autenticación real
- Reportes en PDF
- Exportar datos a Excel
- Dashboard con gráficas
- Notificaciones por SMS
- Integración con sistemas de pago
- Versión móvil con Ionic/Capacitor

## 📸 Pruebas de foto

### Opción 1: Cámara integrada
1. Ir a "Registrar cliente"
2. Presionar "Cámara" en la sección de foto
3. Presionar "Tomar" para capturar
4. Presionar "Registrar cliente"

### Opción 2: Subir imagen
1. Ir a "Registrar cliente"
2. Presionar "Subir" en la sección de foto
3. Seleccionar archivo JPG/PNG
4. Presionar "Registrar cliente"

## 🤖 Pruebas de reconocimiento facial

1. **Registrar cliente con foto**
   - Nombre: "Juan Pérez"
   - Cédula: "1234567890"
   - Foto: capturada o subida

2. **Ir a "Escáner de rostro"**
   - Presionar "Iniciar cámara"
   - Mostrar rostro a la cámara
   - Sistema debe identificar automáticamente
   - Presionar "Registrar entrada"

3. **Verificar en "Ver clientes"**
   - El cliente debe mostrar entrada registrada
   - Vencimiento actualizado

## 🛠️ Comandos útiles

```powershell
# Instalar dependencias
npm install

# Ejecutar desarrollo (localhost:4200)
npm start

# Compilar para producción
npm run build:prod

# Ver tamaño del bundle
npm run build:prod -- --stats-json
node_modules\.bin\webpack-bundle-analyzer dist/xtreme-gym-app/stats.json
```

## 📝 Notas importantes

### Diseño visual
- ✅ Exactamente igual al prototipo
- ✅ Mismos colores, fuentes, espaciado
- ✅ Misma estructura de componentes
- ✅ Responsive en móvil

### Seguridad (localStorage)
- Los datos son locales al navegador
- NO se envían a servidores
- Se pierden al limpiar caché
- Para producción: implementar backend

### Reconocimiento facial
- Requiere cámara de buena calidad
- Necesita buena iluminación
- Face-api.js descarga modelos automáticamente
- Primera carga puede tardar ~2-3 segundos

## 🔗 Recursos útiles

- [Angular 17 Docs](https://angular.io/docs)
- [face-api.js Docs](https://github.com/justadudewhohacks/face-api.js)
- [SCSS Documentation](https://sass-lang.com/documentation)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## 💡 Solución de problemas rápidos

### "Module not found"
```powershell
# Limpiar instalación
rm -r node_modules
npm install
npm start
```

### Cámara no funciona
- Verifica permisos del navegador
- Refresca la página
- Prueba con HTTPS (algunos navegadores lo requieren)

### Datos no persisten
- Abre DevTools (F12) → Application → Local Storage
- Verifica que `xtremeGymClientes` esté presente
- Comprueba que localStorage esté habilitado

### Face-api tarda mucho
- Primera carga descarga modelos (~30MB)
- Abre la consola para ver progreso
- Espera a que carguen los modelos

---

## 🎓 Resumen de la arquitectura

```
App Root (AppComponent)
├── LoginComponent ← Usuario se autentica
├── DashboardComponent ← Interfaz principal
│   ├── RegisterClientComponent ← Agregar cliente
│   ├── ClientsListComponent ← Ver/Editar/Eliminar
│   └── FaceRecognitionComponent ← Reconocer rostro
│
Servicios compartidos:
├── AuthService ← Gestiona login/logout
├── ClienteService ← CRUD de clientes
├── FaceRecognitionService ← Reconocimiento facial
└── ToastService ← Notificaciones
```

**¡Tu aplicación Angular está lista para usar!** 🎉
