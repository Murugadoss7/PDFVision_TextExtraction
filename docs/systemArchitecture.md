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
│   │   │   ├── 📄 export_service.py # Document export
│   │   │   └── 📄 wordextract.py   # Enhanced Word generation with alignment support
│   │   ├── 📂 utils/               # Utility functions
│   │   │   ├── 📄 file_utils.py    # File operations
│   │   │   ├── 📄 validation.py    # Input validation
│   │   │   └── 📄 logging_config.py # Comprehensive logging system
│   │   └── 📄 main.py              # FastAPI application entry
│   ├── 📂 database/                # SQLite database files
│   │   └── 📄 pdf_extractor.db     # Main database
│   ├── 📂 uploads/                 # Uploaded PDF files
│   │   └── 📂 correction_inputs/   # Editable PDFs for correction workflow
│   ├── 📂 extracted/               # Extracted page images
│   ├── 📂 exports/                 # Generated Word documents
│   ├── 📂 logs/                    # Comprehensive logging files (NEW)
│   │   ├── 📄 pipeline.log         # Main operations and workflow progress
│   │   ├── 📄 data_flow.log        # Data transformation and content tracking
│   │   ├── 📄 database.log         # Database operations and queries
│   │   └── 📄 errors.log           # Error tracking with context and stack traces
│   ├── 📂 tests/                   # Test files
│   ├── 📂 venv/                    # Python virtual environment
│   ├── 📄 requirements.txt         # Python dependencies
│   ├── 📄 test_azure_openai.py     # Azure OpenAI integration test
│   ├── 📄 view_logs.py             # Interactive log viewer utility (NEW)
│   ├── 📄 test_logging.py          # Logging system test script (NEW)
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
- **Rich Text Editing**: CKEditor 5 DecoupledEditor (WYSIWYG)

### Backend
- **Framework**: FastAPI
- **Database**: SQLite (development), PostgreSQL ready
- **ORM**: SQLAlchemy
- **PDF Processing**: PyMuPDF (fitz)
- **AI Integration**: Azure OpenAI GPT-4 Vision
- **Document Export**: python-docx with enhanced alignment support
- **Image Processing**: Pillow
- **Testing**: pytest
- **Text Comparison**: difflib (Python standard library)
- **HTML Processing**: BeautifulSoup4, htmldocx

### Infrastructure
- **Development Server**: Vite (frontend), Uvicorn (backend)
- **Environment Management**: python-dotenv
- **API Documentation**: FastAPI automatic OpenAPI docs
- **File Storage**: Local filesystem (development)
- **Logging**: Custom PDFVisionLogger with structured logging

## Key Features

- ✅ PDF upload with drag-and-drop interface
- ✅ Azure OpenAI GPT-4 Vision text extraction with HTML formatting
- ✅ Split-screen PDF and text viewer
- ✅ **Complete OCR correction workflow with two-phase editing**
- ✅ **Enhanced CKEditor 5 with alignment preservation**
- ✅ Word document export with **full alignment support**
- ✅ **Comprehensive logging system for entire pipeline**
- ✅ Material UI theme support (light/dark)
- ✅ Search functionality
- ✅ Responsive design
- ✅ Document management

## Recent Major Enhancements (2024)

### ✅ Comprehensive Logging System - FULLY IMPLEMENTED
**Status**: Complete pipeline logging operational across entire application

#### PDFVisionLogger Architecture
- **Location**: `backend/app/utils/logging_config.py`
- **Purpose**: Centralized logging for complete document processing pipeline
- **Design**: Structured logging with unique request ID tracking
- **Log Files**:
  - `logs/pipeline.log` - Main operations and workflow progress tracking
  - `logs/data_flow.log` - Data transformation and content processing
  - `logs/database.log` - Database operations and query logging
  - `logs/errors.log` - Error tracking with context and stack traces

#### Logged Operations Coverage
- **Upload Phase**: File validation, document creation, page extraction
- **LLM Processing**: Azure OpenAI requests, response processing, HTML generation
- **Database Operations**: All CRUD operations with data samples and performance metrics
- **UI Rendering**: Content preparation and delivery to frontend
- **User Edits**: CKEditor changes, save operations, content updates
- **Word Export**: Block processing, alignment application, document generation
- **Correction Workflow**: Document B processing, text comparison, user corrections

