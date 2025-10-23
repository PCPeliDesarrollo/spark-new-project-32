# Configuración del Lector de QR para la Puerta

## Descripción
Este sistema permite validar códigos QR de usuarios para controlar el acceso a través de un lector en la puerta del gimnasio.

## Cómo Funciona

### 1. Códigos QR de Usuarios
- Cada usuario tiene un QR único generado con su `user_id`
- Los usuarios pueden ver y descargar su QR desde la sección "Mi Perfil" en la app
- El QR contiene el `user_id` del usuario

### 2. API de Validación
Se ha creado un endpoint Edge Function para validar los QR:

**Endpoint:** `https://kyxkvwxodyuqfzwjcyuc.supabase.co/functions/v1/validate-qr`

**Método:** POST

**Headers:**
```
Content-Type: application/json
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eGt2d3hvZHl1cWZ6d2pjeXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODU3NzgsImV4cCI6MjA3NjA2MTc3OH0.LQN6bZcD-r1JqZ1Fui3z9bUcHS6kgjiLBVbZMdClxkM
```

**Body:**
```json
{
  "qrCode": "uuid-del-usuario"
}
```

**Respuestas:**

✅ **Acceso Permitido (200):**
```json
{
  "success": true,
  "message": "Acceso permitido",
  "user": {
    "name": "Nombre del Usuario",
    "email": "email@ejemplo.com"
  }
}
```

❌ **Usuario Bloqueado (403):**
```json
{
  "success": false,
  "message": "Usuario bloqueado. Contacta con administración."
}
```

❌ **Usuario No Encontrado (404):**
```json
{
  "success": false,
  "message": "Usuario no encontrado"
}
```

## Configuración del Lector de Puerta

### Opción 1: Lector QR con Conexión HTTP
Si tu lector puede hacer peticiones HTTP:

1. Configura el lector para enviar POST requests al endpoint cuando escanee un QR
2. Configura los headers necesarios (apikey)
3. El lector debe leer el QR code y enviarlo en el body como `{"qrCode": "valor-escaneado"}`
4. Basándose en la respuesta (success: true/false), el lector puede activar el mecanismo de apertura

### Opción 2: Sistema Intermedio
Si tu lector no puede hacer peticiones HTTP directamente:

1. Conecta el lector a un ordenador/Raspberry Pi
2. Crea un script que:
   - Reciba el código QR del lector
   - Haga la petición HTTP al endpoint de validación
   - Active el relé/cerradura según la respuesta

### Ejemplo de Script en Python (para Raspberry Pi):
```python
import requests
import serial

API_URL = "https://kyxkvwxodyuqfzwjcyuc.supabase.co/functions/v1/validate-qr"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eGt2d3hvZHl1cWZ6d2pjeXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODU3NzgsImV4cCI6MjA3NjA2MTc3OH0.LQN6bZcD-r1JqZ1Fui3z9bUcHS6kgjiLBVbZMdClxkM"

def validate_qr(qr_code):
    headers = {
        "Content-Type": "application/json",
        "apikey": API_KEY
    }
    payload = {"qrCode": qr_code}
    
    response = requests.post(API_URL, json=payload, headers=headers)
    return response.json()

def open_door():
    # Código para activar el relé que abre la puerta
    print("🔓 Puerta abierta")
    pass

# Escuchar el lector QR (ejemplo con serial)
# ser = serial.Serial('/dev/ttyUSB0', 9600)
# while True:
#     qr_code = ser.readline().decode('utf-8').strip()
#     result = validate_qr(qr_code)
#     if result.get('success'):
#         open_door()
```

## Registro de Accesos
Cada vez que se valida un QR exitosamente, se registra el acceso en la tabla `access_logs` con:
- `user_id`: ID del usuario
- `access_type`: 'door_entry'
- `timestamp`: Fecha y hora del acceso

Esto permite llevar un registro de quién accede y cuándo.

## Testing
Para probar el endpoint:

```bash
curl -X POST https://kyxkvwxodyuqfzwjcyuc.supabase.co/functions/v1/validate-qr \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eGt2d3hvZHl1cWZ6d2pjeXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODU3NzgsImV4cCI6MjA3NjA2MTc3OH0.LQN6bZcD-r1JqZ1Fui3z9bUcHS6kgjiLBVbZMdClxkM" \
  -d '{"qrCode": "user-id-aqui"}'
```

## Próximos Pasos
1. Adquirir lector QR compatible
2. Configurar según hardware disponible
3. Testear con usuarios reales
4. Ajustar tiempos de apertura de puerta según necesidades
