import json
from datetime import datetime
from functools import wraps
from passlib.context import CryptContext
from flask import current_app, request, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from db import db
from models import User, AuditLog


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password):
    return pwd_context.hash(password)


def verify_password(password, password_hash):
    return pwd_context.verify(password, password_hash)


def get_current_user():
    identity = get_jwt_identity()
    if not identity:
        return None
    return User.query.filter_by(email=identity).first()


def role_required(allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if user is None or user.role not in allowed_roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_app.config.get("AUTH_ENABLED", False):
            return fn(*args, **kwargs)
        verify_jwt_in_request()
        return fn(*args, **kwargs)
    return wrapper


def log_audit(action, resource=None, metadata=None):
    try:
        user = get_current_user()
        entry = AuditLog(
            user_id=user.id if user else None,
            action=action,
            resource=resource,
            metadata_json=json.dumps(metadata) if metadata else None,
            ip_address=request.remote_addr,
            created_at=datetime.utcnow()
        )
        db.session.add(entry)
        db.session.commit()
    except Exception:
        db.session.rollback()


def ensure_default_admin():
    if not current_app.config.get("AUTH_ENABLED", False):
        return
    admin_email = current_app.config.get("DEFAULT_ADMIN_EMAIL")
    admin_password = current_app.config.get("DEFAULT_ADMIN_PASSWORD")
    if not admin_email or not admin_password:
        return
    existing = User.query.filter_by(email=admin_email).first()
    if existing:
        return
    user = User(
        email=admin_email,
        password_hash=hash_password(admin_password),
        role="admin"
    )
    db.session.add(user)
    db.session.commit()