"""
Script para verificar si el backend activo tiene los endpoints correctos
"""
import requests
import sys

BASE_URL = "http://localhost:8000"

print("=" * 60)
print("Verificando backend activo en", BASE_URL)
print("=" * 60)
print()

try:
    # Verificar que el servidor esté corriendo
    print("1. Verificando que el servidor este corriendo...")
    response = requests.get(f"{BASE_URL}/docs", timeout=2)
    if response.status_code == 200:
        print("   OK: Servidor esta corriendo")
    else:
        print(f"   ERROR: Servidor responde con status {response.status_code}")
        sys.exit(1)
except requests.exceptions.ConnectionError:
    print("   ERROR: No se puede conectar al servidor")
    print("   Asegurate de que el backend este corriendo en http://localhost:8000")
    sys.exit(1)
except Exception as e:
    print(f"   ERROR: {e}")
    sys.exit(1)

print()

# Hacer login para obtener token
print("2. Obteniendo token de autenticacion...")
try:
    login_response = requests.post(
        f"{BASE_URL}/api/login",
        json={"username": "admin", "password": "admin123"},
        timeout=5
    )
    if login_response.status_code != 200:
        print(f"   ERROR: Login fallido: {login_response.status_code}")
        print("   Usa las credenciales correctas o ajusta el script")
        sys.exit(1)
    token = login_response.json()["token"]
    print("   OK: Token obtenido")
except Exception as e:
    print(f"   ERROR: {e}")
    sys.exit(1)

print()

# Verificar endpoints
headers = {"X-Admin-Token": token}
test_rule_id = 1  # ID de prueba

print("3. Verificando endpoints de eliminacion...")
print()

# Verificar DELETE
print(f"   Probando DELETE /api/rules/{test_rule_id}...")
delete_response = requests.delete(f"{BASE_URL}/api/rules/{test_rule_id}", headers=headers, timeout=5)
if delete_response.status_code == 405:
    print("   ERROR: Method Not Allowed - El endpoint DELETE NO esta disponible")
    print("   El backend necesita reiniciarse!")
    delete_available = False
elif delete_response.status_code == 404:
    print("   OK: Endpoint DELETE disponible (404 es normal si la regla no existe)")
    delete_available = True
elif delete_response.status_code == 200:
    print("   OK: Endpoint DELETE funciona correctamente")
    delete_available = True
else:
    print(f"   Status: {delete_response.status_code}")
    delete_available = delete_response.status_code != 405

print()

# Verificar POST alternativo
print(f"   Probando POST /api/rules/{test_rule_id}/delete...")
post_response = requests.post(f"{BASE_URL}/api/rules/{test_rule_id}/delete", headers=headers, timeout=5)
if post_response.status_code == 404:
    print("   ERROR: Endpoint POST /delete NO esta disponible")
    print("   El backend necesita reiniciarse!")
    post_available = False
elif post_response.status_code == 200:
    print("   OK: Endpoint POST /delete funciona correctamente")
    post_available = True
else:
    print(f"   Status: {post_response.status_code}")
    post_available = post_response.status_code != 404

print()
print("=" * 60)

if not delete_available and not post_available:
    print("RESULTADO: El backend NO tiene los endpoints de eliminacion")
    print()
    print("ACCION REQUERIDA:")
    print("1. Deten el backend actual (Ctrl+C en la terminal donde corre)")
    print("2. Reinicia el backend con uno de estos comandos:")
    print()
    print("   Opcion A - Directamente:")
    print("   cd C:\\frigate\\backend")
    print("   python main.py")
    print()
    print("   Opcion B - Con uvicorn (recomendado):")
    print("   cd C:\\frigate\\backend")
    print("   uvicorn main:app --reload --host 0.0.0.0 --port 8000")
    print()
    print("   Opcion C - Con Docker:")
    print("   docker-compose restart backend")
    print("   # o")
    print("   docker-compose up -d --build backend")
    print()
elif delete_available:
    print("RESULTADO: El backend tiene el endpoint DELETE disponible")
    print("El boton Eliminar deberia funcionar correctamente")
elif post_available:
    print("RESULTADO: El backend tiene el endpoint POST alternativo disponible")
    print("El boton Eliminar deberia funcionar usando el metodo alternativo")

print("=" * 60)

