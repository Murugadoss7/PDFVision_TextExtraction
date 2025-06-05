from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import json
import uuid
import datetime

from app.db.database import get_db
from app.db.models import Document, Page, ExtractedText, CorrectedText
from app.services.wordextract import WordGenerator

router = APIRouter(prefix="/api")

@router.get("/documents")
async def get_documents(db: Session = Depends(get_db)):
    """Get a list of all documents"""
    documents = db.query(Document).all()
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "upload_date": doc.upload_date,
            "total_pages": doc.total_pages,
            "status": doc.status
        } for doc in documents
    ]

@router.get("/documents/{document_id}")
async def get_document(document_id: int, db: Session = Depends(get_db)):
    """Get details of a specific document"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail=f"Document with ID {document_id} not found")
    
    return {
        "id": document.id,
        "filename": document.filename,
        "file_path": document.file_path,
        "upload_date": document.upload_date,
        "total_pages": document.total_pages,
        "status": document.status
    }

@router.get("/documents/{document_id}/file")
async def get_document_file(document_id: int, db: Session = Depends(get_db)):
    """Get the PDF file for a document"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail=f"Document with ID {document_id} not found")
    
    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    return FileResponse(
        document.file_path,
        media_type="application/pdf",
        filename=document.filename
    )

@router.get("/documents/{document_id}/pages")
async def get_document_pages(document_id: int, db: Session = Depends(get_db)):
    """Get all pages for a document"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail=f"Document with ID {document_id} not found")
    
    pages = db.query(Page).filter(Page.document_id == document_id).all()
    return [
        {
            "id": page.id,
            "page_number": page.page_number,
            "status": page.status,
            "has_extracted_text": page.extracted_text is not None
        } for page in pages
    ]

@router.get("/documents/{document_id}/pages/{page_number}/image")
async def get_page_image(document_id: int, page_number: int, db: Session = Depends(get_db)):
    """Get the image for a specific page"""
    page = db.query(Page).filter(
        Page.document_id == document_id,
        Page.page_number == page_number
    ).first()
    
    if not page:
        raise HTTPException(status_code=404, detail=f"Page {page_number} not found for document {document_id}")
    
    if not page.image_path or not os.path.exists(page.image_path):
        raise HTTPException(status_code=404, detail="Page image not found")
    
    return FileResponse(
        page.image_path,
        media_type="image/jpeg"
    )

@router.get("/documents/{document_id}/pages/{page_number}/text")
async def get_page_text(document_id: int, page_number: int, db: Session = Depends(get_db)):
    """Get the extracted text for a specific page - returns corrected text if available, otherwise original OCR text"""
    page = db.query(Page).filter(
        Page.document_id == document_id,
        Page.page_number == page_number
    ).first()
    
    if not page:
        raise HTTPException(status_code=404, detail=f"Page {page_number} not found for document {document_id}")
    
    # Check for corrected text first (higher priority)
    corrected_text_entry = db.query(CorrectedText).filter(CorrectedText.document_id == document_id).first()
    corrected_text_by_page = {}
    if corrected_text_entry and corrected_text_entry.corrected_content_by_page:
        try:
            corrected_text_by_page = json.loads(corrected_text_entry.corrected_content_by_page)
        except json.JSONDecodeError:
            print(f"Failed to parse corrected text JSON for document {document_id}")
    
    # Return corrected text if available
    if str(page_number) in corrected_text_by_page:
        return {
            "text": corrected_text_by_page[str(page_number)],
            "formatted_text": None,  # Corrected text is plain text
            "status": "corrected",
            "source": "corrected_text"
        }
    
    # Fall back to original extracted text
    if not page.extracted_text:
        return {
            "text": "",
            "status": "not_extracted",
            "message": "Text not yet extracted for this page"
        }
    
    return {
        "text": page.extracted_text.raw_text,
        "formatted_text": page.extracted_text.formatted_text,
        "status": "extracted",
        "source": "original_ocr",
        "extraction_date": page.extracted_text.extraction_date
    }

@router.delete("/documents/{document_id}")
async def delete_document(document_id: int, db: Session = Depends(get_db)):
    """Delete a document and all associated pages and text"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail=f"Document with ID {document_id} not found")
    
    # Delete the PDF file
    if os.path.exists(document.file_path):
        os.remove(document.file_path)
    
    # Delete page images
    pages = db.query(Page).filter(Page.document_id == document_id).all()
    for page in pages:
        if page.image_path and os.path.exists(page.image_path):
            os.remove(page.image_path)
    
    # Delete document from database (will cascade delete pages and extracted text)
    db.delete(document)
    db.commit()
    
    return {"message": f"Document {document_id} deleted successfully"}

