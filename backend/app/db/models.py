from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
import datetime

from app.db.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    file_path = Column(String)
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    total_pages = Column(Integer, default=0)
    status = Column(String, default="uploaded")  # uploaded, processing, completed, error
    
    pages = relationship("Page", back_populates="document", cascade="all, delete-orphan")
    editable_pdf_texts = relationship("EditablePDFText", back_populates="document", cascade="all, delete-orphan")
    corrected_texts = relationship("CorrectedText", back_populates="document", cascade="all, delete-orphan")

class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    page_number = Column(Integer)
    image_path = Column(String)
    status = Column(String, default="pending")  # pending, processed, error
    
    document = relationship("Document", back_populates="pages")
    extracted_text = relationship("ExtractedText", back_populates="page", uselist=False, cascade="all, delete-orphan")

class ExtractedText(Base):
    __tablename__ = "extracted_texts"

    id = Column(Integer, primary_key=True, index=True)
    page_id = Column(Integer, ForeignKey("pages.id"))
    raw_text = Column(Text)
    formatted_text = Column(Text)  # JSON string with formatting information
    extraction_date = Column(DateTime, default=datetime.datetime.utcnow)
    
    page = relationship("Page", back_populates="extracted_text")

# New Models for Interactive OCR Correction Feature
class EditablePDFText(Base):
    __tablename__ = "editable_pdf_texts"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, unique=True) # One-to-one with Document for Document B text
    # Store text per page as JSON: {1: "text page 1", 2: "text page 2"}
    text_content_by_page = Column(Text) # Could be JSON or another structured format
    extraction_date = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="editable_pdf_texts")

class CorrectedText(Base):
    __tablename__ = "corrected_texts"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, unique=True) # One-to-one with Document for its corrected version
    # Store final corrected text per page as JSON: {1: "corrected text page 1", ...}
    corrected_content_by_page = Column(Text) # Could be JSON or another structured format
    last_update_date = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    # Potentially add versioning or history if multiple correction passes are needed

    document = relationship("Document", back_populates="corrected_texts")

# To keep track of user decisions on diffs for a page (optional, could be complex)
# This is a more granular approach if we want to store individual diff resolutions.
# For now, we might just save the whole corrected page text in CorrectedText directly.
# class PageCorrectionDecision(Base):
#     __tablename__ = "page_correction_decisions"
#     id = Column(Integer, primary_key=True, index=True)
#     document_id = Column(Integer, ForeignKey("documents.id"))
#     page_number = Column(Integer)
#     diff_id = Column(String) # An identifier for the specific diff on the page
#     user_decision = Column(String) # e.g., 'accepted_b', 'kept_a', 'manual_edit'
#     manual_edit_content = Column(Text, nullable=True)
#     timestamp = Column(DateTime, default=datetime.datetime.utcnow)
#
#     document = relationship("Document") 