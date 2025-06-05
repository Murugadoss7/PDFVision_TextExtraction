import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app # Main FastAPI app
from app.db.database import Base, get_db
from app.db import models
import os
import shutil
import json

# Test database setup
#SQLALCHEMY_DATABASE_URL = "sqlite:///./test_correction_api.db"
# Using in-memory for simpler test runs, but file-based can be easier to inspect
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Ensure the test uploads directory exists and is clean for editable PDFs
TEST_UPLOADS_DIR_CORRECTION = "uploads/test_correction_inputs"

# Dependency override for get_db
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Pytest fixture to set up and tear down the database for each test function
@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine) # Create tables
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine) # Drop tables after test

@pytest.fixture(scope="module")
def client():
    # Create and cleanup test upload directory for the module
    if os.path.exists(TEST_UPLOADS_DIR_CORRECTION):
        shutil.rmtree(TEST_UPLOADS_DIR_CORRECTION)
    os.makedirs(TEST_UPLOADS_DIR_CORRECTION, exist_ok=True)
    
    # Override the UPLOADS_DIR_CORRECTION in the correction router for tests
    from app.api.routes import correction as correction_router
    correction_router.UPLOADS_DIR_CORRECTION = TEST_UPLOADS_DIR_CORRECTION

    with TestClient(app) as c:
        yield c
    
    # Clean up test upload directory after all tests in the module are done
    if os.path.exists(TEST_UPLOADS_DIR_CORRECTION):
        shutil.rmtree(TEST_UPLOADS_DIR_CORRECTION)

@pytest.fixture(scope="function")
def setup_document_a(db_session):
    """Creates a dummy Document A and a page for it."""
    doc_a = models.Document(filename="doc_A_original.pdf", file_path="/uploads/doc_A_original.pdf", total_pages=1)
    db_session.add(doc_a)
    db_session.commit()
    db_session.refresh(doc_a)
    
    page1_doc_a = models.Page(document_id=doc_a.id, page_number=1, image_path=f"/extracted/doc_A_original_p1.png")
    db_session.add(page1_doc_a)
    db_session.commit()
    db_session.refresh(page1_doc_a)

    ocr_text_doc_a_p1 = models.ExtractedText(page_id=page1_doc_a.id, raw_text="This is OCR text from Document A, page 1.")
    db_session.add(ocr_text_doc_a_p1)
    db_session.commit()
    return doc_a, page1_doc_a

def create_dummy_pdf_file(filename="dummy_editable.pdf", content="This is a dummy PDF content for testing."):
    # In a real scenario, this would be an actual PDF file.
    # For testing uploads, FastAPI TestClient handles BytesIO or temp files.
    from io import BytesIO
    return (filename, BytesIO(content.encode('utf-8')), "application/pdf")


# --- Test Cases --- #

def test_upload_editable_pdf_success(client: TestClient, db_session, setup_document_a):
    doc_a, _ = setup_document_a
    document_id = doc_a.id

    dummy_pdf_file_tuple = create_dummy_pdf_file("test_editable.pdf", "Fake PDF with Page 1 text and Page 2 text") 
    # The content doesn't matter much as PyMuPDF will be mocked or its behavior controlled for unit tests.
    # For integration, we rely on PyMuPDF to actually process it.
    # To make PyMuPDF extract something, we need a real (minimal) PDF structure.
    # Let's use a simple pre-made PDF for this test.
    
    import fitz
    minimal_pdf_path = os.path.join(TEST_UPLOADS_DIR_CORRECTION, "minimal_test.pdf")
    pdf_doc = fitz.open() # new empty PDF
    page = pdf_doc.new_page()
    page.insert_text(fitz.Point(50,100), "Text from minimal PDF page 1")
    pdf_doc.save(minimal_pdf_path)
    pdf_doc.close()

    with open(minimal_pdf_path, "rb") as f:
        response = client.post(
            f"/correction/documents/{document_id}/editable-pdf",
            files={"editable_pdf_file": ("minimal_test.pdf", f, "application/pdf")}
        )
    
    os.remove(minimal_pdf_path) # Clean up the temp PDF

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["message"] == "Editable PDF (Document B) uploaded and text extracted successfully."
    assert data["document_id"] == document_id
    assert data["editable_pdf_internal_id"] is not None

    # Verify in DB
    editable_text_entry = db_session.query(models.EditablePDFText).filter(models.EditablePDFText.document_id == document_id).first()
    assert editable_text_entry is not None
    assert editable_text_entry.id == data["editable_pdf_internal_id"]
    page_texts = json.loads(editable_text_entry.text_content_by_page)
    assert "1" in page_texts # Page number as string key
    assert "Text from minimal PDF page 1" in page_texts["1"]

