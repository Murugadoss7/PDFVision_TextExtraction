from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import json
import uuid
import datetime
from bs4 import BeautifulSoup
import re

from app.db.database import get_db
from app.db.models import Document, Page, ExtractedText, CorrectedText
from app.services.wordextract import WordGenerator, parse_html_to_word_format as parse_html
from app.utils.logging_config import pdf_vision_logger, generate_request_id

router = APIRouter(prefix="/api")

def parse_html_to_word_format(html_content: str, page_number: int) -> list:
    """
    Parse HTML content and convert it to Word formatting structure using htmldocx library.
    This properly handles all HTML formats including QuillJS editor output.
    
    Args:
        html_content (str): HTML content from QuillTextEditor/LLM
        page_number (int): Page number for this content
        
    Returns:
        list: List of text blocks formatted for Word generation
    """
    print(f"DEBUG: HTML parsing for page {page_number}")
    print(f"DEBUG: Original HTML (first 300 chars): {html_content[:300]}")
    
    # Use the new htmldocx-based parser
    blocks = parse_html(html_content)
    
    # Convert to the format expected by the Word generator
    text_blocks = []
    for block_number, block in enumerate(blocks):
        text_blocks.append({
            "text": block["text"],
            "page": page_number,
            "block_no": block_number,
            "line_no": 0,
            "font": "Calibri",
            "size": block.get("font_size", 11),
            "color": (0, 0, 0),  # Black
            "is_bold": block.get("bold", False),
            "is_italic": block.get("italic", False),
            "alignment": block.get("alignment", "left"),
            "is_title": False,  # Let htmldocx handle this
            "is_heading": False,  # Let htmldocx handle this
            "is_indent": False,  # Let htmldocx handle this
            "is_last_span_in_line": True,
            "bbox": [0, 0, 100, 20]  # Default bbox
        })
    
    print(f"DEBUG: Generated {len(text_blocks)} text blocks")
    for i, block in enumerate(text_blocks[:3]):  # Show first 3 blocks for debugging
        print(f"DEBUG: Block {i}: '{block['text'][:50]}...'")
    
    return text_blocks

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
    request_id = generate_request_id()
    pdf_vision_logger.log_word_export_start(request_id, document_id)
    
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        pdf_vision_logger.log_error(request_id, "WORD_EXPORT", 
                                   ValueError("Document not found"), 
                                   {"document_id": document_id})
        raise HTTPException(status_code=404, detail=f"Document with ID {document_id} not found")
    
    # Check if document has been processed OR has corrected text available
    # Get corrected text data first to determine if export is possible
    corrected_text_entry = db.query(CorrectedText).filter(CorrectedText.document_id == document_id).first()
    has_corrected_text = corrected_text_entry and corrected_text_entry.corrected_content_by_page
    
    # Allow export if document is processed OR has corrected text available
    allowed_statuses = ["completed", "images_extracted", "text_extracted", "correction_in_progress", "correction_complete"]
    if not has_corrected_text and document.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Document processing is not complete and no corrected text is available.")
    
    pages = db.query(Page).filter(Page.document_id == document_id).order_by(Page.page_number).all()
    
    has_text_to_export = False
    text_for_word = []

    # Parse corrected text data (already fetched above)
    corrected_text_by_page = {}
    if has_corrected_text:
        try:
            corrected_text_by_page = json.loads(corrected_text_entry.corrected_content_by_page)
        except json.JSONDecodeError:
            print(f"Failed to parse corrected text JSON for document {document_id}")
            has_corrected_text = False  # Reset if parsing fails

    for page in pages:
        page_text_content = None
        source = None

        # Check for corrected text first (higher priority)
        if str(page.page_number) in corrected_text_by_page:
            page_text_content = corrected_text_by_page[str(page.page_number)]
            source = "corrected"
            has_text_to_export = True
            
            # Corrected text from QuillTextEditor is HTML, so parse it properly
            if isinstance(page_text_content, str) and (page_text_content.strip().startswith('<') or '<' in page_text_content):
                # It's HTML content from QuillTextEditor - parse it
                print(f"DEBUG: Processing HTML content for page {page.page_number}")
                print(f"DEBUG: HTML content: {page_text_content[:200]}...")
                html_blocks = parse_html_to_word_format(page_text_content, page.page_number)
                print(f"DEBUG: Generated {len(html_blocks)} blocks from HTML")
                if html_blocks:  # Only add if we got valid blocks
                    text_for_word.extend(html_blocks)
                continue  # Skip to next page since we've processed this one
        elif page.extracted_text and page.extracted_text.raw_text:
            page_text_content = page.extracted_text.raw_text 
            source = "extracted"
            has_text_to_export = True
        
        if page_text_content:
            # Try to use structured formatting if available
            formatted_data = None
            formatted_text_content = None
            
            if source == "extracted" and page.extracted_text and page.extracted_text.formatted_text:
                formatted_text_content = page.extracted_text.formatted_text
                
                # Check if it's HTML content (new format) or JSON (legacy format)
                if isinstance(formatted_text_content, str) and (formatted_text_content.strip().startswith('<') or '<' in formatted_text_content):
                    # It's HTML content from the new LLM system - parse it
                    html_blocks = parse_html_to_word_format(formatted_text_content, page.page_number)
                    text_for_word.extend(html_blocks)
                    continue  # Skip to next page since we've processed this one
                else:
                    # Try to parse as JSON (legacy format)
                    try:
                        formatted_data = json.loads(formatted_text_content)
                    except json.JSONDecodeError:
                        print(f"Failed to parse formatted_text for page {page.page_number}")
            
            if formatted_data and "blocks" in formatted_data:
                # Use structured formatting data (legacy JSON format)
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
                # Fallback to simple text block (plain text or corrected text without HTML)
                # For corrected text that's not HTML, split by lines to preserve structure
                if source == "corrected":
                    lines = page_text_content.split('\n')
                    for i, line in enumerate(lines):
                        line = line.strip()
                        if line:
                            text_for_word.append({
                                "text": line,
                                "page": page.page_number,
                                "block_no": len(text_for_word),
                                "line_no": i,
                                "font": "Calibri", 
                                "size": 11,
                                "color": (0, 0, 0),
                                "is_bold": False,
                                "is_italic": False,
                                "alignment": "left",
                                "is_last_span_in_line": True,
                                "bbox": [0, 0, 100, 20]
                            })
                else:
                    # Original extracted text fallback
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
        pdf_vision_logger.log_error(request_id, "WORD_EXPORT", 
                                   ValueError("No text to export"), 
                                   {"document_id": document_id})
        raise HTTPException(status_code=400, detail="No extracted or corrected text available for this document")
    
    # Log export data
    sample_blocks = text_for_word[:3] if text_for_word else []
    pdf_vision_logger.log_word_export_data(request_id, document_id, len(text_for_word), sample_blocks)
    
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
        
        # Log successful completion
        pdf_vision_logger.log_word_export_complete(request_id, document_id, file_name)
        
        return FileResponse(
            output_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=file_name,
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{file_name}"}
        )
    except Exception as e:
        # Log the exception for debugging
        pdf_vision_logger.log_error(request_id, "WORD_EXPORT", e, {
            "document_id": document_id,
            "blocks_count": len(text_for_word),
            "filename": file_name if 'file_name' in locals() else "unknown"
        })
        print(f"Error generating Word document: {e}") # Basic logging
        raise HTTPException(status_code=500, detail=f"Could not generate Word document: {e}")

# Make sure to remove old files from temp_exports periodically or on startup if this is a long-running app.

# The rest of the file remains unchanged for now.

# Example of how the main app might need to be updated if WordGenerator is a new service
# from app.services.wordextract import WordGenerator # if not already there

# Consider adding a background task to clean up temp_exports 