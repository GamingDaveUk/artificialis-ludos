from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from .routers import settings, playground

load_dotenv()

# Note the dots (.) before the module names
from .database import engine
from . import models
from .routers import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[SYSTEM] Booting Ludos Engine...")
    models.Base.metadata.create_all(bind=engine)
    print("[SYSTEM] Database ready.")
    yield
    print("[SYSTEM] Engine shutting down.")

app = FastAPI(title="Artificialis Ludos API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(settings.router)
app.include_router(playground.router)
