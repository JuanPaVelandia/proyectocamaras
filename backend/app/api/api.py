from fastapi import APIRouter
from app.api.endpoints import auth, events, rules, frigate, cameras, oauth

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(oauth.router, prefix="/auth", tags=["oauth"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(rules.router, prefix="/rules", tags=["rules"])
api_router.include_router(frigate.router, prefix="/frigate", tags=["frigate"])
api_router.include_router(cameras.router, prefix="/cameras", tags=["cameras"])
