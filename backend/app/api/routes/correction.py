from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
import json # For handling JSON in text fields if needed
import logging
import os

from app.db.database import get_db
from app.db import models
from app.services.editable_pdf_service import EditablePDFService
from app.services.text_comparison_service import TextComparisonService
from app.utils.logging_config import pdf_vision_logger, generate_request_id
from app.schemas.correction_schemas import (
    EditablePDFUploadResponse,
    PageComparisonResponse,
    DifferenceSegment,
    PageCorrectionPayload,
    PageCorrectionResponse,
    FinalCorrectedTextResponse
)

router = APIRouter(
    prefix="/api/correction",
    tags=["Correction"] # Tag for API docs
)

logger = logging.getLogger(__name__)

# Ensure uploads directory exists (though main.py should also do this)
UPLOADS_DIR_CORRECTION = "uploads/correction_inputs"
os.makedirs(UPLOADS_DIR_CORRECTION, exist_ok=True)

@router.post("/documents/{document_id}/editable-pdf", response_model=EditablePDFUploadResponse)
async def upload_editable_pdf_for_correction(
    document_id: int,
    editable_pdf_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    service: EditablePDFService = Depends(EditablePDFService) # Inject service
):
    """
    Uploads an 'editable PDF' (Document B) associated with an existing primary document (Document A).
    Extracts text layer from Document B and stores it.
    """
    try:
        # Validate Document A exists
        doc_a = db.query(models.Document).filter(models.Document.id == document_id).first()
        if not doc_a:
            logger.warning(f"Upload Editable PDF: Document A with ID {document_id} not found.")
            raise HTTPException(status_code=404, detail=f"Primary document (Document A) with ID {document_id} not found.")

        # Save the uploaded editable PDF (Document B)
        file_location = os.path.join(UPLOADS_DIR_CORRECTION, f"docA_{document_id}_editable_{editable_pdf_file.filename}")
        with open(file_location, "wb+") as file_object:
            file_object.write(editable_pdf_file.file.read())
        logger.info(f"Uploaded editable PDF for document ID {document_id} to {file_location}")

        # Extract text from the editable PDF using the service
        extracted_text_b_by_page = service.extract_text_from_editable_pdf(file_location, str(document_id)) # service expects str ID

        if not extracted_text_b_by_page:
            logger.warning(f"No text extracted from editable PDF: {file_location} for document ID {document_id}")
            # Optionally delete the uploaded file if no text extracted and that's considered an error
            # os.remove(file_location)
            raise HTTPException(status_code=400, detail="No text could be extracted from the provided editable PDF or PDF is empty/corrupt.")

        # Store this extracted text (Text_B)
        # Check if an entry already exists for this document_id
        db_editable_text = db.query(models.EditablePDFText).filter(models.EditablePDFText.document_id == document_id).first()
        if db_editable_text:
            db_editable_text.text_content_by_page = json.dumps(extracted_text_b_by_page) # Store as JSON string
            logger.info(f"Updated existing EditablePDFText for document ID {document_id}")
        else:
            db_editable_text = models.EditablePDFText(
                document_id=document_id,
                text_content_by_page=json.dumps(extracted_text_b_by_page) # Store as JSON string
            )
            db.add(db_editable_text)
            logger.info(f"Created new EditablePDFText for document ID {document_id}")
        
        db.commit()
        db.refresh(db_editable_text)

        return EditablePDFUploadResponse(
            message="Editable PDF (Document B) uploaded and text extracted successfully.", 
            document_id=document_id,
            editable_pdf_internal_id=db_editable_text.id
        )
    except HTTPException as http_exc:
        raise http_exc # Re-raise HTTPException to ensure FastAPI handles it
    except Exception as e:
        logger.error(f"Error uploading editable PDF for document ID {document_id}: {e}", exc_info=True)
        # Clean up uploaded file on error if it exists
        if os.path.exists(file_location):
             try:
                 os.remove(file_location)
             except Exception as e_del:
                 logger.error(f"Failed to cleanup file {file_location} on error: {e_del}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@router.get("/documents/{document_id}/compare/page/{page_number}", response_model=PageComparisonResponse)
async def get_page_comparison_data(
    document_id: int,
    page_number: int,
    db: Session = Depends(get_db),
    comparison_service: TextComparisonService = Depends(TextComparisonService)
):
    """
    Fetches Text A (OCR), Text B (Editable PDF text), and their differences for a specific page.
    """
    try:
        # Fetch Document A (original document)
        doc_a = db.query(models.Document).filter(models.Document.id == document_id).first()
        if not doc_a:
            logger.warning(f"Compare Page: Document A with ID {document_id} not found.")
            raise HTTPException(status_code=404, detail=f"Document A with ID {document_id} not found.")

        # Fetch Page object for Text A (OCR text)
        page_obj_a = db.query(models.Page).filter(
            models.Page.document_id == document_id, 
            models.Page.page_number == page_number
        ).first()
        
        text_a_ocr: Optional[str] = None
        formatted_text_a: Optional[str] = None
        if page_obj_a and page_obj_a.extracted_text:
            text_a_ocr = page_obj_a.extracted_text.raw_text # Assuming raw_text holds the OCR output
            formatted_text_a = page_obj_a.extracted_text.formatted_text # Get formatted text JSON
        else:
            logger.info(f"Compare Page: No OCR text (Text A) found for document {document_id}, page {page_number}.")
            # Allow proceeding if Text B exists, frontend can handle missing Text A

        # Fetch Text B (from EditablePDFText table)
        editable_pdf_text_entry = db.query(models.EditablePDFText).filter(models.EditablePDFText.document_id == document_id).first()
        text_b_editable: Optional[str] = None
        if editable_pdf_text_entry and editable_pdf_text_entry.text_content_by_page:
            try:
                text_b_all_pages = json.loads(editable_pdf_text_entry.text_content_by_page)
                text_b_editable = text_b_all_pages.get(str(page_number)) # Page numbers stored as str keys in JSON
            except json.JSONDecodeError:
                logger.error(f"Compare Page: Failed to parse JSON for Text B, document {document_id}. Content: {editable_pdf_text_entry.text_content_by_page}")
                raise HTTPException(status_code=500, detail="Error retrieving Text B data.")
        
        if text_a_ocr is None and text_b_editable is None:
             logger.warning(f"Compare Page: Neither Text A nor Text B found for document {document_id}, page {page_number}.")
             raise HTTPException(status_code=404, detail=f"No text data (neither OCR nor editable PDF) found for document {document_id}, page {page_number}.")

        # Perform comparison if both texts are available
        differences_list: Optional[List[DifferenceSegment]] = None
        if text_a_ocr is not None and text_b_editable is not None:
            raw_diffs = comparison_service.compare_texts(text_a_ocr, text_b_editable)
            differences_list = [DifferenceSegment(**diff) for diff in raw_diffs] # Validate with Pydantic model
            logger.info(f"Compare Page: Comparison complete for doc {document_id}, page {page_number}. Differences found: {len(differences_list) if differences_list else 0}")
        elif text_a_ocr is None:
             logger.info(f"Compare Page: Text A (OCR) is missing for doc {document_id}, page {page_number}. Cannot perform diff.")
        elif text_b_editable is None:
             logger.info(f"Compare Page: Text B (Editable PDF) is missing for doc {document_id}, page {page_number}. Cannot perform diff.")

        return PageComparisonResponse(
            document_id=document_id,
            page_number=page_number,
            text_a_ocr=text_a_ocr,
            formatted_text_a=formatted_text_a,
            text_b_editable_pdf=text_b_editable,
            formatted_text_b=None,  # Document B doesn't have formatted text processing yet
            differences=differences_list,
            message="Comparison data retrieved successfully." if (text_a_ocr or text_b_editable) else "Partial data retrieved; one text source missing."
        )
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error getting page comparison data for document {document_id}, page {page_number}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@router.post("/documents/{document_id}/corrections/page/{page_number}", response_model=PageCorrectionResponse)
async def submit_page_corrections(
    document_id: int,
    page_number: int,
    payload: PageCorrectionPayload,
    db: Session = Depends(get_db)
):
    """
    Submits user corrections for a specific page. This updates/creates the 'CorrectedText' entry.
    """
    request_id = generate_request_id()
    pdf_vision_logger.log_user_edit_save(request_id, document_id, page_number, payload.corrected_text_for_page)
    
    try:
        # Validate Document A exists
        doc_a = db.query(models.Document).filter(models.Document.id == document_id).first()
        if not doc_a:
            logger.warning(f"Submit Corrections: Document A with ID {document_id} not found.")
            raise HTTPException(status_code=404, detail=f"Document A with ID {document_id} not found.")

        # Find or create CorrectedText entry for the document
        corrected_text_entry = db.query(models.CorrectedText).filter(models.CorrectedText.document_id == document_id).first()
        
        current_page_content = {}
        if corrected_text_entry and corrected_text_entry.corrected_content_by_page:
            try:
                current_page_content = json.loads(corrected_text_entry.corrected_content_by_page)
            except json.JSONDecodeError:
                logger.error(f"Submit Corrections: Failed to parse existing corrected content for doc {document_id}. Resetting. Content: {corrected_text_entry.corrected_content_by_page}")
                current_page_content = {} # Reset if corrupt
        
        # Update the content for the specific page
        current_page_content[str(page_number)] = payload.corrected_text_for_page

        if corrected_text_entry:
            corrected_text_entry.corrected_content_by_page = json.dumps(current_page_content)
            logger.info(f"Updated CorrectedText for document ID {document_id}, page {page_number}.")
        else:
            corrected_text_entry = models.CorrectedText(
                document_id=document_id,
                corrected_content_by_page=json.dumps(current_page_content)
            )
            db.add(corrected_text_entry)
            logger.info(f"Created new CorrectedText for document ID {document_id} with page {page_number} data.")
        
        db.commit()
        db.refresh(corrected_text_entry)

        return PageCorrectionResponse(
            message=f"Corrections for page {page_number} saved successfully.",
            document_id=document_id,
            page_number=page_number,
            corrected_text_preview=payload.corrected_text_for_page[:100] + "..." if payload.corrected_text_for_page and len(payload.corrected_text_for_page) > 100 else payload.corrected_text_for_page
        )
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error submitting corrections for document {document_id}, page {page_number}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@router.get("/documents/{document_id}/corrected-text", response_model=Optional[FinalCorrectedTextResponse])
async def get_final_corrected_text(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieves the final, fully corrected text for a document, if available.
    """
    try:
        corrected_text_entry = db.query(models.CorrectedText).filter(models.CorrectedText.document_id == document_id).first()
        if not corrected_text_entry or not corrected_text_entry.corrected_content_by_page:
            logger.info(f"Get Corrected Text: No corrected text found for document ID {document_id}")
            # Return None or a specific message if no corrected text exists.
            # For this model, returning None will lead to a 200 OK with null body if no entry.
            # Alternatively, raise HTTPException(status_code=404, detail="No corrected text found.")
            return None 
        
        try:
            content_by_page = json.loads(corrected_text_entry.corrected_content_by_page)
            # Ensure keys are integers if needed by frontend, though string keys are common in JSON
            # content_by_page_int_keys = {int(k): v for k, v in content_by_page.items()} 
        except json.JSONDecodeError:
            logger.error(f"Get Corrected Text: Failed to parse corrected content JSON for document {document_id}. Content: {corrected_text_entry.corrected_content_by_page}")
            raise HTTPException(status_code=500, detail="Error retrieving corrected text data format.")

        return FinalCorrectedTextResponse(
            document_id=document_id,
            corrected_content_by_page=content_by_page, # Return with string keys as stored
            last_update_date=corrected_text_entry.last_update_date
        )
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error retrieving final corrected text for document {document_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@router.post("/documents/{document_id}/finalize", status_code=200)
async def finalize_document_corrections(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Marks the document correction process as finalized."""
    db_document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Update document status
    # Assuming a status like "correction_finalized" or similar exists or should be used.
    # If not, this might need adjustment based on actual available statuses.
    db_document.status = "correction_finalized" 
    # Potentially also set a finalized_date timestamp on the document model
    # db_document.correction_finalized_date = datetime.utcnow()
    
    db.commit()
    db.refresh(db_document)
    
    return {
        "document_id": db_document.id,
        "status": db_document.status,
        "message": "Document corrections finalized successfully."
    }

# In a real app, you might also want an endpoint to get ALL corrected text for a document
# or to update the main Document status once correction is deemed "complete". 