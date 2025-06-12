import os
import fitz  # PyMuPDF
import asyncio
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import Document, Page
from app.services.text_extraction import extract_text_with_gpt_vision
from app.utils.logging_config import pdf_vision_logger, generate_request_id

async def extract_pages_as_images(document_id: int, file_path: str, request_id: str = None):
    """Extract pages from PDF as images and save them to the extracted directory"""
    if not request_id:
        request_id = generate_request_id()
        
    db = SessionLocal()
    try:
        # Get document from database
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            pdf_vision_logger.log_error(request_id, "IMAGE_EXTRACTION", 
                                       ValueError("Document not found"), 
                                       {"document_id": document_id})
            print(f"Document {document_id} not found")
            return
        
        # Log image extraction start
        pdf_vision_logger.log_image_extraction_start(request_id, document_id)
        
        # Update document status
        old_status = document.status
        document.status = "processing"
        db.commit()
        
        # Log status update
        pdf_vision_logger.log_status_update(request_id, document_id, old_status, "processing", "Image extraction started")
        
        # Create directory for extracted images
        doc_dir = os.path.join("extracted", str(document_id))
        os.makedirs(doc_dir, exist_ok=True)
        
        # Open PDF document
        pdf_document = fitz.open(file_path)
        
        # Extract each page as an image
        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            
            # Render page to an image (higher resolution for better text extraction)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            
            # Save image
            image_path = os.path.join(doc_dir, f"page_{page_num + 1}.jpg")
            pix.save(image_path)
            
            # Update page entry in database
            db_page = db.query(Page).filter(
                Page.document_id == document_id,
                Page.page_number == page_num + 1
            ).first()
            
            if db_page:
                db_page.image_path = image_path
                db.commit()
        
        # Update document status to indicate images are extracted
        old_status = document.status
        document.status = "images_extracted"
        db.commit()
        
        # Log image extraction completion
        pdf_vision_logger.log_image_extraction_complete(request_id, document_id, len(pdf_document))
        pdf_vision_logger.log_status_update(request_id, document_id, old_status, "images_extracted", "Image extraction completed")
        
        # Start the text extraction process immediately and wait for it to complete
        print(f"Starting text extraction for document {document_id}")
        
        # Process each page for text extraction - ACTUALLY AWAIT THE RESULTS
        pages = db.query(Page).filter(Page.document_id == document_id).all()
        extraction_tasks = []
        
        # Create all the extraction tasks
        for page in pages:
            if page.image_path:
                print(f"Creating text extraction task for page {page.page_number}")
                # Log LLM processing start
                pdf_vision_logger.log_llm_processing_start(request_id, page.id, page.page_number)
                
                # Instead of just creating tasks, we'll collect them to await them
                task = extract_text_with_gpt_vision(page.id, page.image_path, db, request_id)
                extraction_tasks.append(task)
        
        # Actually execute (at least one of) the extraction tasks
        if extraction_tasks:
            print(f"Awaiting first extraction task to ensure proper initialization")
            # At minimum, await the first task to make sure client initialization works
            first_result = await extraction_tasks[0]
            print(f"First page extraction result: {first_result}")
            
            # Create background tasks for the rest
            for task in extraction_tasks[1:]:
                asyncio.create_task(task)
        
        return {
            "success": True,
            "document_id": document_id,
            "pages_extracted": len(pdf_document)
        }
        
    except Exception as e:
        # Update document status to error
        document = db.query(Document).filter(Document.id == document_id).first()
        if document:
            document.status = "error"
            db.commit()
            
        print(f"Error extracting pages: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        db.close() 