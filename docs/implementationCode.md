# PDF Vision Text Extraction - Implementation Code

## Frontend Implementation (React + Shadcn UI)

### Project Setup

```bash
# Create a new React project using Vite
npm create vite@latest frontend -- --template react

# Navigate to the project
cd frontend

# Install dependencies
npm install

# Install Shadcn UI and its dependencies
npm install shadcn-ui @radix-ui/react-dialog @radix-ui/react-slot
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install additional required packages
npm install react-router-dom react-pdf axios react-dropzone react-split-pane react-icons
```

### Key Frontend Components

#### 1. Main App Component (src/App.jsx)

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import ViewerPage from './components/PDFViewer/ViewerPage';
import { PDFContextProvider } from './contexts/PDFContext';

function App() {
  return (
    <PDFContextProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/viewer/:documentId" element={<ViewerPage />} />
        </Routes>
      </BrowserRouter>
    </PDFContextProvider>
  );
}

export default App;
```

#### 2. PDF Upload Component (src/components/PDFUpload.jsx)

```jsx
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const PDFUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }
    
    // Validate file size (limit to 10MB for example)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post('http://localhost:8000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });
      
      // Navigate to the viewer page with the document ID
      navigate(`/viewer/${response.data.document_id}`);
    } catch (error) {
      setError('Upload failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer w-full max-w-md 
                  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-lg">Drop the PDF file here...</p>
        ) : (
          <div>
            <p className="text-lg mb-2">Drag & drop a PDF file here, or click to select</p>
            <p className="text-sm text-gray-500">Supports PDF files up to 10MB</p>
          </div>
        )}
      </div>

      {uploading && (
        <div className="w-full max-w-md mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-center mt-2">{uploadProgress}% Uploaded</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4 w-full max-w-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default PDFUpload;
```

#### 3. PDF Context (src/contexts/PDFContext.jsx)

```jsx
import { createContext, useState, useContext } from 'react';

const PDFContext = createContext();

export const usePDFContext = () => useContext(PDFContext);

export const PDFContextProvider = ({ children }) => {
  const [currentDocument, setCurrentDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [extractedText, setExtractedText] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchDocumentDetails = async (documentId) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/documents/${documentId}`);
      const data = await response.json();
      setCurrentDocument(data);
      setTotalPages(data.total_pages);
    } catch (error) {
      console.error('Error fetching document details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPageText = async (documentId, pageNumber) => {
    if (extractedText[pageNumber]) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/documents/${documentId}/pages/${pageNumber}/text`);
      const data = await response.json();
      setExtractedText(prev => ({
        ...prev,
        [pageNumber]: data.text
      }));
    } catch (error) {
      console.error('Error fetching page text:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PDFContext.Provider
      value={{
        currentDocument,
        currentPage,
        totalPages,
        extractedText,
        loading,
        setCurrentPage,
        fetchDocumentDetails,
        fetchPageText,
      }}
    >
      {children}
    </PDFContext.Provider>
  );
};
```

#### 4. Split Screen Viewer Page (src/components/PDFViewer/ViewerPage.jsx)

```jsx
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SplitPane from 'react-split-pane';
import { usePDFContext } from '../../contexts/PDFContext';
import PDFRenderer from './PDFRenderer';
import TextDisplay from '../TextEditor/TextDisplay';
import ToolBar from '../ToolBar/ToolBar';

const ViewerPage = () => {
  const { documentId } = useParams();
  const { 
    fetchDocumentDetails, 
    fetchPageText, 
    currentDocument, 
    currentPage, 
    totalPages, 
    extractedText, 
    loading 
  } = usePDFContext();

  useEffect(() => {
    if (documentId) {
      fetchDocumentDetails(documentId);
    }
  }, [documentId]);

  useEffect(() => {
    if (documentId && currentPage) {
      fetchPageText(documentId, currentPage);
    }
  }, [documentId, currentPage]);

  const handlePageChange = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <ToolBar 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={handlePageChange} 
      />
      
      <div className="flex-1 overflow-hidden">
        <SplitPane split="vertical" defaultSize="50%">
          <div className="h-full overflow-auto">
            {currentDocument && (
              <PDFRenderer 
                documentUrl={`http://localhost:8000/api/documents/${documentId}/file`}
                currentPage={currentPage}
                loading={loading}
              />
            )}
          </div>
          <div className="h-full overflow-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p>Loading extracted text...</p>
              </div>
            ) : (
              <TextDisplay 
                text={extractedText[currentPage] || ''}
                pageNumber={currentPage}
                documentId={documentId}
              />
            )}
          </div>
        </SplitPane>
      </div>
    </div>
  );
};

