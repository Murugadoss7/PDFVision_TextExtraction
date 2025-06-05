# System Architecture

## Project Structure

```
PDFVision_TextExtraction/
├── 📂 frontend/                    # React application (Vite + Material UI)
│   ├── 📂 public/                  # Static assets
│   │   ├── 🖼️ favicon.ico         # Application favicon
│   │   └── 📄 index.html          # Main HTML template
│   ├── 📂 src/                     # Source code
│   │   ├── 📂 components/          # React components
│   │   │   ├── 📂 CorrectionWorkflow/  # OCR correction workflow components
│   │   │   │   ├── 📄 CorrectionDocumentUpload.jsx  # Document B upload interface
│   │   │   │   ├── 📄 ComparisonView.jsx           # Text comparison and editing
│   │   │   │   └── 📄 FinalReviewView.jsx          # Final review with PDF preview
│   │   │   ├── 📂 PDFViewer/       # PDF rendering components
│   │   │   ├── 📂 TextEditor/      # Text editing components
│   │   │   ├── 📂 ToolBar/         # Navigation and control components
│   │   │   ├── 📂 UI/              # Reusable UI components
│   │   │   ├── 📄 HomePage.jsx     # Main landing page
│   │   │   └── 📄 PDFUpload.jsx    # File upload interface
│   │   ├── 📂 contexts/            # React Context providers
│   │   ├── 📂 hooks/               # Custom React hooks
│   │   ├── 📂 services/            # API communication layer
│   │   ├── 📂 utils/               # Utility functions and helpers
│   │   ├── 📄 App.jsx              # Main application component
│   │   ├── 📄 index.jsx            # Application entry point
│   │   ├── 📄 index.css            # Global styles
│   │   └── 📄 theme.js             # Material UI theme configuration
│   ├── 📄 package.json             # Dependencies and scripts
│   ├── 📄 package-lock.json        # Dependency lock file
│   └── 📄 vite.config.js           # Vite build configuration
├── 📂 backend/                     # FastAPI application
│   ├── 📂 app/                     # Core application code
│   │   ├── 📂 api/                 # API layer
│   │   │   └── 📂 routes/          # API route handlers
│   │   │       ├── 📄 upload.py    # File upload endpoints
│   │   │       ├── 📄 documents.py # Document management endpoints
│   │   │       ├── 📄 extract.py   # Text extraction endpoints
│   │   │       └── 📄 correction.py # OCR correction workflow endpoints
│   │   ├── 📂 core/                # Core application logic
│   │   │   ├── 📄 config.py        # Configuration management
│   │   │   └── 📄 security.py      # Authentication and security
│   │   ├── 📂 db/                  # Database layer
│   │   │   ├── 📄 database.py      # Database connection
│   │   │   ├── 📄 models.py        # SQLAlchemy models (includes correction models)
│   │   │   └── 📄 schemas.py       # Pydantic schemas (includes correction schemas)
│   │   ├── 📂 services/            # Business logic layer
│   │   │   ├── 📄 pdf_processing.py # PDF manipulation
│   │   │   ├── 📄 text_extraction.py # Azure OpenAI integration
│   │   │   ├── 📄 editable_pdf_service.py # Document B text extraction
│   │   │   ├── 📄 text_comparison_service.py # Text diff algorithm
│   │   │   └── 📄 export_service.py # Document export
│   │   ├── 📂 utils/               # Utility functions
│   │   │   ├── 📄 file_utils.py    # File operations
│   │   │   └── 📄 validation.py    # Input validation
│   │   └── 📄 main.py              # FastAPI application entry
│   ├── 📂 database/                # SQLite database files
│   │   └── 📄 pdf_extractor.db     # Main database
│   ├── 📂 uploads/                 # Uploaded PDF files
│   │   └── 📂 correction_inputs/   # Editable PDFs for correction workflow
│   ├── 📂 extracted/               # Extracted page images
│   ├── 📂 exports/                 # Generated Word documents
│   ├── 📂 tests/                   # Test files
│   ├── 📂 venv/                    # Python virtual environment
│   ├── 📄 requirements.txt         # Python dependencies
│   ├── 📄 test_azure_openai.py     # Azure OpenAI integration test
│   └── 📄 .env                     # Environment variables
├── 📂 docs/                        # Project documentation
│   ├── 📂 diagrams/                # Visual documentation
│   │   └── 📄 system-architecture-flow.md # System flow diagram
│   ├── 📂 tasks/                   # Task management
│   ├── 📄 STRUCTURE.md             # Project organization guide
│   ├── 📄 implementationGuide.md   # Development guidelines
│   ├── 📄 implementationCode.md    # Code examples and snippets
│   ├── 📄 projectPlan.md           # Project roadmap and phases
│   ├── 📄 systemArchitecture.md    # This file - technical architecture
│   └── 📄 azure_openai_setup.md    # Azure OpenAI configuration
├── 📂 .cursor/                     # Cursor IDE configuration
├── 📄 README.md                    # Main project documentation
├── 📄 task.md                      # Implementation task tracking
└── 📄 project plan1.md             # Detailed project planning
```

## Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **UI Library**: Material UI (MUI)
- **PDF Rendering**: react-pdf
- **Layout**: react-resizable-panels for split-screen view
- **File Upload**: react-dropzone
- **Routing**: React Router DOM
- **Icons**: Material UI Icons, React Icons
- **State Management**: React Context API

### Backend
- **Framework**: FastAPI
- **Database**: SQLite (development), PostgreSQL ready
- **ORM**: SQLAlchemy
- **PDF Processing**: PyMuPDF (fitz)
- **AI Integration**: Azure OpenAI GPT-4 Vision
- **Document Export**: python-docx
- **Image Processing**: Pillow
- **Testing**: pytest
- **Text Comparison**: difflib (Python standard library)

