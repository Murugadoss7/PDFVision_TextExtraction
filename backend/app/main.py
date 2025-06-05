from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

from app.api.routes import documents, upload, extract, correction
from app.db.database import engine, Base

# Load environment variables
load_dotenv()

# Create required directories
os.makedirs("uploads", exist_ok=True)
os.makedirs("extracted", exist_ok=True)
os.makedirs("exports", exist_ok=True)
os.makedirs("database", exist_ok=True)

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="PDF Vision Text Extractor API",
    description="API for extracting text from PDF documents using GPT Vision",
    version="1.0.0"
)

# Configure CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(upload.router, tags=["Upload"])
app.include_router(documents.router, tags=["Documents"])
app.include_router(extract.router, tags=["Extraction"])
app.include_router(correction.router)

# Mount static files for accessing uploads and extracted images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/extracted", StaticFiles(directory="extracted"), name="extracted")
app.mount("/exports", StaticFiles(directory="exports"), name="exports")

@app.get("/", tags=["Root"])
async def read_root():
    """Root endpoint"""
    return {
        "message": "Welcome to the PDF Vision Text Extractor API",
        "docs": "/docs",
        "version": "1.0.0"
    } 