export default ViewerPage;
```

#### 5. PDF Renderer (src/components/PDFViewer/PDFRenderer.jsx)

```jsx
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PDFRenderer = ({ documentUrl, currentPage, loading }) => {
  const [scale, setScale] = useState(1.0);
  const [numPages, setNumPages] = useState(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.1, 2.0));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.1, 0.5));
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-2 my-2">
        <button 
          onClick={zoomOut}
          className="px-3 py-1 bg-gray-200 rounded"
          disabled={scale <= 0.5}
        >
          -
        </button>
        <span className="px-2 py-1">{Math.round(scale * 100)}%</span>
        <button 
          onClick={zoomIn}
          className="px-3 py-1 bg-gray-200 rounded"
          disabled={scale >= 2.0}
        >
          +
        </button>
      </div>

      <div className="border rounded shadow-sm">
        {loading ? (
          <div className="w-[612px] h-[792px] flex items-center justify-center">
            <p>Loading PDF...</p>
          </div>
        ) : (
          <Document
            file={documentUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<p>Loading PDF...</p>}
            error={<p>Failed to load PDF</p>}
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        )}
      </div>
    </div>
  );
};

export default PDFRenderer;
```

## Backend Implementation (FastAPI + PyMuPDF + OpenAI)

### Project Setup

```bash
# Create and activate virtual environment
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn python-multipart sqlalchemy pydantic openai pymupdf pillow
```

### Key Backend Files

#### 1. Main Application (backend/app/main.py)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api.routes import documents, upload, extract
from app.db.database import engine, Base

# Create tables
Base.metadata.create_all(bind=engine)

# Create upload and extracted directories if they don't exist
os.makedirs("uploads", exist_ok=True)
os.makedirs("extracted", exist_ok=True)

app = FastAPI(title="PDF Vision Text Extractor API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(upload.router)
app.include_router(documents.router)
app.include_router(extract.router)

# Mount static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/extracted", StaticFiles(directory="extracted"), name="extracted")

@app.get("/")
def read_root():
    return {"message": "PDF Vision Text Extractor API"}
```

#### 2. Database Models (backend/app/db/models.py)

```python
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
```

#### 3. File Upload Endpoint (backend/app/api/routes/upload.py)

```python
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import os
import uuid
import fitz  # PyMuPDF
from datetime import datetime

from app.db.database import get_db
from app.db.models import Document, Page
from app.services.pdf_processing import extract_pages_as_images
from app.api.routes.extract import process_document

router = APIRouter(prefix="/api")

@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...), 
    background_tasks: BackgroundTasks = None,
    db = Depends(get_db)
):
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Create a unique filename
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    unique_filename = f"{timestamp}_{uuid.uuid4()}.pdf"
    file_path = os.path.join("uploads", unique_filename)
    
    # Save uploaded file
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create document entry in database
    try:
        # Get page count using PyMuPDF
        pdf_document = fitz.open(file_path)
        total_pages = len(pdf_document)
        
        # Create document in database
        db_document = Document(
            filename=file.filename,
            file_path=file_path,
            total_pages=total_pages,
            status="uploaded"
        )
        db.add(db_document)
        db.commit()
        db.refresh(db_document)
        
        # Create entries for each page
        for page_num in range(total_pages):
            db_page = Page(
                document_id=db_document.id,
                page_number=page_num + 1,  # 1-indexed for user-facing operations
                status="pending"
            )
            db.add(db_page)
        db.commit()
        
        # Process document in background
        background_tasks.add_task(
            extract_pages_as_images, 
            document_id=db_document.id, 
            file_path=file_path
        )
        
        # Start text extraction in background
        background_tasks.add_task(
            process_document,
            document_id=db_document.id
        )
        
        return {
            "document_id": db_document.id,
            "filename": file.filename,
            "total_pages": total_pages,
            "message": "Upload successful, processing started"
        }
        
    except Exception as e:
        # Clean up the file if database operation fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded file: {str(e)}")
```

