from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import asyncio

from app.db.database import get_db
from app.db.models import Document, Page
from app.services.text_extraction import extract_text_with_gpt_vision

router = APIRouter(prefix="/api")

@router.post("/extract/{document_id}")
async def start_extraction(document_id: int, db: Session = Depends(get_db)):
    """Start the text extraction process for a document"""
    # Check if document exists
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail=f"Document with ID {document_id} not found")
    
    # Update document status
    document.status = "processing"
    db.commit()
    
    # Start background extraction process
    asyncio.create_task(process_document(document_id))
    
    return {
        "message": f"Text extraction started for document {document_id}",
        "document_id": document_id
    }

async def process_document(document_id: int):
    """Process all pages of a document by extracting text using GPT Vision"""
    db = next(get_db())
    try:
        # Get document
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            print(f"Document {document_id} not found")
            return
        
        # Get all pages
        pages = db.query(Page).filter(Page.document_id == document_id).all()
        
        # Process each page
        for page in pages:
            # Skip if already processed
            if page.status == "processed":
                continue
                
            # Check if image path exists
            if not page.image_path:
                print(f"Image path not found for page {page.id}")
                continue
                
            # Extract text using GPT Vision
            result = await extract_text_with_gpt_vision(page.id, page.image_path, db)
            print(f"Page {page.page_number} extraction result: {result['success']}")
        
        # Update document status
        document = db.query(Document).filter(Document.id == document_id).first()
        if document:
            # Check if all pages are processed
            pages = db.query(Page).filter(Page.document_id == document_id).all()
            all_processed = all(page.status == "processed" for page in pages)
            
            if all_processed:
                document.status = "completed"
            else:
                # Check if any pages have error status
                any_error = any(page.status == "error" for page in pages)
                if any_error:
                    document.status = "partial"
                else:
                    document.status = "processing"
                    
            db.commit()
            
    except Exception as e:
        print(f"Error processing document: {str(e)}")
        # Update document status to error
        document = db.query(Document).filter(Document.id == document_id).first()
        if document:
            document.status = "error"
            db.commit()
    finally:
        db.close()

@router.get("/documents/{document_id}/status")
async def get_extraction_status(document_id: int, db: Session = Depends(get_db)):
    """Get the extraction status of a document"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail=f"Document with ID {document_id} not found")
    
    # Get page statuses
    pages = db.query(Page).filter(Page.document_id == document_id).all()
    page_statuses = {page.page_number: page.status for page in pages}
    
    # Calculate progress
    total_pages = len(pages)
    processed_pages = sum(1 for page in pages if page.status == "processed")
    progress = (processed_pages / total_pages) * 100 if total_pages > 0 else 0
    
    return {
        "document_id": document_id,
        "status": document.status,
        "total_pages": total_pages,
        "processed_pages": processed_pages,
        "progress": progress,
        "page_statuses": page_statuses
    } 