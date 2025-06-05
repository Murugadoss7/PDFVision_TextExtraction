from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import datetime

class EditablePDFUploadResponse(BaseModel):
    message: str
    document_id: int
    editable_pdf_internal_id: Optional[int] = None # ID if we create a specific DB entry for it

class TextComparisonRequest(BaseModel):
    text_a: str = Field(..., description="Text from OCR (Document A)")
    text_b: str = Field(..., description="Text from Editable PDF (Document B)")

class DifferenceSegment(BaseModel):
    type: str = Field(..., description="Type of change (e.g., replace, delete, insert, equal)")
    original_text_a_segment: str = Field(..., description="Segment from text_A")
    suggested_text_b_segment: str = Field(..., description="Segment from text_B")
    a_start_index: int
    a_end_index: int
    b_start_index: int
    b_end_index: int

class PageComparisonResponse(BaseModel):
    document_id: int
    page_number: int
    text_a_ocr: Optional[str] = Field(None, description="OCR text for the page from Document A")
    formatted_text_a: Optional[str] = Field(None, description="Formatted text JSON for Document A")
    text_b_editable_pdf: Optional[str] = Field(None, description="Text from Document B for the page")
    formatted_text_b: Optional[str] = Field(None, description="Formatted text JSON for Document B")
    differences: Optional[List[DifferenceSegment]] = Field(None, description="List of differences between text_a_ocr and text_b_editable_pdf")
    message: Optional[str] = None

class PageCorrectionPayload(BaseModel):
    corrected_text_for_page: str = Field(..., description="The full, user-corrected text for the specified page.")
    # Optionally, could include more granular diff decisions if that level of detail is stored.
    # user_decisions: Optional[List[Dict[str, Any]]] = None 

class PageCorrectionResponse(BaseModel):
    message: str
    document_id: int
    page_number: int
    corrected_text_preview: Optional[str] = None # A snippet of the saved text

class FinalCorrectedTextResponse(BaseModel):
    document_id: int
    corrected_content_by_page: Dict[int, str]
    last_update_date: datetime.datetime 