#### 4. GPT Vision Integration (backend/app/services/text_extraction.py)

```python
import os
import json
from openai import OpenAI
from sqlalchemy.orm import Session

from app.db.models import Page, ExtractedText

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def extract_text_with_gpt_vision(page_id: int, image_path: str, db: Session):
    """Extract text from page image using OpenAI's GPT Vision model"""
    try:
        # Prepare image for GPT Vision
        with open(image_path, "rb") as image_file:
            # Call GPT Vision API
            response = client.chat.completions.create(
                model="gpt-4-vision-preview",  # Use the appropriate model
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract all text from this PDF page. Preserve the formatting as much as possible, including paragraphs, lists, and other structures. Return the result as plain text."},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64.b64encode(image_file.read()).decode('utf-8')}",
                                }
                            }
                        ]
                    }
                ],
                max_tokens=4096
            )
            
            # Extract text from response
            extracted_text = response.choices[0].message.content
            
            # Create basic JSON structure for formatting (simple example)
            formatted_text = json.dumps({
                "blocks": [
                    {
                        "type": "paragraph",
                        "text": extracted_text
                    }
                ]
            })
            
            # Update database with extracted text
            page = db.query(Page).filter(Page.id == page_id).first()
            if page:
                # Create or update extracted text record
                if page.extracted_text:
                    page.extracted_text.raw_text = extracted_text
                    page.extracted_text.formatted_text = formatted_text
                else:
                    db_extracted_text = ExtractedText(
                        page_id=page_id,
                        raw_text=extracted_text,
                        formatted_text=formatted_text
                    )
                    db.add(db_extracted_text)
                
                # Update page status
                page.status = "processed"
                db.commit()
                
                return {
                    "success": True,
                    "page_id": page_id,
                    "text_length": len(extracted_text)
                }
            else:
                return {
                    "success": False,
                    "error": "Page not found in database"
                }
                
    except Exception as e:
        # Update page status to error
        page = db.query(Page).filter(Page.id == page_id).first()
        if page:
            page.status = "error"
            db.commit()
            
        return {
            "success": False,
            "error": str(e)
        }
```

#### 5. PDF Processing Service (backend/app/services/pdf_processing.py)

```python
import os
import fitz  # PyMuPDF
import PIL.Image
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import Document, Page

async def extract_pages_as_images(document_id: int, file_path: str):
    """Extract pages from PDF as images and save them to the extracted directory"""
    db = SessionLocal()
    try:
        # Get document from database
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            print(f"Document {document_id} not found")
            return
        
        # Update document status
        document.status = "processing"
        db.commit()
        
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
        document.status = "images_extracted"
        db.commit()
        
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
```

## Environment Setup

### .env File

```
# OpenAI API Key for GPT Vision
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
DATABASE_URL=sqlite:///./database/pdf_extractor.db

# Cors settings
ALLOWED_ORIGINS=http://localhost:5173
```

### requirements.txt

```
fastapi==0.104.1
uvicorn==0.23.2
python-multipart==0.0.6
sqlalchemy==2.0.23
pydantic==2.4.2
openai==1.3.0
pymupdf==1.23.4
pillow==10.0.1
python-dotenv==1.0.0
```

### package.json (Frontend)

```json
{
  "name": "pdf-vision-text-extractor",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-slot": "^1.0.2",
    "axios": "^1.6.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-dropzone": "^14.2.3",
    "react-icons": "^4.12.0",
    "react-pdf": "^7.5.1",
    "react-router-dom": "^6.20.0",
    "react-split-pane": "^0.1.92",
    "shadcn-ui": "^0.4.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.54.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.4",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "vite": "^5.0.0"
  }
}
```

## OCR Correction Workflow Implementation (COMPLETED)

This section documents the complete implementation of the advanced OCR correction workflow that allows users to improve text extraction accuracy through a sophisticated two-phase editing system.

### Backend Services Implementation

#### 1. EditablePDFService (backend/app/services/editable_pdf_service.py)

