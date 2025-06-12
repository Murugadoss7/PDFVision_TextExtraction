import logging
import os
from datetime import datetime
import json
import uuid
from typing import Any, Dict, Optional
from pathlib import Path

# Create logs directory if it doesn't exist
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

class PDFVisionLogger:
    """
    Centralized logger for the entire PDF Vision pipeline
    Captures: Upload -> LLM -> DB Save -> UI Rendering -> User Edit -> Word Export
    """
    
    def __init__(self):
        self.setup_loggers()
        
    def setup_loggers(self):
        """Setup different loggers for different parts of the pipeline"""
        
        # Main pipeline logger
        self.pipeline_logger = self._create_logger(
            'pipeline', 
            'logs/pipeline.log',
            '%(asctime)s | %(levelname)s | [%(request_id)s] %(stage)s | %(message)s'
        )
        
        # Data flow logger (captures actual data)
        self.data_logger = self._create_logger(
            'data_flow',
            'logs/data_flow.log', 
            '%(asctime)s | [%(request_id)s] %(stage)s | DATA: %(message)s'
        )
        
        # Database transaction logger
        self.db_logger = self._create_logger(
            'database',
            'logs/database.log',
            '%(asctime)s | [%(request_id)s] DB | %(message)s'
        )
        
        # Error logger
        self.error_logger = self._create_logger(
            'errors',
            'logs/errors.log',
            '%(asctime)s | ERROR | [%(request_id)s] %(stage)s | %(message)s'
        )
        
    def _create_logger(self, name: str, filename: str, format_str: str):
        """Create a logger with file handler"""
        logger = logging.getLogger(name)
        logger.setLevel(logging.INFO)
        
        # Remove existing handlers to avoid duplicates
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)
        
        # Create file handler
        handler = logging.FileHandler(filename, encoding='utf-8')
        handler.setLevel(logging.INFO)
        
        # Create formatter
        formatter = logging.Formatter(format_str)
        handler.setFormatter(formatter)
        
        logger.addHandler(handler)
        return logger
    
    def log_upload_start(self, request_id: str, filename: str, file_size: int):
        """Log PDF upload initiation"""
        self.pipeline_logger.info(
            f"PDF upload started - File: {filename}, Size: {file_size} bytes",
            extra={'request_id': request_id, 'stage': 'UPLOAD_START'}
        )
    
    def log_upload_complete(self, request_id: str, document_id: int, total_pages: int):
        """Log PDF upload completion"""
        self.pipeline_logger.info(
            f"PDF upload completed - Document ID: {document_id}, Pages: {total_pages}",
            extra={'request_id': request_id, 'stage': 'UPLOAD_COMPLETE'}
        )
        
        self.db_logger.info(
            f"Document created - ID: {document_id}, Status: uploaded, Pages: {total_pages}",
            extra={'request_id': request_id}
        )
    
    def log_image_extraction_start(self, request_id: str, document_id: int):
        """Log image extraction start"""
        self.pipeline_logger.info(
            f"Image extraction started - Document ID: {document_id}",
            extra={'request_id': request_id, 'stage': 'IMAGE_EXTRACTION_START'}
        )
    
    def log_image_extraction_complete(self, request_id: str, document_id: int, pages_extracted: int):
        """Log image extraction completion"""
        self.pipeline_logger.info(
            f"Image extraction completed - Document ID: {document_id}, Pages: {pages_extracted}",
            extra={'request_id': request_id, 'stage': 'IMAGE_EXTRACTION_COMPLETE'}
        )
        
        self.db_logger.info(
            f"Document status updated - ID: {document_id}, Status: images_extracted",
            extra={'request_id': request_id}
        )
    
    def log_llm_processing_start(self, request_id: str, page_id: int, page_number: int):
        """Log LLM processing start for a page"""
        self.pipeline_logger.info(
            f"LLM processing started - Page ID: {page_id}, Page Number: {page_number}",
            extra={'request_id': request_id, 'stage': 'LLM_START'}
        )
    
    def log_llm_processing_complete(self, request_id: str, page_id: int, text_length: int, formatted_text_length: int):
        """Log LLM processing completion"""
        self.pipeline_logger.info(
            f"LLM processing completed - Page ID: {page_id}, Raw text: {text_length} chars, Formatted: {formatted_text_length} chars",
            extra={'request_id': request_id, 'stage': 'LLM_COMPLETE'}
        )
    
    def log_llm_data(self, request_id: str, page_id: int, raw_text: str, formatted_text: str):
        """Log actual LLM extracted data (truncated)"""
        self.data_logger.info(
            f"Page {page_id} - Raw Text: {self._truncate_text(raw_text, 200)}",
            extra={'request_id': request_id, 'stage': 'LLM_RAW_TEXT'}
        )
        
        self.data_logger.info(
            f"Page {page_id} - Formatted Text: {self._truncate_text(formatted_text, 300)}",
            extra={'request_id': request_id, 'stage': 'LLM_FORMATTED_TEXT'}
        )
    
    def log_db_save(self, request_id: str, operation: str, table: str, record_id: int, data: Dict[str, Any]):
        """Log database save operations"""
        self.db_logger.info(
            f"{operation} - Table: {table}, ID: {record_id}, Data: {self._truncate_dict(data, 150)}",
            extra={'request_id': request_id}
        )
    
    def log_ui_render_start(self, request_id: str, document_id: int, page_number: int):
        """Log UI rendering start"""
        self.pipeline_logger.info(
            f"UI rendering started - Document: {document_id}, Page: {page_number}",
            extra={'request_id': request_id, 'stage': 'UI_RENDER_START'}
        )
    
    def log_ui_render_data(self, request_id: str, page_number: int, content: str):
        """Log UI rendered content"""
        self.data_logger.info(
            f"Page {page_number} UI Content: {self._truncate_text(content, 250)}",
            extra={'request_id': request_id, 'stage': 'UI_CONTENT'}
        )
    
    def log_user_edit_save(self, request_id: str, document_id: int, page_number: int, edited_content: str):
        """Log user edit saves"""
        self.pipeline_logger.info(
            f"User edit saved - Document: {document_id}, Page: {page_number}, Content length: {len(edited_content)}",
            extra={'request_id': request_id, 'stage': 'USER_EDIT_SAVE'}
        )
        
        self.data_logger.info(
            f"Page {page_number} User Edit: {self._truncate_text(edited_content, 250)}",
            extra={'request_id': request_id, 'stage': 'USER_EDIT_CONTENT'}
        )
    
    def log_word_export_start(self, request_id: str, document_id: int):
        """Log Word export start"""
        self.pipeline_logger.info(
            f"Word export started - Document ID: {document_id}",
            extra={'request_id': request_id, 'stage': 'WORD_EXPORT_START'}
        )
    
    def log_word_export_data(self, request_id: str, document_id: int, blocks_count: int, blocks_sample: list):
        """Log Word export data processing"""
        self.data_logger.info(
            f"Document {document_id} - Word blocks: {blocks_count}, Sample: {self._truncate_list(blocks_sample, 3)}",
            extra={'request_id': request_id, 'stage': 'WORD_EXPORT_DATA'}
        )
    
    def log_word_export_complete(self, request_id: str, document_id: int, filename: str):
        """Log Word export completion"""
        self.pipeline_logger.info(
            f"Word export completed - Document: {document_id}, File: {filename}",
            extra={'request_id': request_id, 'stage': 'WORD_EXPORT_COMPLETE'}
        )
    
    def log_error(self, request_id: str, stage: str, error: Exception, context: Dict[str, Any] = None):
        """Log errors with context"""
        error_details = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'context': context or {}
        }
        
        self.error_logger.error(
            f"Error occurred: {json.dumps(error_details, default=str)}",
            extra={'request_id': request_id, 'stage': stage}
        )
    
    def log_status_update(self, request_id: str, document_id: int, old_status: str, new_status: str, reason: str):
        """Log document status updates"""
        self.pipeline_logger.info(
            f"Status update - Document: {document_id}, {old_status} -> {new_status}, Reason: {reason}",
            extra={'request_id': request_id, 'stage': 'STATUS_UPDATE'}
        )
        
        self.db_logger.info(
            f"Document {document_id} status changed: {old_status} -> {new_status}",
            extra={'request_id': request_id}
        )
    
    def _truncate_text(self, text: str, max_length: int = 200) -> str:
        """Truncate text for logging"""
        if not text:
            return "None"
        if len(text) <= max_length:
            return repr(text)
        return repr(text[:max_length] + "...")
    
    def _truncate_dict(self, data: Dict[str, Any], max_length: int = 150) -> str:
        """Truncate dictionary for logging"""
        text = json.dumps(data, default=str)
        if len(text) <= max_length:
            return text
        return text[:max_length] + "...}"
    
    def _truncate_list(self, data: list, max_items: int = 3) -> str:
        """Truncate list for logging"""
        if len(data) <= max_items:
            return json.dumps(data, default=str)
        return json.dumps(data[:max_items], default=str) + f"... (+{len(data) - max_items} more)"

# Global logger instance
pdf_vision_logger = PDFVisionLogger()

# Helper function to generate request IDs
def generate_request_id() -> str:
    """Generate a unique request ID for tracking"""
    return str(uuid.uuid4())[:8]

# Helper function to get request ID from context (can be enhanced later)
def get_request_id() -> str:
    """Get current request ID (simplified for now)"""
    return generate_request_id() 