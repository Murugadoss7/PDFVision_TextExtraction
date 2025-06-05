import fitz  # PyMuPDF
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EditablePDFService:
    def __init__(self, db_session = None): # Added db_session for potential future use
        self.db_session = db_session

    def extract_text_from_editable_pdf(self, pdf_path: str, document_a_id: str) -> dict:
        """
        Extracts existing text layers from an image-based PDF (Document B) page by page.
        Does not perform OCR.
        
        Args:
            pdf_path (str): The file path to the editable PDF (Document B).
            document_a_id (str): The ID of the original scanned document (Document A) to associate with.

        Returns:
            dict: A dictionary where keys are page numbers (int) and values are the extracted text (str) for that page.
                  Returns an empty dictionary if an error occurs or the PDF has no text.
        """
        extracted_texts_by_page = {}
        try:
            doc = fitz.open(pdf_path)
            num_pages = doc.page_count
            logger.info(f"EditablePDFService: Processing Document B ({pdf_path}) with {num_pages} pages for Document A ID: {document_a_id}.")

            for page_num in range(num_pages):
                page = doc.load_page(page_num)
                text = page.get_text("text")
                extracted_texts_by_page[page_num + 1] = text if text else ""
            
            doc.close()
            logger.info(f"EditablePDFService: Successfully extracted text from {len(extracted_texts_by_page)} pages of Document B ({pdf_path}).")
            # Here you would typically store/associate this text with document_a_id
            # For now, we just return it. Example:
            # self.store_text_b(document_a_id, extracted_texts_by_page)
            return extracted_texts_by_page
        except Exception as e:
            logger.error(f"EditablePDFService: Error processing PDF {pdf_path} for Document A ID {document_a_id}: {e}")
            return {}

    # Placeholder for actual storage logic
    # def store_text_b(self, document_a_id: str, text_b_data: dict):
    #     # Example: Store text_b_data in database, linking it to document_a_id
    #     # This would involve your database models and session (self.db_session)
    #     logger.info(f"EditablePDFService: Storing extracted text for Document A ID {document_a_id}.")
    #     pass

if __name__ == '__main__':
    # Example Usage (requires a sample PDF named 'sample_editable.pdf' in the same directory)
    # This is for testing purposes and should be removed or placed in a test file.
    service = EditablePDFService()
    # Create a dummy PDF for testing if one doesn't exist
    try:
        dummy_pdf_path = "dummy_editable.pdf"
        doc = fitz.open() 
        page = doc.new_page()
        page.insert_text(fitz.Point(50, 72), "This is text on page 1.", fontsize=11)
        page = doc.new_page()
        page.insert_text(fitz.Point(50, 72), "This is text on page 2.", fontsize=11)
        doc.save(dummy_pdf_path)
        doc.close()
        print(f"Created dummy PDF: {dummy_pdf_path}")

        extracted_content = service.extract_text_from_editable_pdf(dummy_pdf_path, "doc_A_123")
        if extracted_content:
            for page, text in extracted_content.items():
                print(f"Page {page}:\n{text}\n---")
        else:
            print("No text extracted or an error occurred.")
            
        import os
        os.remove(dummy_pdf_path) # Clean up dummy file
        print(f"Removed dummy PDF: {dummy_pdf_path}")

    except Exception as e:
        print(f"Error in example usage: {e}") 