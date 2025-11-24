from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import jwt

from app.core.security import create_access_token, create_refresh_token, verify_password
from app.core.config import settings
from app.db import get_db
from app.schemas.auth_token import Token
from app.crud import crud_user 

router = APIRouter()

@router.post("/login", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """사용자 인증 후 jwt 액세스 토큰 및 리프레시 토큰 발급"""
    user = crud_user.get_user_by_login_id(db, login_id=form_data.username)

    if not user or not verify_password(form_data.password, user.hashed_pw):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 두 가지 토큰 모두 생성
    access_token = create_access_token(data={"sub": user.login_id})
    refresh_token = create_refresh_token(data={"sub": user.login_id})

    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "refresh_token": refresh_token # 반환값에 추가
    }

# 토큰 갱신 엔드포인트
@router.post("/refresh", response_model=Token)
def refresh_token(
    refresh_token: str = Body(..., embed=True), # JSON body에서 refresh_token을 받음
    db: Session = Depends(get_db)
):
    """리프레시 토큰을 사용하여 새로운 액세스 토큰 발급"""
    try:
        payload = jwt.decode(
            refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        login_id: str = payload.get("sub")
        if login_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
            
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 유저가 여전히 존재하는지 확인
    user = crud_user.get_user_by_login_id(db, login_id=login_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # 새로운 토큰 발급
    new_access_token = create_access_token(data={"sub": user.login_id})
    # 리프레시 토큰도 새로 발급하여 유효기간 연장
    new_refresh_token = create_refresh_token(data={"sub": user.login_id})

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "refresh_token": new_refresh_token
    }