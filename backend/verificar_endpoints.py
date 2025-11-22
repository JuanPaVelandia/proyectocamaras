"""
Script para verificar que los endpoints estén correctamente registrados.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

from app.api.api import api_router

print("=" * 60)
print("Verificando endpoints registrados")
print("=" * 60)
print()

# Obtener todas las rutas
routes = []
for route in api_router.routes:
    if hasattr(route, 'methods') and hasattr(route, 'path'):
        for method in route.methods:
            if method != 'HEAD' and method != 'OPTIONS':
                routes.append((method, route.path))

# Filtrar rutas de reglas
rules_routes = [r for r in routes if '/rules' in r[1]]

print("Endpoints de reglas encontrados:")
print()
for method, path in sorted(rules_routes):
    print(f"  {method:6} {path}")

print()
print("=" * 60)

# Verificar específicamente el DELETE
delete_routes = [r for r in rules_routes if r[0] == 'DELETE']
if delete_routes:
    print("OK: Endpoint DELETE encontrado:")
    for method, path in delete_routes:
        print(f"   {method} {path}")
else:
    print("ERROR: NO se encontro el endpoint DELETE")
    print("   Asegurate de que el backend se haya reiniciado despues de los cambios")

print("=" * 60)