### Infrastructure
- **Development Server**: Vite (frontend), Uvicorn (backend)
- **Environment Management**: python-dotenv
- **API Documentation**: FastAPI automatic OpenAPI docs
- **File Storage**: Local filesystem (development)

## Key Features

- ✅ PDF upload with drag-and-drop interface
- ✅ Azure OpenAI GPT-4 Vision text extraction
- ✅ Split-screen PDF and text viewer
- ✅ **Complete OCR correction workflow with two-phase editing**
- ✅ Word document export with corrected text
- ✅ Material UI theme support (light/dark)
- ✅ Search functionality
- ✅ Responsive design
- ✅ Document management

## OCR Correction Workflow Architecture

The application includes a sophisticated OCR correction workflow that allows users to improve text extraction accuracy through a two-phase process:

### Phase 1: Text Comparison and Bulk Correction
- **Document Upload**: Users upload an editable PDF (Document B) alongside the original scanned PDF (Document A)
- **Text Extraction**: The system extracts existing text layers from Document B using PyMuPDF
- **Text Comparison**: Advanced diff algorithm compares OCR text (Document A) with editable text (Document B)
- **Difference Highlighting**: Visual highlighting of differences with detailed change descriptions
- **Bulk Operations**: 
  - "Ignore All" - Keep original OCR text
  - "Replace All" - Use all text from Document B
  - "Individual Changes" - Apply specific changes manually
- **Search and Navigation**: Search within both text versions with highlighted results
- **Progress Tracking**: Track completion status for all pages

### Phase 2: Final Review and Manual Editing
- **PDF Preview**: Side-by-side view of original scanned PDF and corrected text
- **Manual Editing**: Full text editing capabilities with live preview
- **Page-by-Page Editing**: Save changes per page with unsaved changes warnings
- **Document Finalization**: Complete the correction process for export
- **Word Export**: Export final corrected document to Microsoft Word format

### Database Models for Correction Workflow

#### EditablePDFText Table
```sql
- id: Primary key
- document_id: Foreign key to original document (One-to-one relationship)
- text_content_by_page: JSON format storing text per page {"1": "text", "2": "text"}
- extraction_date: Timestamp of text extraction
```

#### CorrectedText Table
```sql
- id: Primary key
- document_id: Foreign key to original document
- corrected_content_by_page: JSON format storing corrected text per page
- creation_date: Timestamp of correction creation
```

### API Endpoints for Correction Workflow

#### Document B Upload
- `POST /api/correction/documents/{document_id}/editable-pdf`
- Uploads editable PDF and extracts text layers
- Stores extracted text in EditablePDFText table

#### Text Comparison
- `GET /api/correction/documents/{document_id}/compare/page/{page_number}`
- Returns OCR text, editable text, and structured differences
- Uses difflib.SequenceMatcher for accurate text comparison

#### Correction Submission
- `POST /api/correction/documents/{document_id}/corrections/page/{page_number}`
- Saves user corrections for specific pages
- Updates CorrectedText table with page-specific changes

#### Final Text Retrieval
- `GET /api/correction/documents/{document_id}/corrected-text`
- Returns all corrected text for final review and export
- Merges corrections from all pages

#### Document Finalization
- `POST /api/correction/documents/{document_id}/finalize`
- Marks correction process as complete
- Enables export functionality with corrected text

### Frontend Components Architecture

#### CorrectionDocumentUpload Component
- **Purpose**: Initial setup for correction workflow
- **Features**: 
  - Validates Document A status (OCR must be completed)
  - Provides Document B upload interface
  - Progress tracking and error handling
  - Navigation to comparison phase
- **Route**: `/correction/{documentId}/upload`

#### ComparisonView Component
- **Purpose**: Phase 1 - Text comparison and bulk corrections
- **Features**:
  - Two-panel layout (OCR text vs Editable text)
  - Real-time diff highlighting with color coding
  - Bulk operation buttons (Ignore All, Replace All, Revert)
  - Individual difference application
  - Search functionality in both text panels
  - Page navigation with unsaved changes warnings
  - Progress tracking across all pages
  - Navigation to Final Review
- **Route**: `/correction/{documentId}/compare`

#### FinalReviewView Component
- **Purpose**: Phase 2 - Final review and manual editing
- **Features**:
  - Split-screen: PDF preview + editable text
  - Full-height layout with react-resizable-panels
  - Page-by-page text editing with auto-save prompts
  - Live PDF page synchronization
  - Export to Word functionality
  - Document finalization
  - Back navigation to comparison phase
- **Route**: `/correction/{documentId}/review`

### Workflow Integration Points

#### PDFContext Integration
- Manages correction workflow state across components
- Caches comparison data for performance
- Tracks corrected text per page
- Provides navigation state management

#### API Service Layer
- Centralized API calls in `services/api.js`
- Error handling and progress tracking
- Request/response data transformation
- Upload progress monitoring

#### Material UI Integration
- Consistent design language across correction workflow
- Progress indicators, alerts, and notifications
- Responsive layout for different screen sizes
- Theme support (light/dark mode)

### Performance Optimizations

#### Caching Strategy
- Comparison data cached per page to avoid re-computation
- Text changes tracked locally before API submission
- Debounced auto-save for user edits

#### Memory Management
- Large PDF handling with page-by-page loading
- Efficient diff algorithm with optimized data structures
- Garbage collection for cached comparison data

#### User Experience
- Real-time progress tracking
- Unsaved changes warnings
- Intuitive navigation between workflow phases
- Clear status indicators and error messages