from fastapi import FastAPI

app = FastAPI(title="DANN API")


@app.get("/health")
def health():
    return {"status": "ok"}

# Friend's routers get included here as they're built, e.g.:
# from app.routers import inventory
# app.include_router(inventory.router)

# Your agents router gets included here once it exists:
# from app.agents.routes.intelligence_routes import router as agents_router
# app.include_router(agents_router)
