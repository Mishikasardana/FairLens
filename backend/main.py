from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

from routers import dataset, audit, report, health

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("FairLens API starting up...")
    yield
    print("FairLens API shutting down.")

app = FastAPI(
    title="FairLens API",
    description="AI-powered bias detection and fairness auditing for datasets",
    version="1.0.0",
    lifespan=lifespan
)

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(dataset.router, prefix="/api/dataset", tags=["dataset"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(report.router, prefix="/api/report", tags=["report"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