```python
import json
import fitz  # PyMuPDF
from typing import Dict, Optional
from sqlalchemy.orm import Session
from app.db.models import Document, EditablePDFText
from app.core.config import get_logger

logger = get_logger(__name__)

class EditablePDFService:
    """Service for extracting text from editable PDFs (Document B)"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def extract_text_from_editable_pdf(self, document_id: int, file_path: str) -> Dict:
        """
        Extract existing text layers from an editable PDF page by page
        
        Args:
            document_id: ID of the original document (Document A)
            file_path: Path to the editable PDF file (Document B)
            
        Returns:
            Dict with extraction results and text content by page
        """
        try:
            # Verify document exists
            document = self.db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise ValueError(f"Document {document_id} not found")
            
            # Open the editable PDF
            pdf_document = fitz.open(file_path)
            logger.info(f"Opened editable PDF with {len(pdf_document)} pages")
            
            # Extract text from each page
            text_content_by_page = {}
            
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                
                # Extract text from the page's text layer
                page_text = page.get_text()
                
                # Clean up text (remove excessive whitespace, normalize line breaks)
                cleaned_text = self._clean_extracted_text(page_text)
                
                # Store text for this page (1-indexed)
                text_content_by_page[str(page_num + 1)] = cleaned_text
                
                logger.debug(f"Extracted {len(cleaned_text)} characters from page {page_num + 1}")
            
            pdf_document.close()
            
            # Store in database
            editable_pdf_text = EditablePDFText(
                document_id=document_id,
                text_content_by_page=json.dumps(text_content_by_page)
            )
            
            # Check if editable text already exists for this document
            existing = self.db.query(EditablePDFText).filter(
                EditablePDFText.document_id == document_id
            ).first()
            
            if existing:
                # Update existing record
                existing.text_content_by_page = json.dumps(text_content_by_page)
                existing.extraction_date = editable_pdf_text.extraction_date
            else:
                # Create new record
                self.db.add(editable_pdf_text)
            
            self.db.commit()
            
            return {
                "success": True,
                "document_id": document_id,
                "pages_processed": len(text_content_by_page),
                "total_characters": sum(len(text) for text in text_content_by_page.values())
            }
            
        except Exception as e:
            logger.error(f"Error extracting text from editable PDF: {str(e)}")
            self.db.rollback()
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_editable_text_for_page(self, document_id: int, page_number: int) -> Optional[str]:
        """Get editable PDF text for a specific page"""
        try:
            editable_text = self.db.query(EditablePDFText).filter(
                EditablePDFText.document_id == document_id
            ).first()
            
            if not editable_text:
                return None
            
            text_by_page = json.loads(editable_text.text_content_by_page)
            return text_by_page.get(str(page_number), "")
            
        except Exception as e:
            logger.error(f"Error getting editable text for page {page_number}: {str(e)}")
            return None
    
    def _clean_extracted_text(self, text: str) -> str:
        """Clean up extracted text"""
        if not text:
            return ""
        
        # Normalize line breaks and remove excessive whitespace
        cleaned = text.replace('\r\n', '\n').replace('\r', '\n')
        
        # Remove multiple consecutive newlines
        import re
        cleaned = re.sub(r'\n\s*\n\s*\n+', '\n\n', cleaned)
        
        # Strip leading/trailing whitespace
        cleaned = cleaned.strip()
        
        return cleaned
```

#### 2. TextComparisonService (backend/app/services/text_comparison_service.py)