def test_upload_editable_pdf_doc_a_not_found(client: TestClient):
    document_id = 99999 # Non-existent
    dummy_pdf_file_tuple = create_dummy_pdf_file()
    response = client.post(
        f"/correction/documents/{document_id}/editable-pdf",
        files={"editable_pdf_file": dummy_pdf_file_tuple}
    )
    assert response.status_code == 404
    assert f"Primary document (Document A) with ID {document_id} not found" in response.text

def test_get_page_comparison_data_success(client: TestClient, db_session, setup_document_a):
    doc_a, page1_doc_a = setup_document_a
    document_id = doc_a.id
    page_number = 1

    # First, upload an editable PDF to create Text B data
    import fitz
    minimal_pdf_path = os.path.join(TEST_UPLOADS_DIR_CORRECTION, "minimal_compare.pdf")
    pdf_doc = fitz.open()
    page = pdf_doc.new_page()
    page.insert_text(fitz.Point(50,100), "Text from editable PDF page 1 for comparison.")
    pdf_doc.save(minimal_pdf_path)
    pdf_doc.close()
    with open(minimal_pdf_path, "rb") as f:
        upload_resp = client.post(f"/correction/documents/{document_id}/editable-pdf", files={"editable_pdf_file": ("minimal_compare.pdf", f, "application/pdf")})
    assert upload_resp.status_code == 200
    os.remove(minimal_pdf_path)

    # Now get comparison data
    response = client.get(f"/correction/documents/{document_id}/compare/page/{page_number}")
    assert response.status_code == 200, response.text
    data = response.json()
    
    assert data["document_id"] == document_id
    assert data["page_number"] == page_number
    assert data["text_a_ocr"] == "This is OCR text from Document A, page 1."
    assert data["text_b_editable_pdf"] == "Text from editable PDF page 1 for comparison."
    assert data["differences"] is not None
    assert len(data["differences"]) > 0 # Expect some differences
    first_diff = data["differences"][0]
    assert "type" in first_diff
    assert "original_text_a_segment" in first_diff

def test_get_page_comparison_data_text_b_missing(client: TestClient, db_session, setup_document_a):
    doc_a, _ = setup_document_a
    document_id = doc_a.id
    page_number = 1

    response = client.get(f"/correction/documents/{document_id}/compare/page/{page_number}")
    assert response.status_code == 200, response.text # Should still succeed, but indicate Text B is missing
    data = response.json()
    assert data["text_a_ocr"] == "This is OCR text from Document A, page 1."
    assert data["text_b_editable_pdf"] is None
    assert data["differences"] is None
    assert "Partial data retrieved" in data["message"]

def test_get_page_comparison_data_doc_a_not_found(client: TestClient):
    response = client.get(f"/correction/documents/99999/compare/page/1")
    assert response.status_code == 404

def test_get_page_comparison_data_no_text_at_all(client: TestClient, db_session):
    # Create a document A with no pages / no OCR text
    doc_a = models.Document(filename="empty_doc.pdf", file_path="/uploads/empty_doc.pdf", total_pages=0)
    db_session.add(doc_a)
    db_session.commit()
    db_session.refresh(doc_a)
    document_id = doc_a.id
    page_number = 1

    response = client.get(f"/correction/documents/{document_id}/compare/page/{page_number}")
    assert response.status_code == 404 # No text A, no text B for this page
    assert "No text data (neither OCR nor editable PDF) found" in response.text

