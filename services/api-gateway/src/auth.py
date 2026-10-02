import logging
from datetime import datetime, timedelta, timezone
from typing import Any
import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

try:
    from .config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
except ImportError:
    from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS

logger = logging.getLogger("gateway-auth")
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hashes a plain password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Generates a signed JWT access token containing tenant and user identity."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)

    # Standardize sub and user_id
    user_id = to_encode.get("user_id") or to_encode.get("sub")
    if user_id:
        to_encode["sub"] = str(user_id)
        to_encode["user_id"] = str(user_id)

    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    """Decodes and validates a JWT token signature and expiration."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any]:
    """
    Validates identity from Authorization header (Bearer) or 'stoki_session' httpOnly cookie.
    Expected payload fields: 'user_id' / 'sub', 'tenant_id', 'email', 'role'.
    """
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    elif request.cookies.get("stoki_session"):
        token = request.cookies.get("stoki_session")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    user_id = payload.get("user_id") or payload.get("sub")

    if not user_id or not payload.get("tenant_id"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token: user_id or tenant_id missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload["user_id"] = str(user_id)
    return payload


async def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any] | None:
    """Extracts user payload if token is present in header or cookie, else returns None."""
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    elif request.cookies.get("stoki_session"):
        token = request.cookies.get("stoki_session")

    if not token:
        return None

    try:
        payload = decode_access_token(token)
        user_id = payload.get("user_id") or payload.get("sub")
        if user_id:
            payload["user_id"] = str(user_id)
        return payload
    except HTTPException:
        return None