#### Debugging and Monitoring Tools
- **Interactive Log Viewer**: `view_logs.py` - Real-time log monitoring with filtering
- **Test Suite**: `test_logging.py` - Comprehensive validation of logging functionality
- **Request ID Tracking**: End-to-end pipeline tracing with unique identifiers
- **Performance Monitoring**: Operation timing and resource usage tracking
- **Debug Scripts**: Multiple alignment and processing validation tools

### ✅ Enhanced OCR Correction Workflow - FULLY IMPLEMENTED
**Status**: Complete two-phase editing system with advanced UI components

#### Phase 1: Text Comparison and Bulk Correction
- **Document B Integration**: PyMuPDF text layer extraction from editable PDFs
- **Advanced Diff Algorithm**: difflib-based structured difference detection
- **Visual Diff Display**: Color-coded highlighting with detailed change descriptions
- **Bulk Operations**: Ignore All, Replace All, Revert functionality
- **Individual Corrections**: Precise control over specific text changes
- **Search Integration**: Real-time search with highlighting in both text panels

#### Phase 2: Final Review and Manual Editing
- **PDF Preview**: Synchronized viewing of original scanned document
- **Manual Editing**: Full text editing with CKEditor 5 integration
- **Page Navigation**: Seamless page-by-page correction workflow
- **Progress Tracking**: Visual completion indicators across all pages
- **Export Integration**: Direct Word document generation with corrected text

#### Backend Services
- **EditablePDFService**: Document B text extraction and processing
- **TextComparisonService**: Intelligent difference detection and analysis
- **Enhanced API Endpoints**: Complete correction workflow endpoint coverage
- **Database Integration**: New tables for correction workflow and corrected text storage

### ✅ Enhanced Text Alignment System - FULLY IMPLEMENTED
**Status**: Complete alignment preservation from LLM → CKEditor → Word export

#### CKEditor 5 Enhancement
- **Version Upgrade**: Migrated to DecoupledEditor v42.0.0
- **HTML Preprocessing**: Convert div-level alignment to paragraph-level alignment
- **Pattern Matching**: Support for `<div style="text-align: center"><p>content</p></div>`
- **Style Conversion**: Transform to `<p style="text-align: center;">content</p>`
- **Alignment Support**: Full support for left, center, right, justify alignments
- **Always-On WYSIWYG**: Direct editing without view/edit mode switching

#### Enhanced Word Export Pipeline
- **BeautifulSoup4 Integration**: Robust HTML parsing for alignment extraction
- **Multiple Format Support**: Inline styles, CSS classes, nested div elements
- **WordGenerator Enhancement**: Direct paragraph alignment application
- **Data Validation Fix**: Preserve alignment field throughout processing pipeline
- **Debug Logging**: Comprehensive validation of alignment preservation

#### End-to-End Validation
- **Pipeline Stages Verified**:
  1. LLM Output: `<div style="text-align: center"><p>BEACON PRESS</p></div>`
  2. Database Storage: `{"text": "BEACON PRESS", "alignment": "center"}`
  3. CKEditor Processing: HTML preprocessing maintains alignment
  4. Word Generation: Direct application to paragraph objects
  5. Final Document: Correctly aligned text in exported Word file

### ✅ New UI Components and Features - FULLY IMPLEMENTED
**Status**: Complete suite of correction workflow components

#### Correction Workflow Components
- **CorrectionDocumentUpload**: Document B upload with progress tracking
- **ComparisonView**: Two-panel text comparison with diff highlighting
- **HtmlDiffDisplay**: Advanced diff visualization with search capabilities
- **DiffCard**: Individual difference display and management
- **DocumentPanel**: Document display with navigation controls
- **DifferencePanel**: Bulk operation management interface
- **PageNavigation**: Enhanced page navigation with progress tracking

#### Enhanced Text Editor Components
- **CKTextEditor**: Enhanced CKEditor 5 with alignment preprocessing
- **FormattedTextRenderer**: Improved text rendering with formatting preservation
- **Custom Hooks**: useHighlighting for search and text highlighting
- **Utility Functions**: String manipulation and formatting utilities

#### State Management Enhancements
- **PDFContext Updates**: Complete correction workflow state management
- **Progress Tracking**: Page-by-page correction status monitoring
- **Caching Strategy**: Comparison data caching for performance optimization
- **Navigation State**: Workflow phase and page position preservation

### ✅ Database and Schema Enhancements - FULLY IMPLEMENTED
**Status**: Complete database support for correction workflow