```python
import difflib
from typing import List, Dict, Any
from dataclasses import dataclass
from app.core.config import get_logger

logger = get_logger(__name__)

@dataclass
class DifferenceSegment:
    """Represents a difference between two text segments"""
    type: str  # 'equal', 'delete', 'insert', 'replace'
    original_start: int
    original_end: int
    suggested_start: int
    suggested_end: int
    original_text: str
    suggested_text: str
    description: str

class TextComparisonService:
    """Service for comparing OCR text with editable PDF text"""
    
    def __init__(self):
        pass
    
    def compare_texts(self, ocr_text: str, editable_text: str) -> Dict[str, Any]:
        """
        Compare OCR text with editable PDF text and return structured differences
        
        Args:
            ocr_text: Text extracted via OCR (Document A)
            editable_text: Text from editable PDF (Document B)
            
        Returns:
            Dictionary with comparison results and difference segments
        """
        try:
            logger.info("Starting text comparison")
            
            if not ocr_text and not editable_text:
                return {
                    "has_differences": False,
                    "differences": [],
                    "similarity_ratio": 1.0,
                    "stats": {
                        "total_differences": 0,
                        "insertions": 0,
                        "deletions": 0,
                        "replacements": 0
                    }
                }
            
            # Use difflib.SequenceMatcher for detailed comparison
            matcher = difflib.SequenceMatcher(None, ocr_text, editable_text)
            
            # Get similarity ratio
            similarity_ratio = matcher.ratio()
            
            # Get detailed opcodes
            opcodes = matcher.get_opcodes()
            
            # Process opcodes into structured differences
            differences = []
            stats = {
                "total_differences": 0,
                "insertions": 0,
                "deletions": 0,
                "replacements": 0
            }
            
            for tag, i1, i2, j1, j2 in opcodes:
                if tag == 'equal':
                    # Texts are the same, no difference
                    continue
                
                original_text = ocr_text[i1:i2]
                suggested_text = editable_text[j1:j2]
                
                # Create difference segment
                difference = DifferenceSegment(
                    type=tag,
                    original_start=i1,
                    original_end=i2,
                    suggested_start=j1,
                    suggested_end=j2,
                    original_text=original_text,
                    suggested_text=suggested_text,
                    description=self._get_difference_description(tag, original_text, suggested_text)
                )
                
                differences.append(difference)
                stats["total_differences"] += 1
                
                if tag == 'insert':
                    stats["insertions"] += 1
                elif tag == 'delete':
                    stats["deletions"] += 1
                elif tag == 'replace':
                    stats["replacements"] += 1
            
            # Convert dataclasses to dictionaries for JSON serialization
            differences_dict = [
                {
                    "type": diff.type,
                    "original_start": diff.original_start,
                    "original_end": diff.original_end,
                    "suggested_start": diff.suggested_start,
                    "suggested_end": diff.suggested_end,
                    "original_text": diff.original_text,
                    "suggested_text": diff.suggested_text,
                    "description": diff.description
                }
                for diff in differences
            ]
            
            logger.info(f"Comparison complete: {len(differences)} differences found, similarity: {similarity_ratio:.3f}")
            
            return {
                "has_differences": len(differences) > 0,
                "differences": differences_dict,
                "similarity_ratio": similarity_ratio,
                "stats": stats
            }
            
        except Exception as e:
            logger.error(f"Error comparing texts: {str(e)}")
            return {
                "has_differences": False,
                "differences": [],
                "similarity_ratio": 0.0,
                "stats": {
                    "total_differences": 0,
                    "insertions": 0,
                    "deletions": 0,
                    "replacements": 0
                },
                "error": str(e)
            }
    
    def _get_difference_description(self, diff_type: str, original: str, suggested: str) -> str:
        """Generate a human-readable description of the difference"""
        if diff_type == 'insert':
            preview = suggested[:50] + "..." if len(suggested) > 50 else suggested
            return f"Insert text: '{preview}'"
        elif diff_type == 'delete':
            preview = original[:50] + "..." if len(original) > 50 else original
            return f"Delete text: '{preview}'"
        elif diff_type == 'replace':
            orig_preview = original[:25] + "..." if len(original) > 25 else original
            sugg_preview = suggested[:25] + "..." if len(suggested) > 25 else suggested
            return f"Replace '{orig_preview}' with '{sugg_preview}'"
        else:
            return "Unknown difference type"
```

### API Endpoints Implementation

#### 3. Correction API Routes (backend/app/api/routes/correction.py)