@router.get("/documents/{document_id}/export/word")
async def export_document_to_word(document_id: int, db: Session = Depends(get_db)):
    """Export the document to Word format with all extracted text"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail=f"Document with ID {document_id} not found")
    
    # Make sure document has been processed (original check, might need adjustment if corrected text exists without full processing)
    # For now, keeping it, as correction implies prior extraction.
    if document.status not in ["completed", "images_extracted", "text_extracted", "correction_in_progress", "correction_complete"]:
        raise HTTPException(status_code=400, detail="Document processing is not complete or not in a correctable state.")
    
    pages = db.query(Page).filter(Page.document_id == document_id).order_by(Page.page_number).all()
    
    has_text_to_export = False
    text_for_word = []

    # Get corrected text data (stored as JSON per document, not per page)
    corrected_text_entry = db.query(CorrectedText).filter(CorrectedText.document_id == document_id).first()
    corrected_text_by_page = {}
    if corrected_text_entry and corrected_text_entry.corrected_content_by_page:
        try:
            corrected_text_by_page = json.loads(corrected_text_entry.corrected_content_by_page)
        except json.JSONDecodeError:
            print(f"Failed to parse corrected text JSON for document {document_id}")

    for page in pages:
        page_text_content = None
        source = None

        # Check for corrected text first (higher priority)
        if str(page.page_number) in corrected_text_by_page:
            page_text_content = corrected_text_by_page[str(page.page_number)]
            source = "corrected"
            has_text_to_export = True
        elif page.extracted_text and page.extracted_text.raw_text:
            page_text_content = page.extracted_text.raw_text 
            source = "extracted"
            has_text_to_export = True
        
        if page_text_content:
            # Try to use structured formatting if available
            formatted_data = None
            if source == "extracted" and page.extracted_text and page.extracted_text.formatted_text:
                try:
                    formatted_data = json.loads(page.extracted_text.formatted_text)
                except json.JSONDecodeError:
                    print(f"Failed to parse formatted_text for page {page.page_number}")
            
            if formatted_data and "blocks" in formatted_data:
                # Use structured formatting data
                for block in formatted_data["blocks"]:
                    text_for_word.append({
                        "text": block.get("text", ""),
                        "page": page.page_number,
                        "block_no": block.get("block_no", len(text_for_word)),
                        "line_no": 0,
                        "font": "Calibri",
                        "size": block.get("font_size", 11),
                        "color": (0, 0, 0),  # Black
                        "is_bold": block.get("is_bold", False),
                        "is_italic": block.get("is_italic", False),
                        "alignment": block.get("alignment", "left"),
                        "is_title": block.get("is_title", False),
                        "is_heading": block.get("is_heading", False),
                        "is_indent": block.get("is_indent", False),
                        "is_last_span_in_line": True,
                        "bbox": [0, 0, 100, 20]  # Default bbox
                    })
            else:
                # Fallback to simple text block
                text_for_word.append({
                    "text": page_text_content,
                    "page": page.page_number,
                    "block_no": len(text_for_word),
                    "line_no": 0,
                    "font": "Calibri", 
                    "size": 11,
                    "color": (0, 0, 0),
                    "is_bold": False,
                    "is_italic": False,
                    "alignment": "left",
                    "is_last_span_in_line": True,
                    "bbox": [0, 0, 100, 20]
                })

    if not has_text_to_export:
        raise HTTPException(status_code=400, detail="No extracted or corrected text available for this document")
    
    # Generate Word document using the collected text_for_word
    try:
        # Ensure the output directory exists
        output_dir = "temp_exports"
        os.makedirs(output_dir, exist_ok=True)
        
        # Sanitize filename
        safe_filename = "".join(c if c.isalnum() else "_" for c in document.filename)
        if not safe_filename.lower().endswith(".pdf"):
            safe_filename += f"_doc_{document.id}"
        else:
            safe_filename = safe_filename[:-4] + f"_doc_{document.id}"

        file_name = f"{safe_filename}_corrected.docx"
        output_path = os.path.join(output_dir, file_name)
        
        # Use the WordGenerator service
        word_generator = WordGenerator(text_for_word)
        word_generator.generate_document(output_path)
        
        return FileResponse(
            output_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=file_name,
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{file_name}"}
        )
    except Exception as e:
        # Log the exception for debugging
        print(f"Error generating Word document: {e}") # Basic logging
        # Consider using a proper logger: logger.error(f"Error generating Word document: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Could not generate Word document: {e}")

# Make sure to remove old files from temp_exports periodically or on startup if this is a long-running app.

# The rest of the file remains unchanged for now.

# Example of how the main app might need to be updated if WordGenerator is a new service
# from app.services.wordextract import WordGenerator # if not already there

# Consider adding a background task to clean up temp_exports 