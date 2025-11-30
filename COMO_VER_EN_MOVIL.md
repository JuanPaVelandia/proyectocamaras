# 📱 Cómo Ver la Aplicación en un Celular

## Opción 1: Herramientas de Desarrollador (Más Rápido) ⚡

### Chrome/Edge:
1. Abre la aplicación: `http://localhost:5173`
2. Presiona `F12` o `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
3. Presiona `Ctrl+Shift+M` (Windows) / `Cmd+Shift+M` (Mac) para activar el modo dispositivo
4. Selecciona un dispositivo del menú desplegable:
   - iPhone 12 Pro
   - iPhone SE
   - Samsung Galaxy S20
   - iPad
   - O personaliza las dimensiones

### Firefox:
1. Abre la aplicación: `http://localhost:5173`
2. Presiona `F12` o `Ctrl+Shift+I`
3. Presiona `Ctrl+Shift+M` para activar el modo responsivo
4. Selecciona un dispositivo o personaliza dimensiones

### Características del modo dispositivo:
- ✅ Simula diferentes tamaños de pantalla
- ✅ Simula touch events
- ✅ Muestra cómo se ve en diferentes orientaciones
- ✅ Permite cambiar entre dispositivos rápidamente
- ✅ Muestra la barra de direcciones del móvil

---

## Opción 2: Acceder desde un Celular Real 📲

### Paso 1: Obtener tu IP Local

**Windows:**
```powershell
ipconfig
```
Busca "Dirección IPv4" (ej: `192.168.1.100`)

**Linux/Mac:**
```bash
ifconfig
# o
ip addr show
```

### Paso 2: Asegurar que el Frontend sea Accesible

El frontend debe estar corriendo y accesible desde la red local.

**Si estás usando `npm run dev`:**
- Por defecto, Vite solo escucha en `localhost`
- Necesitas hacerlo accesible desde la red

**Modificar el comando de inicio:**

En `package.json`, cambia el script `dev`:
```json
"dev": "vite --host"
```

O ejecuta directamente:
```bash
npm run dev -- --host
```

Esto hará que Vite escuche en todas las interfaces de red.

### Paso 3: Acceder desde el Celular

1. Asegúrate de que tu celular esté en la **misma red Wi-Fi** que tu computadora
2. Abre el navegador en tu celular
3. Ve a: `http://TU_IP_LOCAL:5173`
   - Ejemplo: `http://192.168.1.100:5173`

### Paso 4: Si No Funciona

**Verificar firewall:**
- Windows puede bloquear el puerto 5173
- Permite el acceso en el firewall de Windows

**Verificar que Vite esté escuchando en todas las interfaces:**
- Deberías ver en la consola: `Local: http://localhost:5173/`
- Y también: `Network: http://192.168.1.100:5173/`

---

## Opción 3: Usar ngrok (Para Acceso Remoto) 🌐

Si quieres probar desde cualquier lugar (no solo en la misma red):

1. Descarga ngrok: https://ngrok.com/
2. Ejecuta:
   ```bash
   ngrok http 5173
   ```
3. Obtendrás una URL pública (ej: `https://abc123.ngrok.io`)
4. Accede desde cualquier celular con esa URL

**Nota:** La versión gratuita de ngrok tiene limitaciones.

---

## Opción 4: Usar Herramientas Online 🔧

### BrowserStack / LambdaTest:
- Servicios online para probar en dispositivos reales
- Requieren cuenta (algunos tienen versión gratuita)

### Responsively App:
- Aplicación de escritorio para ver múltiples dispositivos a la vez
- Descarga: https://responsively.app/

---

## 📋 Checklist para Probar en Móvil

- [ ] La aplicación se ve bien en modo dispositivo del navegador
- [ ] Los botones son fáciles de tocar (tamaño mínimo 44x44px)
- [ ] El texto es legible sin hacer zoom
- [ ] Los formularios son fáciles de completar
- [ ] La navegación funciona con touch
- [ ] No hay elementos que se salgan de la pantalla
- [ ] El header sticky funciona correctamente
- [ ] Los tabs son accesibles y fáciles de usar

---

## 🎯 Dispositivos Recomendados para Probar

### Móviles:
- **iPhone SE** (375px) - Pantalla pequeña
- **iPhone 12/13** (390px) - Tamaño estándar
- **Samsung Galaxy S20** (360px) - Android estándar
- **iPhone 14 Pro Max** (430px) - Pantalla grande

### Tablets:
- **iPad** (768px) - Tablet estándar
- **iPad Pro** (1024px) - Tablet grande

---

## 💡 Tips para Mejorar la Experiencia Móvil

1. **Tamaños de toque:** Los botones deben ser al menos 44x44px
2. **Espaciado:** Más espacio entre elementos en móviles
3. **Texto:** Tamaño mínimo de 16px para evitar zoom automático
4. **Formularios:** Usa inputs con `type` apropiado (email, tel, etc.)
5. **Scroll:** Asegúrate de que todo el contenido sea accesible

---

## 🚀 Comando Rápido

Para iniciar el frontend accesible desde la red:

```bash
cd Frontend/rules-panel
npm run dev -- --host
```

Luego accede desde tu celular a: `http://TU_IP:5173`