```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Dict, Any
import os
import shutil

from app.db.database import get_db
from app.db.models import Document, CorrectedText
from app.services.editable_pdf_service import EditablePDFService
from app.services.text_comparison_service import TextComparisonService
from app.services.text_extraction import get_page_text
from app.schemas.correction_schemas import (
    EditablePDFUploadResponse,
    PageComparisonResponse,
    PageCorrectionPayload,
    FinalCorrectedTextResponse
)
from app.core.config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/correction", tags=["correction"])

@router.post("/documents/{document_id}/editable-pdf", response_model=EditablePDFUploadResponse)
async def upload_editable_pdf(
    document_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload editable PDF (Document B) and extract text layers"""
    try:
        # Validate document exists and OCR is complete
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if document.status != "completed":
            raise HTTPException(
                status_code=400, 
                detail="OCR processing must be completed before uploading editable PDF"
            )
        
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Create correction inputs directory
        correction_dir = os.path.join("uploads", "correction_inputs")
        os.makedirs(correction_dir, exist_ok=True)
        
        # Save uploaded file
        file_path = os.path.join(correction_dir, f"doc_{document_id}_editable.pdf")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"Saved editable PDF for document {document_id} to {file_path}")
        
        # Extract text from editable PDF
        service = EditablePDFService(db)
        result = service.extract_text_from_editable_pdf(document_id, file_path)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=f"Text extraction failed: {result['error']}")
        
        return EditablePDFUploadResponse(
            success=True,
            document_id=document_id,
            pages_processed=result["pages_processed"],
            message="Editable PDF uploaded and text extracted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading editable PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/documents/{document_id}/compare/page/{page_number}", response_model=PageComparisonResponse)
async def get_page_comparison(
    document_id: int,
    page_number: int,
    db: Session = Depends(get_db)
):
    """Get comparison data between OCR text and editable PDF text for a specific page"""
    try:
        # Validate document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get OCR text for the page
        ocr_text = get_page_text(document_id, page_number, db)
        if ocr_text is None:
            raise HTTPException(status_code=404, detail=f"OCR text not found for page {page_number}")
        
        # Get editable PDF text for the page
        service = EditablePDFService(db)
        editable_text = service.get_editable_text_for_page(document_id, page_number)
        if editable_text is None:
            raise HTTPException(status_code=404, detail=f"Editable PDF text not found for page {page_number}")
        
        # Compare texts
        comparison_service = TextComparisonService()
        comparison_result = comparison_service.compare_texts(ocr_text, editable_text)
        
        return PageComparisonResponse(
            document_id=document_id,
            page_number=page_number,
            ocr_text=ocr_text,
            editable_text=editable_text,
            has_differences=comparison_result["has_differences"],
            differences=comparison_result["differences"],
            similarity_ratio=comparison_result["similarity_ratio"],
            stats=comparison_result["stats"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting page comparison: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

@router.post("/documents/{document_id}/corrections/page/{page_number}")
async def submit_page_corrections(
    document_id: int,
    page_number: int,
    corrections: PageCorrectionPayload,
    db: Session = Depends(get_db)
):
    """Submit user corrections for a specific page"""
    try:
        # Validate document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get or create corrected text record
        corrected_text = db.query(CorrectedText).filter(
            CorrectedText.document_id == document_id
        ).first()
        
        if not corrected_text:
            corrected_text = CorrectedText(
                document_id=document_id,
                corrected_content_by_page="{}"
            )
            db.add(corrected_text)
        
        # Update corrected text for this page
        import json
        corrected_content = json.loads(corrected_text.corrected_content_by_page or "{}")
        corrected_content[str(page_number)] = corrections.corrected_text
        corrected_text.corrected_content_by_page = json.dumps(corrected_content)
        
        db.commit()
        
        logger.info(f"Saved corrections for document {document_id}, page {page_number}")
        
        return {
            "success": True,
            "document_id": document_id,
            "page_number": page_number,
            "message": "Corrections saved successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving corrections: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save corrections: {str(e)}")

@router.get("/documents/{document_id}/corrected-text", response_model=FinalCorrectedTextResponse)
async def get_final_corrected_text(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get final corrected text for all pages"""
    try:
        # Validate document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get corrected text
        corrected_text = db.query(CorrectedText).filter(
            CorrectedText.document_id == document_id
        ).first()
        
        if not corrected_text:
            raise HTTPException(status_code=404, detail="No corrected text found")
        
        import json
        corrected_content = json.loads(corrected_text.corrected_content_by_page)
        
        return FinalCorrectedTextResponse(
            document_id=document_id,
            corrected_text_by_page=corrected_content,
            total_pages=len(corrected_content),
            last_updated=corrected_text.creation_date
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting corrected text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get corrected text: {str(e)}")

@router.post("/documents/{document_id}/finalize")
async def finalize_correction_workflow(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Mark correction workflow as complete"""
    try:
        # Validate document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Update document status
        document.status = "correction_completed"
        db.commit()
        
        logger.info(f"Finalized correction workflow for document {document_id}")
        
        return {
            "success": True,
            "document_id": document_id,
            "message": "Correction workflow completed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finalizing workflow: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to finalize workflow: {str(e)}")
```

### Frontend Components Implementation

#### 4. CorrectionDocumentUpload Component (frontend/src/components/CorrectionWorkflow/CorrectionDocumentUpload.jsx)

