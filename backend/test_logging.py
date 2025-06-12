#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.utils.logging_config import pdf_vision_logger, generate_request_id

def test_logging_system():
    """Test the comprehensive logging system"""
    print("🧪 Testing PDFVision Logging System...")
    
    # Generate a test request ID
    request_id = generate_request_id()
    print(f"📋 Test Request ID: {request_id}")
    
    # Test all logging functions
    print("\n1️⃣ Testing Upload Logging...")
    pdf_vision_logger.log_upload_start(request_id, "test_document.pdf", 1024000)
    pdf_vision_logger.log_upload_complete(request_id, 999, 10)
    
    print("2️⃣ Testing Image Extraction Logging...")
    pdf_vision_logger.log_image_extraction_start(request_id, 999)
    pdf_vision_logger.log_image_extraction_complete(request_id, 999, 10)
    
    print("3️⃣ Testing LLM Processing Logging...")
    pdf_vision_logger.log_llm_processing_start(request_id, 1001, 1)
    pdf_vision_logger.log_llm_data(request_id, 1001, 
                                   "Raw text extracted from the PDF page...", 
                                   "<div style='text-align: center'><p>BEACON PRESS</p></div>")
    pdf_vision_logger.log_llm_processing_complete(request_id, 1001, 250, 180)
    
    print("4️⃣ Testing Database Logging...")
    pdf_vision_logger.log_db_save(request_id, "INSERT", "documents", 999, {
        "filename": "test_document.pdf",
        "status": "uploaded",
        "total_pages": 10
    })
    
    print("5️⃣ Testing UI Rendering Logging...")
    pdf_vision_logger.log_ui_render_start(request_id, 999, 1)
    pdf_vision_logger.log_ui_render_data(request_id, 1, 
                                        "<p style='text-align: center;'>BEACON PRESS</p>")
    
    print("6️⃣ Testing User Edit Logging...")
    pdf_vision_logger.log_user_edit_save(request_id, 999, 1, 
                                        "<p style='text-align: center;'>BEACON PRESS (EDITED)</p>")
    
    print("7️⃣ Testing Word Export Logging...")
    pdf_vision_logger.log_word_export_start(request_id, 999)
    pdf_vision_logger.log_word_export_data(request_id, 999, 5, [
        {"text": "BEACON PRESS", "alignment": "center"},
        {"text": "Regular text", "alignment": "left"},
        {"text": "Right aligned", "alignment": "right"}
    ])
    pdf_vision_logger.log_word_export_complete(request_id, 999, "test_document_999_corrected.docx")
    
    print("8️⃣ Testing Status Update Logging...")
    pdf_vision_logger.log_status_update(request_id, 999, "images_extracted", "completed", "All pages processed")
    
    print("9️⃣ Testing Error Logging...")
    try:
        raise ValueError("Test error for logging system")
    except Exception as e:
        pdf_vision_logger.log_error(request_id, "TEST_ERROR", e, {
            "test_context": "This is a test error",
            "document_id": 999
        })
    
    print("\n✅ Logging test completed!")
    print(f"📁 Check the 'logs' directory for generated log files:")
    print("   - logs/pipeline.log (main flow)")
    print("   - logs/data_flow.log (data transformations)")  
    print("   - logs/database.log (database operations)")
    print("   - logs/errors.log (errors and exceptions)")
    print()
    print("🔍 Run 'python view_logs.py' to view the logs interactively!")

if __name__ == "__main__":
    test_logging_system() 