#!/usr/bin/env python3
"""
Script para revisar las reglas de usuarios y verificar que estén en UTC.

Uso:
    python check_rules_timezone.py
    python check_rules_timezone.py --user username
    python check_rules_timezone.py --all
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.all_models import RuleDB, UserDB
from app.utils.timezone_utils import get_timezone_from_phone
import argparse

def check_rules(username=None, show_all=False):
    """Revisa las reglas y muestra información de timezone"""
    db = SessionLocal()
    try:
        if show_all:
            # Mostrar todas las reglas de todos los usuarios
            rules = db.query(RuleDB).order_by(RuleDB.user_id, RuleDB.id).all()
            print("\n" + "="*80)
            print("📋 TODAS LAS REGLAS (Todos los usuarios)")
            print("="*80)
        elif username:
            # Mostrar reglas de un usuario específico
            user = db.query(UserDB).filter(UserDB.username == username).first()
            if not user:
                print(f"❌ Usuario '{username}' no encontrado")
                return
            rules = db.query(RuleDB).filter(RuleDB.user_id == user.id).all()
            print("\n" + "="*80)
            print(f"📋 REGLAS DEL USUARIO: {username}")
            print("="*80)
        else:
            # Mostrar resumen por usuario
            users = db.query(UserDB).all()
            print("\n" + "="*80)
            print("📊 RESUMEN DE REGLAS POR USUARIO")
            print("="*80)
            
            for user in users:
                user_rules = db.query(RuleDB).filter(RuleDB.user_id == user.id).all()
                if user_rules:
                    print(f"\n👤 Usuario: {user.username} (ID: {user.id})")
                    print(f"   📧 Email: {user.email}")
                    print(f"   🕐 Timezone: {user.timezone or 'UTC (no configurado)'}")
                    if user.whatsapp_number:
                        detected_tz = get_timezone_from_phone(user.whatsapp_number)
                        print(f"   📱 Teléfono: {user.whatsapp_number} → Timezone detectado: {detected_tz}")
                    
                    rules_with_time = [r for r in user_rules if r.time_start or r.time_end]
                    if rules_with_time:
                        print(f"   📋 Reglas con horario: {len(rules_with_time)}/{len(user_rules)}")
                        for rule in rules_with_time:
                            print(f"      • {rule.name}")
                            print(f"        Horario: {rule.time_start or 'N/A'} - {rule.time_end or 'N/A'} (UTC)")
                            if user.timezone and user.timezone != "UTC":
                                from app.utils.timezone_utils import convert_local_time_to_utc
                                # Convertir de UTC a hora local para mostrar
                                try:
                                    import pytz
                                    from datetime import datetime, time
                                    
                                    tz = pytz.timezone(user.timezone)
                                    if rule.time_start:
                                        hour, minute = map(int, rule.time_start.split(':'))
                                        utc_time = time(hour, minute)
                                        today = datetime.now(pytz.UTC).date()
                                        utc_dt = pytz.UTC.localize(datetime.combine(today, utc_time))
                                        local_dt = utc_dt.astimezone(tz)
                                        local_start = local_dt.strftime("%H:%M")
                                    else:
                                        local_start = "N/A"
                                    
                                    if rule.time_end:
                                        hour, minute = map(int, rule.time_end.split(':'))
                                        utc_time = time(hour, minute)
                                        utc_dt = pytz.UTC.localize(datetime.combine(today, utc_time))
                                        local_dt = utc_dt.astimezone(tz)
                                        local_end = local_dt.strftime("%H:%M")
                                    else:
                                        local_end = "N/A"
                                    
                                    print(f"        Equivale a: {local_start} - {local_end} ({user.timezone})")
                                except Exception as e:
                                    print(f"        (Error calculando hora local: {e})")
                    else:
                        print(f"   📋 Reglas sin horario: {len(user_rules)}")
            return
        
        # Mostrar detalles de reglas
        if not rules:
            print("\n❌ No se encontraron reglas")
            return
        
        current_user_id = None
        for rule in rules:
            user = db.query(UserDB).filter(UserDB.id == rule.user_id).first()
            
            # Mostrar separador por usuario
            if rule.user_id != current_user_id:
                current_user_id = rule.user_id
                print(f"\n{'='*80}")
                print(f"👤 Usuario: {user.username if user else 'Desconocido'} (ID: {rule.user_id})")
                if user:
                    print(f"   📧 Email: {user.email}")
                    print(f"   🕐 Timezone: {user.timezone or 'UTC (no configurado)'}")
                    if user.whatsapp_number:
                        detected_tz = get_timezone_from_phone(user.whatsapp_number)
                        print(f"   📱 Teléfono: {user.whatsapp_number} → Timezone: {detected_tz}")
                print(f"{'='*80}")
            
            print(f"\n📋 Regla ID: {rule.id} - {rule.name}")
            print(f"   Estado: {'✅ Activa' if rule.enabled else '❌ Inactiva'}")
            print(f"   Cámara: {rule.camera or 'Todas'}")
            print(f"   Label: {rule.label or 'Todos'}")
            
            if rule.time_start or rule.time_end:
                print(f"   ⏰ Horario UTC: {rule.time_start or 'N/A'} - {rule.time_end or 'N/A'}")
                
                # Convertir a hora local si el usuario tiene timezone
                if user and user.timezone and user.timezone != "UTC":
                    try:
                        import pytz
                        from datetime import datetime, time
                        
                        tz = pytz.timezone(user.timezone)
                        if rule.time_start:
                            hour, minute = map(int, rule.time_start.split(':'))
                            utc_time = time(hour, minute)
                            today = datetime.now(pytz.UTC).date()
                            utc_dt = pytz.UTC.localize(datetime.combine(today, utc_time))
                            local_dt = utc_dt.astimezone(tz)
                            local_start = local_dt.strftime("%H:%M")
                        else:
                            local_start = "N/A"
                        
                        if rule.time_end:
                            hour, minute = map(int, rule.time_end.split(':'))
                            utc_time = time(hour, minute)
                            utc_dt = pytz.UTC.localize(datetime.combine(today, utc_time))
                            local_dt = utc_dt.astimezone(tz)
                            local_end = local_dt.strftime("%H:%M")
                        else:
                            local_end = "N/A"
                        
                        print(f"   ⏰ Horario Local ({user.timezone}): {local_start} - {local_end}")
                    except Exception as e:
                        print(f"   ⚠️  Error calculando hora local: {e}")
            else:
                print(f"   ⏰ Horario: Sin restricción")
            
            print(f"   Creada: {rule.created_at}")
        
        print(f"\n{'='*80}")
        print(f"✅ Total de reglas: {len(rules)}")
        print(f"{'='*80}\n")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Revisar reglas y verificar timezone')
    parser.add_argument('--user', type=str, help='Username específico a revisar')
    parser.add_argument('--all', action='store_true', help='Mostrar todas las reglas de todos los usuarios')
    
    args = parser.parse_args()
    
    check_rules(username=args.user, show_all=args.all)



