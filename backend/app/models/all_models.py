from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Nullable para usuarios OAuth
    whatsapp_number = Column(String(50), nullable=True)
    
    # OAuth fields
    oauth_provider = Column(String(50), nullable=True)  # 'google', 'facebook', etc.
    oauth_id = Column(String(255), nullable=True)  # ID del usuario en el proveedor OAuth
    email = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    rules = relationship("RuleDB", back_populates="user")


class EventDB(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    received_at = Column(DateTime, index=True)
    payload = Column(Text)

    rule_hits = relationship("RuleHitDB", back_populates="event")


class CameraDB(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)  # Nombre en Frigate
    rtsp_url = Column(String(500), nullable=True)  # URL RTSP (opcional, informativo)
    description = Column(Text, nullable=True)  # Descripción opcional
    enabled = Column(Boolean, default=True)  # Si está activa
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relación con usuario que la creó
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user = relationship("UserDB")



class RuleDB(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    enabled = Column(Boolean, default=True)

    camera = Column(String(255), nullable=True)
    label = Column(String(255), nullable=True)
    frigate_type = Column(String(50), nullable=True)
    min_score = Column(Float, nullable=True)
    min_duration_seconds = Column(Float, nullable=True)
    custom_message = Column(Text, nullable=True)  # Mensaje personalizado
    
    # Rango horario para notificaciones (formato HH:MM, ej: "08:00", "22:00")
    time_start = Column(String(5), nullable=True)  # Hora de inicio (ej: "08:00")
    time_end = Column(String(5), nullable=True)   # Hora de fin (ej: "22:00")

    created_at = Column(DateTime, default=datetime.utcnow)

    # dueño de la regla (multiusuario)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user = relationship("UserDB", back_populates="rules")

    hits = relationship("RuleHitDB", back_populates="rule")


class RuleHitDB(Base):
    __tablename__ = "rule_hits"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("rules.id"))
    event_id = Column(Integer, ForeignKey("events.id"))
    triggered_at = Column(DateTime, default=datetime.utcnow)
    action = Column(String(255), default="whatsapp")

    rule = relationship("RuleDB", back_populates="hits")
    event = relationship("EventDB", back_populates="rule_hits")
