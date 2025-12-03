import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_email(to_email: str, subject: str, html_content: str):
    """
    Envía un correo electrónico usando SMTP.
    """
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logging.warning("⚠️ SMTP no configurado. No se envió el correo.")
        logging.info(f"📧 [SIMULACIÓN] Para: {to_email} | Asunto: {subject}")
        return

    # Validar configuración antes de intentar conexión
    if not settings.SMTP_HOST.strip():
        logging.error("❌ SMTP_HOST está vacío o no configurado")
        return
    
    if not settings.SMTP_PASSWORD:
        logging.error("❌ SMTP_PASSWORD no está configurado")
        return

    try:
        msg = MIMEMultipart()
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject

        msg.attach(MIMEText(html_content, "html"))

        logging.info(f"📧 Intentando conectar a SMTP: {settings.SMTP_HOST}:{settings.SMTP_PORT}")
        
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
            server.starttls()

        logging.info(f"📧 Autenticando con usuario: {settings.SMTP_USER}")
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        
        logging.info(f"📧 Enviando mensaje a {to_email}")
        server.send_message(msg)
        server.quit()
        
        logging.info(f"✅ Correo enviado exitosamente a {to_email}")
    except smtplib.SMTPConnectError as e:
        logging.error(f"❌ Error de conexión SMTP: No se pudo conectar a {settings.SMTP_HOST}:{settings.SMTP_PORT}")
        logging.error(f"   Detalle: {e}")
        logging.error(f"   Verifica que el servidor SMTP sea accesible y que el puerto no esté bloqueado por firewall")
    except smtplib.SMTPAuthenticationError as e:
        logging.error(f"❌ Error de autenticación SMTP: Credenciales incorrectas")
        logging.error(f"   Detalle: {e}")
    except OSError as e:
        error_code = getattr(e, 'errno', None)
        logging.error(f"❌ Error de red (OSError): {e}")
        logging.error(f"   Código de error: {error_code}")
        logging.error(f"   El servidor no puede alcanzar {settings.SMTP_HOST}:{settings.SMTP_PORT}")
        if error_code == 101:  # Network is unreachable
            logging.error(f"   ⚠️ Red no alcanzable - Posibles causas:")
            logging.error(f"      • El servidor SMTP no es accesible desde este servidor")
            logging.error(f"      • Firewall bloqueando conexiones salientes al puerto {settings.SMTP_PORT}")
            logging.error(f"      • Problema de DNS (no puede resolver {settings.SMTP_HOST})")
            logging.error(f"      • El servidor está en una red restringida")
        logging.error(f"   Verifica:")
        logging.error(f"      • SMTP_HOST está correcto: {settings.SMTP_HOST}")
        logging.error(f"      • El puerto {settings.SMTP_PORT} no está bloqueado")
        logging.error(f"      • Si estás en Railway/cloud, verifica que permita conexiones SMTP salientes")
    except Exception as e:
        logging.error(f"❌ Error enviando correo: {type(e).__name__}: {e}")
        logging.error(f"   SMTP_HOST: {settings.SMTP_HOST}")
        logging.error(f"   SMTP_PORT: {settings.SMTP_PORT}")
        logging.error(f"   SMTP_USER: {settings.SMTP_USER}")

def send_reset_password_email(to_email: str, token: str):
    """
    Envía el correo de recuperación de contraseña.
    """
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    
    subject = "Recuperación de Contraseña - Vidria"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #059669; text-align: center;">Recuperación de Contraseña</h2>
                <p>Hola,</p>
                <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>Vidria</strong>.</p>
                <p>Para continuar, haz clic en el siguiente botón:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer Contraseña</a>
                </div>
                <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
                <p>El enlace expirará en 15 minutos.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2025 Vidria Security. Todos los derechos reservados.</p>
            </div>
        </body>
    </html>
    """
    
    send_email(to_email, subject, html_content)