def test_submit_page_corrections_success(client: TestClient, db_session, setup_document_a):
    doc_a, _ = setup_document_a
    document_id = doc_a.id
    page_number = 1
    corrected_text = "This is the fully user-corrected text for page 1."

    payload = {"corrected_text_for_page": corrected_text}
    response = client.post(f"/correction/documents/{document_id}/corrections/page/{page_number}", json=payload)
    
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["message"] == f"Corrections for page {page_number} saved successfully."
    assert data["document_id"] == document_id
    assert data["page_number"] == page_number
    assert corrected_text[:100] in data["corrected_text_preview"]

    # Verify in DB
    corrected_entry = db_session.query(models.CorrectedText).filter(models.CorrectedText.document_id == document_id).first()
    assert corrected_entry is not None
    page_contents = json.loads(corrected_entry.corrected_content_by_page)
    assert page_contents[str(page_number)] == corrected_text

def test_submit_page_corrections_update_existing(client: TestClient, db_session, setup_document_a):
    doc_a, _ = setup_document_a
    document_id = doc_a.id
    page_number = 1
    initial_text = "Initial corrected text."
    updated_text = "This is the UPDATED user-corrected text for page 1."

    # First submission
    client.post(f"/correction/documents/{document_id}/corrections/page/{page_number}", json={"corrected_text_for_page": initial_text})
    # Second submission (update)
    response = client.post(f"/correction/documents/{document_id}/corrections/page/{page_number}", json={"corrected_text_for_page": updated_text})
    
    assert response.status_code == 200, response.text
    corrected_entry = db_session.query(models.CorrectedText).filter(models.CorrectedText.document_id == document_id).first()
    page_contents = json.loads(corrected_entry.corrected_content_by_page)
    assert page_contents[str(page_number)] == updated_text

def test_submit_page_corrections_doc_a_not_found(client: TestClient):
    response = client.post(f"/correction/documents/99999/corrections/page/1", json={"corrected_text_for_page": "test"})
    assert response.status_code == 404

def test_get_final_corrected_text_success(client: TestClient, db_session, setup_document_a):
    doc_a, _ = setup_document_a
    document_id = doc_a.id
    page1_text = "Corrected page 1."
    page2_text = "Corrected page 2."

    # Submit corrections for two pages
    client.post(f"/correction/documents/{document_id}/corrections/page/1", json={"corrected_text_for_page": page1_text})
    client.post(f"/correction/documents/{document_id}/corrections/page/2", json={"corrected_text_for_page": page2_text})

    response = client.get(f"/correction/documents/{document_id}/corrected-text")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["document_id"] == document_id
    assert data["corrected_content_by_page"]["1"] == page1_text
    assert data["corrected_content_by_page"]["2"] == page2_text
    assert "last_update_date" in data

def test_get_final_corrected_text_not_found(client: TestClient, db_session, setup_document_a):
    doc_a, _ = setup_document_a
    document_id = doc_a.id
    # No corrections submitted for this doc_a

    response = client.get(f"/correction/documents/{document_id}/corrected-text")
    assert response.status_code == 200 # Returns 200 with null body as per current router logic
    assert response.json() is None

def test_get_final_corrected_text_doc_a_not_found(client: TestClient):
    response = client.get(f"/correction/documents/99999/corrected-text")
    # Depending on implementation, this might be 404 if doc_a itself is checked first,
    # or 200 with None if it only checks for CorrectedText entry.
    # Current router logic for get_final_corrected_text doesn't check doc_a existence explicitly,
    # it just tries to fetch CorrectedText. If that's not found, it returns None (200 OK).
    assert response.status_code == 200
    assert response.json() is None 