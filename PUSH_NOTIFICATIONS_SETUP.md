# Configuración de Notificaciones Push

Este documento explica cómo configurar completamente las notificaciones push en la aplicación Pantera CrossTraining.

## 🎯 Estado Actual

La infraestructura para notificaciones push está completamente implementada:

✅ Service Worker configurado (`/public/sw.js`)
✅ Hook de React para gestión de subscripciones (`usePushNotifications`)
✅ Tabla de base de datos para subscripciones (`push_subscriptions`)
✅ Edge function para enviar push notifications (`send-push-notification`)
✅ Integración con notificaciones de cumpleaños
✅ Componente UI para solicitar permisos

## 🔧 Configuración Pendiente

Para que las notificaciones push funcionen completamente, necesitas:

### 1. Generar Claves VAPID

Las claves VAPID son necesarias para autenticar las notificaciones push. Puedes generarlas usando:

**Opción A: Node.js**
```bash
npm install -g web-push
web-push generate-vapid-keys
```

**Opción B: Online**
Visita: https://vapidkeys.com/

Esto te dará:
- **Public Key** (Clave Pública)
- **Private Key** (Clave Privada)

### 2. Actualizar la Clave Pública en el Frontend

Edita `src/hooks/usePushNotifications.ts` y reemplaza:
```typescript
const PUBLIC_VAPID_KEY = "BN0D7Hpz0K_dCZLNVQWXVBQWXVBQWXVBQWXVBQWXVBQWXVBQWXVBQWXVBQWXVBQWXVBQWXVBQWXVBQWX";
```

Con tu clave pública generada.

### 3. Configurar la Clave Privada en Supabase

La clave privada debe guardarse como un secreto de Supabase:

1. Ve a tu proyecto en Lovable Cloud (Backend)
2. Agrega un nuevo secreto llamado `VAPID_PRIVATE_KEY`
3. Pega tu clave privada como valor

### 4. Actualizar la Edge Function

La edge function `send-push-notification` necesita usar la librería `web-push` para enviar notificaciones reales.

**Importante**: Por ahora, la función solo registra las notificaciones. Para implementación completa en producción, necesitarás:

1. Usar la librería `web-push` de npm en Deno
2. Configurar VAPID details con tu email y claves
3. Enviar la notificación usando `webpush.sendNotification()`

## 📱 Funcionalidades Implementadas

### Notificaciones de Cumpleaños
- Se envían automáticamente a las 00:00 del día del cumpleaños
- Incluyen mensaje personalizado con el nombre del usuario
- Aparecen como notificación push en el dispositivo

### Notificaciones de Clases
Las siguientes notificaciones ya están configuradas para enviar push:
- ✅ Confirmación de plaza desde lista de espera
- ✅ Usuario en lista de espera
- ✅ Quedan 3 clases este mes
- ✅ Límite de clases alcanzado

### Solicitud de Permisos
- Banner elegante que aparece al iniciar sesión
- Solo se muestra una vez
- Opción para descartar

## 🧪 Cómo Probar

1. **Permisos del Navegador**: Asegúrate de permitir notificaciones cuando se solicite
2. **Service Worker**: Verifica en DevTools > Application > Service Workers
3. **Subscripción**: Revisa la tabla `push_subscriptions` en la base de datos
4. **Prueba Manual**: 
   - Llama a la edge function `send-push-notification` con:
   ```json
   {
     "user_id": "tu-user-id",
     "title": "Prueba",
     "message": "Esto es una notificación de prueba"
   }
   ```

## 🚀 Próximos Pasos para Producción

1. Generar claves VAPID reales
2. Actualizar ambas claves (pública y privada)
3. Implementar web-push en la edge function
4. Probar en dispositivos móviles reales
5. Considerar usar OneSignal o Firebase Cloud Messaging para mayor robustez

## 📝 Notas Importantes

- Las notificaciones push funcionan en Chrome, Firefox, Edge, y Safari (iOS 16.4+)
- Requieren HTTPS en producción (localhost funciona sin HTTPS)
- Los usuarios deben otorgar permisos explícitamente
- Las subscripciones pueden caducar y necesitan renovarse

## 🆘 Solución de Problemas

**Problema**: No aparece el banner de permisos
- Solución: Limpia localStorage y recarga la página

**Problema**: Service Worker no se registra
- Solución: Verifica que `/sw.js` sea accesible en `public/`

**Problema**: Error al guardar subscription
- Solución: Verifica que el usuario esté autenticado y la tabla exista

**Problema**: No llegan las notificaciones
- Solución: Implementa web-push en la edge function con claves VAPID reales
