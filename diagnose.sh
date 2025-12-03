#!/bin/bash
# Script de diagnóstico completo

echo "========================================="
echo "DIAGNÓSTICO DE DEPLOYMENT"
echo "========================================="
echo ""

echo "1. Estado de Git:"
echo "----------------"
git branch --show-current
echo ""

echo "2. Últimos commits en main:"
echo "-------------------------"
git log --oneline main | head -5
echo ""

echo "3. Verificar auth.py en main tiene endpoints:"
echo "-------------------------------------------"
git show main:backend/app/api/endpoints/auth.py | grep -c "forgot-password"
git show main:backend/app/api/endpoints/auth.py | grep -c "reset-password"
echo ""

echo "4. Test de Railway:"
echo "-----------------"
echo "Health check:"
curl -s https://proyectocamaras-production.up.railway.app/health | python -m json.tool 2>/dev/null || echo "FAILED"
echo ""
echo "Endpoints disponibles:"
curl -s https://proyectocamaras-production.up.railway.app/openapi.json | grep -o '"/api/auth/[^"]*"' | sort -u
echo ""

echo "5. Último commit en GitHub main:"
echo "-------------------------------"
curl -s "https://api.github.com/repos/JuanPaVelandia/proyectocamaras/commits/main" | grep '"sha"' | head -1
echo ""

echo "========================================="
echo "FIN DEL DIAGNÓSTICO"
echo "========================================="
