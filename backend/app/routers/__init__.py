from app.routers.analytics_router import router as analytics_router
from app.routers.auth_router import router as auth_router
from app.routers.documentation_router import router as documentation_router
from app.routers.org_router import router as org_router
from app.routers.project_router import router as project_router

__all__ = ["analytics_router", "auth_router", "documentation_router", "org_router", "project_router"]


