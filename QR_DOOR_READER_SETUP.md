# Sistema de Acceso con QR y Códigos Numéricos

## Descripción
Este sistema permite validar códigos QR de usuarios y códigos numéricos de compras individuales para controlar el acceso al gimnasio.

## Cómo Funciona

### 1. Códigos QR de Usuarios Suscritos
- Cada usuario suscrito tiene un QR único generado con su `user_id`
- Los usuarios pueden ver y descargar su QR desde la sección "Mi Perfil" en la app
- El QR contiene el `user_id` del usuario
- Válido mientras la suscripción esté activa y el usuario no esté bloqueado

### 2. Códigos Numéricos de Clases Individuales (Stripe)
- Al comprar una clase individual mediante Stripe, el usuario recibe un código numérico de 6 dígitos
- El código se envía por email inmediatamente después del pago
- **Importante:** El código solo es válido el día de la compra
- Una vez usado, no se puede reutilizar
- Ejemplo de código: `123456`

### 3. API de Validación
Se ha creado un endpoint Edge Function para validar tanto QR como códigos numéricos:

**Endpoint:** `https://kyxkvwxodyuqfzwjcyuc.supabase.co/functions/v1/validate-qr`

**Método:** POST

**Headers:**
```
Content-Type: application/json
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eGt2d3hvZHl1cWZ6d2pjeXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODU3NzgsImV4cCI6MjA3NjA2MTc3OH0.LQN6bZcD-r1JqZ1Fui3z9bUcHS6kgjiLBVbZMdClxkM
```

**Body para QR:**
```json
{
  "qrCode": "uuid-del-usuario"
}
```

**Body para Código Numérico:**
```json
{
  "accessCode": "123456"
}
```


**Respuestas:**

✅ **Acceso Permitido - Usuario Suscrito (200):**
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

✅ **Acceso Permitido - Clase Individual (200):**
```json
{
  "success": true,
  "message": "Acceso permitido - Clase individual",
  "user": {
    "name": "Usuario invitado"
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

❌ **Código No Válido para Hoy (403):**
```json
{
  "success": false,
  "message": "El código solo es válido el día de la compra"
}
```

❌ **Usuario/Código No Encontrado (404):**
```json
{
  "success": false,
  "message": "Usuario no encontrado"
}
```

❌ **Código Inválido o Ya Usado (404):**
```json
{
  "success": false,
  "message": "Código inválido o ya utilizado"
}
```


## Configuración del Lector de Puerta

### Opción 1: Lector QR con Teclado Numérico y Conexión HTTP
Sistema recomendado que acepta tanto QR como códigos numéricos:

1. Configura el lector para enviar POST requests al endpoint cuando escanee un QR o se introduzca un código
2. Configura los headers necesarios (apikey)
3. Para QR: enviar `{"qrCode": "valor-escaneado"}`
4. Para código numérico: enviar `{"accessCode": "123456"}`
5. Basándose en la respuesta (success: true/false), el lector puede activar el mecanismo de apertura

### Opción 2: Sistema Intermedio con Pantalla Táctil
Si quieres una interfaz más amigable:

1. Conecta un lector QR + teclado numérico (o pantalla táctil) a un Raspberry Pi
2. Crea una interfaz simple que permita:
   - Escanear QR
   - O introducir código numérico de 6 dígitos
3. El sistema envía la petición HTTP correspondiente
4. Activa el relé/cerradura según la respuesta

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

def validate_access_code(access_code):
    headers = {
        "Content-Type": "application/json",
        "apikey": API_KEY
    }
    payload = {"accessCode": access_code}
    
    response = requests.post(API_URL, json=payload, headers=headers)
    return response.json()

def open_door():
    # Código para activar el relé que abre la puerta
    print("🔓 Puerta abierta")
    pass

def display_message(message, success=True):
    # Mostrar mensaje en pantalla LCD/OLED
    print(f"{'✅' if success else '❌'} {message}")

# Ejemplo de uso con teclado numérico
def handle_numeric_input():
    code = input("Introduce código de 6 dígitos: ")
    if len(code) == 6 and code.isdigit():
        result = validate_access_code(code)
        if result.get('success'):
            display_message("Acceso permitido")
            open_door()
        else:
            display_message(result.get('message', 'Acceso denegado'), False)
    else:
        display_message("Código inválido", False)

# Ejemplo de uso con lector QR
# ser = serial.Serial('/dev/ttyUSB0', 9600)
# while True:
#     qr_code = ser.readline().decode('utf-8').strip()
#     result = validate_qr(qr_code)
#     if result.get('success'):
#         display_message("Acceso permitido")
#         open_door()
#     else:
#         display_message(result.get('message', 'Acceso denegado'), False)
```

## Registro de Accesos
Cada vez que se valida un QR o código exitosamente, se registra el acceso en la tabla `access_logs` con:
- `user_id`: ID del usuario (si aplica)
- `access_type`: 'door_entry' para usuarios suscritos, 'single_class' para clases individuales
- `timestamp`: Fecha y hora del acceso

Esto permite llevar un registro completo de quién accede y cuándo.

## Testing

### Probar validación con QR:
```bash
curl -X POST https://kyxkvwxodyuqfzwjcyuc.supabase.co/functions/v1/validate-qr \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eGt2d3hvZHl1cWZ6d2pjeXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODU3NzgsImV4cCI6MjA3NjA2MTc3OH0.LQN6bZcD-r1JqZ1Fui3z9bUcHS6kgjiLBVbZMdClxkM" \
  -d '{"qrCode": "user-id-aqui"}'
```

### Probar validación con código numérico:
```bash
curl -X POST https://kyxkvwxodyuqfzwjcyuc.supabase.co/functions/v1/validate-qr \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eGt2d3hvZHl1cWZ6d2pjeXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODU3NzgsImV4cCI6MjA3NjA2MTc3OH0.LQN6bZcD-r1JqZ1Fui3z9bUcHS6kgjiLBVbZMdClxkM" \
  -d '{"accessCode": "123456"}'
```

## Próximos Pasos
1. Decidir entre lector QR simple o sistema con teclado numérico
2. Adquirir hardware necesario (lector QR, teclado, Raspberry Pi, relé)
3. Configurar según hardware disponible
4. Testear con usuarios reales y códigos de prueba
5. Ajustar tiempos de apertura de puerta según necesidades

## Ventajas del Sistema Dual (QR + Códigos)
- **Usuarios suscritos:** Acceso rápido con QR permanente
- **Clases individuales:** Acceso sencillo con código numérico del día
- **Seguridad:** Los códigos numéricos expiran y solo funcionan el día de compra
- **Flexibilidad:** Múltiples formas de acceso según tipo de usuario
