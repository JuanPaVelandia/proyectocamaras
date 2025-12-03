#!/usr/bin/env python3
"""
Script para verificar que el sistema de customer_id está funcionando correctamente.
"""
import os
import sys
import requests
import json
from datetime import datetime, timedelta

# Agregar el directorio actual al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.all_models import UserDB, EventDB, RuleDB, RuleHitDB

def verificar_usuario(customer_id: str):
    """Verifica que el usuario existe en la BD"""
    print(f"\n🔍 Verificando usuario: {customer_id}")
    db = SessionLocal()
    try:
        user = db.query(UserDB).filter(UserDB.username == customer_id).first()
        if user:
            print(f"✅ Usuario encontrado:")
            print(f"   - ID: {user.id}")
            print(f"   - Email: {user.email}")
            print(f"   - WhatsApp: {user.whatsapp_number or 'No configurado'}")
            print(f"   - Notificaciones: {'Activadas' if user.whatsapp_notifications_enabled else 'Desactivadas'}")
            return True
        else:
            print(f"❌ Usuario '{customer_id}' NO existe en la base de datos")
            print(f"   Crea el usuario primero o verifica el CUSTOMER_ID en el listener")
            return False
    finally:
        db.close()

def verificar_reglas(customer_id: str):
    """Verifica las reglas del usuario"""
    print(f"\n📋 Verificando reglas para: {customer_id}")
    db = SessionLocal()
    try:
        user = db.query(UserDB).filter(UserDB.username == customer_id).first()
        if not user:
            print(f"❌ Usuario no encontrado")
            return
        
        rules = db.query(RuleDB).filter(
            RuleDB.user_id == user.id,
            RuleDB.enabled == True
        ).all()
        
        if rules:
            print(f"✅ Encontradas {len(rules)} reglas activas:")
            for rule in rules:
                print(f"   - {rule.name} (Cámara: {rule.camera or 'Todas'}, Label: {rule.label or 'Todos'})")
        else:
            print(f"⚠️ No hay reglas activas para este usuario")
            print(f"   Crea reglas desde el frontend para recibir notificaciones")
    finally:
        db.close()

def verificar_eventos_recientes(customer_id: str, horas: int = 24):
    """Verifica eventos recientes con este customer_id"""
    print(f"\n📨 Verificando eventos de las últimas {horas} horas")
    db = SessionLocal()
    try:
        desde = datetime.utcnow() - timedelta(hours=horas)
        eventos = db.query(EventDB).filter(
            EventDB.received_at >= desde
        ).order_by(EventDB.received_at.desc()).limit(10).all()
        
        if not eventos:
            print(f"⚠️ No hay eventos recientes en la base de datos")
            print(f"   Esto es normal si no ha habido eventos 'end' en las últimas {horas} horas")
            return
        
        print(f"✅ Encontrados {len(eventos)} eventos recientes:")
        eventos_con_customer = 0
        eventos_sin_customer = 0
        
        for evento in eventos:
            try:
                payload = json.loads(evento.payload)
                event_customer_id = payload.get("customer_id")
                if event_customer_id == customer_id:
                    eventos_con_customer += 1
                    camera = payload.get("camera", "N/A")
                    label = payload.get("label", "N/A")
                    frigate_type = payload.get("frigate_type", "N/A")
                    print(f"   ✅ {evento.received_at.strftime('%Y-%m-%d %H:%M:%S')} - {camera} - {label} - {frigate_type}")
                else:
                    eventos_sin_customer += 1
                    print(f"   ⚠️ {evento.received_at.strftime('%Y-%m-%d %H:%M:%S')} - customer_id: {event_customer_id} (diferente)")
            except Exception as e:
                print(f"   ❌ Error parseando evento {evento.id}: {e}")
        
        print(f"\n📊 Resumen:")
        print(f"   - Eventos con customer_id '{customer_id}': {eventos_con_customer}")
        print(f"   - Eventos con otro customer_id: {eventos_sin_customer}")
        
    finally:
        db.close()

def verificar_rule_hits(customer_id: str, horas: int = 24):
    """Verifica rule hits recientes"""
    print(f"\n🎯 Verificando rule hits de las últimas {horas} horas")
    db = SessionLocal()
    try:
        user = db.query(UserDB).filter(UserDB.username == customer_id).first()
        if not user:
            print(f"❌ Usuario no encontrado")
            return
        
        desde = datetime.utcnow() - timedelta(hours=horas)
        hits = db.query(RuleHitDB).join(RuleDB).filter(
            RuleDB.user_id == user.id,
            RuleHitDB.triggered_at >= desde
        ).order_by(RuleHitDB.triggered_at.desc()).limit(10).all()
        
        if hits:
            print(f"✅ Encontrados {len(hits)} rule hits:")
            for hit in hits:
                rule_name = hit.rule.name if hit.rule else "Desconocida"
                print(f"   - {hit.triggered_at.strftime('%Y-%m-%d %H:%M:%S')} - Regla: {rule_name}")
        else:
            print(f"ℹ️ No hay rule hits recientes")
            print(f"   Esto puede ser normal si:")
            print(f"   - No hay eventos que coincidan con las reglas")
            print(f"   - Las reglas están desactivadas")
            print(f"   - No hay eventos recientes")
    finally:
        db.close()

def main():
    print("=" * 60)
    print("🔍 VERIFICACIÓN DEL SISTEMA DE CUSTOMER_ID")
    print("=" * 60)
    
    # Obtener customer_id del argumento o variable de entorno
    if len(sys.argv) > 1:
        customer_id = sys.argv[1]
    else:
        customer_id = os.getenv("CUSTOMER_ID", "cliente_demo")
        print(f"\n💡 Usando CUSTOMER_ID: {customer_id}")
        print(f"   (Puedes pasar otro como argumento: python verificar_customer_id.py tu_username)")
    
    # Ejecutar verificaciones
    usuario_ok = verificar_usuario(customer_id)
    
    if not usuario_ok:
        print("\n❌ No se puede continuar sin un usuario válido")
        return
    
    verificar_reglas(customer_id)
    verificar_eventos_recientes(customer_id)
    verificar_rule_hits(customer_id)
    
    print("\n" + "=" * 60)
    print("✅ VERIFICACIÓN COMPLETA")
    print("=" * 60)
    print("\n💡 Próximos pasos:")
    print("   1. Asegúrate de que CUSTOMER_ID en el listener coincida con un username")
    print("   2. Genera un evento en Frigate (pasa algo frente a la cámara)")
    print("   3. Revisa los logs del listener y backend")
    print("   4. Ejecuta este script de nuevo para verificar los resultados")

if __name__ == "__main__":
    main()