```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Grid,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error,
  Description
} from '@mui/icons-material';
import { uploadEditablePDF, getDocumentDetails } from '../../services/api';

const CorrectionDocumentUpload = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  
  const [documentA, setDocumentA] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [documentBUploaded, setDocumentBUploaded] = useState(false);

  useEffect(() => {
    loadDocumentDetails();
  }, [documentId]);

  const loadDocumentDetails = async () => {
    try {
      const details = await getDocumentDetails(documentId);
      setDocumentA(details);
      
      // Validate that OCR is completed
      if (details.status !== 'completed') {
        setError('OCR processing must be completed before starting correction workflow');
      }
    } catch (err) {
      setError('Failed to load document details');
    }
  };

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    
    if (!file.type.includes('pdf')) {
      setError('Please upload a PDF file');
      return;
    }
    
    setUploading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      await uploadEditablePDF(documentId, file, (progress) => {
        setUploadProgress(progress);
      });
      
      setSuccess(true);
      setDocumentBUploaded(true);
      setUploading(false);
      
    } catch (err) {
      setError(err.message || 'Upload failed');
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: uploading || !documentA || documentA.status !== 'completed'
  });

  const handleProceedToComparison = () => {
    navigate(`/correction/${documentId}/compare`);
  };

  if (!documentA) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        OCR Correction Workflow Setup
      </Typography>
      
      <Grid container spacing={3}>
        {/* Document A Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Description sx={{ mr: 1 }} />
                <Typography variant="h6">Document A (Original)</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" mb={2}>
                Scanned PDF with OCR text extraction
              </Typography>
              
              <Box mb={2}>
                <Typography variant="body2">
                  <strong>Filename:</strong> {documentA.filename}
                </Typography>
                <Typography variant="body2">
                  <strong>Pages:</strong> {documentA.total_pages}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong>{' '}
                  <Chip
                    size="small"
                    icon={documentA.status === 'completed' ? <CheckCircle /> : <Error />}
                    label={documentA.status === 'completed' ? 'OCR Completed' : 'Processing...'}
                    color={documentA.status === 'completed' ? 'success' : 'warning'}
                  />
                </Typography>
              </Box>
              
              {documentA.status === 'completed' && (
                <Alert severity="success">
                  OCR text extraction completed. Ready for correction workflow.
                </Alert>
              )}
              
              {documentA.status !== 'completed' && (
                <Alert severity="warning">
                  OCR processing must be completed before uploading Document B.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Document B Upload */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CloudUpload sx={{ mr: 1 }} />
                <Typography variant="h6">Document B (Editable PDF)</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" mb={2}>
                PDF with existing text layers for comparison
              </Typography>
              
              {!documentBUploaded && documentA.status === 'completed' && (
                <>
                  <Paper
                    {...getRootProps()}
                    sx={{
                      border: '2px dashed',
                      borderColor: isDragActive ? 'primary.main' : 'grey.400',
                      bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      mb: 2
                    }}
                  >
                    <input {...getInputProps()} />
                    <CloudUpload sx={{ fontSize: 48, color: 'grey.500', mb: 1 }} />
                    {isDragActive ? (
                      <Typography>Drop the editable PDF here...</Typography>
                    ) : (
                      <div>
                        <Typography variant="h6" gutterBottom>
                          Upload Editable PDF
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Drag & drop or click to select the PDF with text layers
                        </Typography>
                      </div>
                    )}
                  </Paper>
                  
                  {uploading && (
                    <Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={uploadProgress} 
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="body2" textAlign="center">
                        {uploadProgress}% Uploaded
                      </Typography>
                    </Box>
                  )}
                </>
              )}
              
              {documentBUploaded && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <strong>Document B uploaded successfully!</strong><br />
                  Text layers have been extracted and are ready for comparison.
                </Alert>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Proceed to Comparison */}
      {documentBUploaded && (
        <Box mt={4} textAlign="center">
          <Button
            variant="contained"
            size="large"
            onClick={handleProceedToComparison}
            startIcon={<CheckCircle />}
          >
            Proceed to Text Comparison
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default CorrectionDocumentUpload;
```

#### 5. ComparisonView Component (frontend/src/components/CorrectionWorkflow/ComparisonView.jsx)

