import pytest
import os
import fitz # PyMuPDF
from Backend.app.services.editable_pdf_service import EditablePDFService

# Fixture to create a dummy editable PDF for testing
@pytest.fixture(scope="module")
def dummy_editable_pdf():
    pdf_path = "test_dummy_editable.pdf"
    doc = fitz.open() 
    page1 = doc.new_page()
    page1.insert_text(fitz.Point(50, 72), "This is text on page 1 of the editable PDF.", fontsize=11)
    page2 = doc.new_page()
    page2.insert_text(fitz.Point(50, 72), "Page 2 has this text.", fontsize=11)
    page3 = doc.new_page() # Blank page
    doc.save(pdf_path)
    doc.close()
    yield pdf_path
    os.remove(pdf_path) # Cleanup

@pytest.fixture(scope="module")
def editable_pdf_service():
    return EditablePDFService()

def test_extract_text_from_editable_pdf_valid(editable_pdf_service: EditablePDFService, dummy_editable_pdf: str):
    doc_a_id = "test_doc_001"
    extracted_data = editable_pdf_service.extract_text_from_editable_pdf(dummy_editable_pdf, doc_a_id)
    
    assert isinstance(extracted_data, dict)
    assert len(extracted_data) == 3 # Three pages created
    
    assert 1 in extracted_data
    assert "This is text on page 1 of the editable PDF." in extracted_data[1]
    
    assert 2 in extracted_data
    assert "Page 2 has this text." in extracted_data[2]

    assert 3 in extracted_data
    assert extracted_data[3] == "" # Page 3 was blank

def test_extract_text_from_non_existent_pdf(editable_pdf_service: EditablePDFService):
    doc_a_id = "test_doc_002"
    extracted_data = editable_pdf_service.extract_text_from_editable_pdf("non_existent.pdf", doc_a_id)
    assert extracted_data == {}

def test_extract_text_from_corrupted_pdf(editable_pdf_service: EditablePDFService, tmp_path):
    doc_a_id = "test_doc_003"
    corrupted_pdf_path = tmp_path / "corrupted.pdf"
    with open(corrupted_pdf_path, "w") as f:
        f.write("This is not a PDF file.")
    
    extracted_data = editable_pdf_service.extract_text_from_editable_pdf(str(corrupted_pdf_path), doc_a_id)
    assert extracted_data == {}

# Example of how you might test the (currently commented out) storage logic if it were active
# def test_store_text_b_integration(editable_pdf_service_with_mock_db, dummy_editable_pdf):
#     doc_a_id = "test_doc_004"
#     # Assume editable_pdf_service_with_mock_db has a mocked db_session
#     # And store_text_b is uncommented and implemented in EditablePDFService
#     extracted_data = editable_pdf_service_with_mock_db.extract_text_from_editable_pdf(dummy_editable_pdf, doc_a_id)
#     # If store_text_b was called internally, you'd check if the mock_db_session.add was called, etc.
#     # For instance, if store_text_b creates a new DB entry:
#     # assert editable_pdf_service_with_mock_db.db_session.query(YourModel).filter_by(document_id=doc_a_id).first() is not None
#     assert True # Placeholder for actual assertion 