#### New Database Tables
- **EditablePDFText**: Store Document B text content per page
- **CorrectedText**: Store user corrections and final corrected content
- **Enhanced Document Models**: Correction status and workflow tracking
- **Schema Validation**: Complete Pydantic models for all correction endpoints

#### API Enhancements
- **Correction Endpoints**: Complete suite of 5 correction workflow endpoints
- **Enhanced Document Management**: Correction status tracking in document APIs
- **Upload Endpoints**: Enhanced with logging and Document B support
- **Export Endpoints**: Priority system for corrected vs original text

### ✅ Performance and Monitoring Improvements - FULLY IMPLEMENTED
**Status**: Comprehensive system monitoring and optimization

#### Performance Optimizations
- **Caching Strategy**: Comparison data and preprocessing result caching
- **Memory Management**: Efficient handling of large documents
- **Request Optimization**: Structured API requests with proper error handling
- **Database Query Optimization**: Efficient alignment field storage and retrieval

#### Monitoring and Health Checks
- **Request ID Tracking**: End-to-end pipeline tracing capabilities
- **Performance Metrics**: Operation timing and resource usage monitoring
- **Error Recovery**: Graceful degradation and retry mechanisms
- **Health Monitoring**: System status validation and alerting

#### Validation Points
- **API Level**: Alignment data in request/response logging
- **Database Level**: Alignment field validation and storage
- **Export Level**: WordGenerator alignment application verification
- **Debug Scripts**: Standalone testing tools for alignment conversion

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
- **Enhanced CKEditor**: Full WYSIWYG editing with alignment preservation
- **Page-by-Page Editing**: Save changes per page with unsaved changes warnings
- **Document Finalization**: Complete the correction process for export
- **Word Export**: Export final corrected document with full formatting preservation

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

#### CKTextEditor Component (Enhanced)
- **Location**: `frontend/src/components/TextEditor/CKTextEditor.jsx`
- **Features**: 
  - **Always-on WYSIWYG mode** - Direct editing without mode switching
  - **HTML Preprocessing** - Convert LLM div alignment to paragraph alignment
  - **Alignment Preservation** - Full support for center, right, justify alignment
  - **Minimal Sanitization** - Preserve LLM formatting exactly
  - **Auto-save Integration** - Page-level save functionality
  - **Debug Mode** - HTML preview for alignment troubleshooting

#### Enhanced Word Export Pipeline
- **Location**: `backend/app/services/wordextract.py`
- **Features**:
  - **Multi-format Parsing** - Support HTML, CSS classes, inline styles
  - **Alignment Extraction** - BeautifulSoup4 parsing of text alignment
  - **Paragraph-level Application** - Direct Word paragraph alignment setting
  - **Validation Logging** - Debug output for alignment application verification
  - **Fallback Handling** - Default alignment for unspecified content

## Troubleshooting and Debugging

### Logging Configuration
- **Environment Variable**: Set `LOG_LEVEL=DEBUG` for verbose logging
- **Log Rotation**: Automatic log management for long-running processes
- **Request Tracking**: Unique request IDs for end-to-end pipeline tracing

### Alignment Debugging
- **Test Scripts**: `debug_alignment.py`, `test_generic_alignment.py`
- **Log Analysis**: Search for "alignment=" in data_flow.log
- **CKEditor Debug**: Enable HTML preview to verify preprocessed content
- **Word Validation**: Check generated documents for proper alignment application

### Common Issues and Solutions

#### Alignment Not Preserved in Word Export
1. **Check LLM Output**: Verify HTML contains proper alignment tags
2. **Validate Parsing**: Confirm BeautifulSoup extracts alignment correctly  
3. **Debug WordGenerator**: Check alignment field reaches Word generation
4. **Log Analysis**: Review data_flow.log for alignment preservation

#### CKEditor Formatting Issues
1. **HTML Preprocessing**: Verify div-to-paragraph conversion
2. **Style Validation**: Check inline style preservation
3. **Editor Configuration**: Confirm alignment plugin is enabled
4. **Content Sanitization**: Ensure minimal filtering preserves formatting

### Performance Monitoring
- **Pipeline Timing**: Log processing duration for each stage
- **Memory Usage**: Monitor large document processing
- **API Response Times**: Track endpoint performance
- **Database Query Optimization**: Monitor slow queries in database.log