```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  Alert,
  LinearProgress,
  AppBar,
  Toolbar,
  Pagination
} from '@mui/material';
import {
  Search,
  NavigateNext,
  NavigateBefore,
  CheckCircle,
  Cancel,
  Refresh,
  Save
} from '@mui/icons-material';
import { getPageComparison, submitPageCorrections } from '../../services/api';

const ComparisonView = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [comparisonData, setComparisonData] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [editableText, setEditableText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [completedPages, setCompletedPages] = useState(new Set());

  useEffect(() => {
    loadPageComparison(currentPage);
  }, [documentId, currentPage]);

  const loadPageComparison = async (pageNumber) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getPageComparison(documentId, pageNumber);
      setComparisonData(data);
      setOcrText(data.ocr_text);
      setEditableText(data.editable_text);
      setHasChanges(false);
      
      // Update total pages from document
      setTotalPages(data.document?.total_pages || totalPages);
      
    } catch (err) {
      setError(err.message || 'Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkOperation = async (operation) => {
    let newText = ocrText;
    
    switch (operation) {
      case 'ignore_all':
        // Keep original OCR text
        break;
      case 'replace_all':
        // Replace with editable PDF text
        newText = editableText;
        break;
      case 'revert':
        // Revert to original OCR text
        newText = comparisonData.ocr_text;
        break;
    }
    
    setOcrText(newText);
    setHasChanges(newText !== comparisonData.ocr_text);
  };

  const handleSaveChanges = async () => {
    try {
      await submitPageCorrections(documentId, currentPage, {
        corrected_text: ocrText
      });
      
      setCompletedPages(prev => new Set([...prev, currentPage]));
      setHasChanges(false);
      
    } catch (err) {
      setError(err.message || 'Failed to save corrections');
    }
  };

  const handlePageChange = (event, page) => {
    if (hasChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Do you want to continue without saving?'
      );
      if (!confirmed) return;
    }
    
    setCurrentPage(page);
  };

  const handleProceedToReview = () => {
    navigate(`/correction/${documentId}/review`);
  };

  const highlightDifferences = (text, differences) => {
    if (!differences || differences.length === 0) return text;
    
    // This is a simplified version - in practice, you'd implement
    // more sophisticated highlighting based on the difference segments
    return text.split('\n').map((line, index) => (
      <div key={index} style={{ marginBottom: '4px' }}>
        {line}
      </div>
    ));
  };

  if (loading && !comparisonData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" color="default">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Text Comparison - Page {currentPage} of {totalPages}
          </Typography>
          
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              onClick={() => handleBulkOperation('ignore_all')}
              size="small"
            >
              Ignore All
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleBulkOperation('replace_all')}
              size="small"
            >
              Replace All
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleBulkOperation('revert')}
              size="small"
            >
              Revert
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveChanges}
              disabled={!hasChanges}
              startIcon={<Save />}
            >
              Save Page
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Search Bar */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search text in both panels..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1 }} />
          }}
        />
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* OCR Text Panel (Editable) */}
          <Grid item xs={6} sx={{ borderRight: 1, borderColor: 'divider' }}>
            <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>
                OCR Text (Editable)
                {hasChanges && <Chip label="Modified" color="warning" size="small" sx={{ ml: 1 }} />}
              </Typography>
              
              <TextField
                multiline
                fullWidth
                value={ocrText}
                onChange={(e) => {
                  setOcrText(e.target.value);
                  setHasChanges(e.target.value !== comparisonData?.ocr_text);
                }}
                variant="outlined"
                sx={{ flexGrow: 1 }}
                inputProps={{
                  style: { fontSize: '14px', lineHeight: '1.5' }
                }}
              />
            </Box>
          </Grid>

          {/* Editable PDF Text Panel (Reference) */}
          <Grid item xs={6}>
            <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>
                Editable PDF Text (Reference)
              </Typography>
              
              <Paper 
                sx={{ 
                  flexGrow: 1, 
                  p: 2, 
                  bgcolor: 'grey.50',
                  overflow: 'auto',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {highlightDifferences(editableText, comparisonData?.differences)}
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Footer with Navigation */}
      <Box sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              size="small"
            />
            
            <Typography variant="body2" color="text.secondary">
              Completed: {completedPages.size} of {totalPages} pages
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            onClick={handleProceedToReview}
            startIcon={<NavigateNext />}
          >
            Proceed to Final Review
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default ComparisonView; 