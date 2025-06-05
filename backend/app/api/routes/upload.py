from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
import os
import uuid
import fitz  # PyMuPDF
from datetime import datetime

from app.db.database import get_db
from app.db.models import Document, Page
from app.services.pdf_processing import extract_pages_as_images

router = APIRouter(prefix="/api")

@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...), 
    background_tasks: BackgroundTasks = None,
    db = Depends(get_db)
):
    """Upload a PDF file and start processing"""
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Create a unique filename
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    unique_filename = f"{timestamp}_{uuid.uuid4()}.pdf"
    file_path = os.path.join("uploads", unique_filename)
    
    # Save uploaded file
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create document entry in database
    try:
        # Get page count using PyMuPDF
        pdf_document = fitz.open(file_path)
        total_pages = len(pdf_document)
        
        # Create document in database
        db_document = Document(
            filename=file.filename,
            file_path=file_path,
            total_pages=total_pages,
            status="uploaded"
        )
        db.add(db_document)
        db.commit()
        db.refresh(db_document)
        
        # Create entries for each page
        for page_num in range(total_pages):
            db_page = Page(
                document_id=db_document.id,
                page_number=page_num + 1,  # 1-indexed for user-facing operations
                status="pending"
            )
            db.add(db_page)
        db.commit()
        
        # Process document in background only if not already processed
        if db_document.status == "uploaded":  # Only process if newly uploaded
            background_tasks.add_task(
                extract_pages_as_images, 
                document_id=db_document.id, 
                file_path=file_path
            )
        
        return {
            "document_id": db_document.id,
            "filename": file.filename,
            "total_pages": total_pages,
            "message": "Upload successful, processing started"
        }
        
    except Exception as e:
        # Clean up the file if database operation fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded file: {str(e)}") 