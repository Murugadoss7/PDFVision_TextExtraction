# PDF Vision Text Extraction - Implementation Guide

## Phase 1: PDF Upload, Text Extraction with Azure OpenAI GPT Vision, and Split Screen View

### 1. Frontend Setup (React + Material UI)

#### 1.1 Project Initialization
- Create React app using Vite
- Set up Material UI components and theming
- Configure folder structure as per system architecture
- Set up routing with React Router

#### 1.2 UI Components
- Create main layout component with Material UI AppBar and theme support
- Implement PDFViewer component for rendering PDF pages using react-pdf
- Develop TextEditor component for showing extracted text with Material UI TextField
- Build ToolBar component with Material UI buttons and navigation controls
- Implement UI components (Material UI Button, Modal, Snackbar notifications)

#### 1.3 PDF Upload Feature
- Create drag-and-drop upload zone using react-dropzone
- Implement file validation (PDF format, size limits)
- Build upload progress indicator with Material UI LinearProgress
- Add error handling with Material UI Alert components
- Store uploaded PDF in local state and context

### 2. Backend Setup (FastAPI)

#### 2.1 Project Initialization
- Set up FastAPI application structure
- Configure CORS for frontend communication
- Set up SQLite database connections
- Create folder structure for uploads, extracted images, and exports

#### 2.2 API Endpoints
- Create `/api/upload` endpoint for receiving PDF files
- Implement file validation and storage
- Create `/api/extract` endpoint for text extraction
- Develop `/api/documents` endpoints for listing and retrieving documents
- Add complete `/api/correction` endpoints for OCR correction workflow

#### 2.3 Database Schema
- Design and implement SQLite tables for:
  - Documents (id, filename, upload_date, status, total_pages)
  - Pages (id, document_id, page_number, content, image_path)
  - Extracted text (id, page_id, raw_text, formatted_text, extraction_date)
  - **EditablePDFText** (id, document_id, text_content_by_page, extraction_date)
  - **CorrectedText** (id, document_id, corrected_content_by_page, creation_date)

### 3. PDF Processing with Azure OpenAI GPT Vision

#### 3.1 PDF Handling
- Implement PDF parsing using PyMuPDF (fitz)
- Extract individual pages as images with proper resolution
- Store page images in the extracted folder with organized naming

#### 3.2 Azure OpenAI Integration
- Set up Azure OpenAI client for GPT-4 Vision model
- Implement function to send page images to Azure OpenAI GPT Vision
- Process and parse Azure OpenAI responses with proper error handling
- Extract text with formatting information preservation

#### 3.3 Text Storage
- Store extracted text in SQLite database
- Associate text with corresponding document and page
- Implement JSON format for preserving formatting and structure

### 4. Split Screen Implementation

#### 4.1 Frontend Components
- Implement split screen container with react-resizable-panels
- Create pagination controls for navigating PDF pages with Material UI Pagination
- Build synchronization mechanism between PDF view and text view
- Add Material UI theme integration for dark/light mode

#### 4.2 PDF Rendering
- Implement react-pdf for rendering PDF pages
- Add zoom controls and page navigation with Material UI IconButtons
- Display current page with loading states using Material UI CircularProgress

#### 4.3 Text Display and Editing
- Show extracted text in Material UI TextField components
- Preserve basic formatting (paragraphs, spacing, structure)
- Implement text correction workflow with CorrectionWorkflow components
- Add search functionality within extracted text

### 5. Advanced OCR Correction Workflow (Completed)

#### 5.1 Backend Services Implementation

##### EditablePDFService
- **Location**: `backend/app/services/editable_pdf_service.py`
- **Purpose**: Extract text layers from editable PDFs (Document B)
- **Features**:
  - PyMuPDF integration for text layer extraction
  - Page-by-page text extraction and storage
  - Error handling for corrupt or empty PDFs
  - JSON serialization of extracted text per page

##### TextComparisonService  
- **Location**: `backend/app/services/text_comparison_service.py`
- **Purpose**: Compare OCR text with editable PDF text
- **Features**:
  - difflib.SequenceMatcher integration for accurate diff generation
  - Structured difference objects with indices and change types
  - Support for insert, delete, replace, and equal operations
  - Performance optimizations for large text blocks

#### 5.2 API Endpoints Implementation

##### Correction Workflow Endpoints (`/api/correction`)
- **POST `/documents/{document_id}/editable-pdf`**: Upload Document B and extract text
- **GET `/documents/{document_id}/compare/page/{page_number}`**: Get comparison data
- **POST `/documents/{document_id}/corrections/page/{page_number}`**: Submit corrections
- **GET `/documents/{document_id}/corrected-text`**: Retrieve final corrected text
- **POST `/documents/{document_id}/finalize`**: Mark correction process complete

##### Request/Response Schema
- **EditablePDFUploadResponse**: Upload confirmation with internal IDs
- **PageComparisonResponse**: OCR text, editable text, and differences
- **DifferenceSegment**: Structured diff with indices and change types
- **PageCorrectionPayload**: User corrections per page
- **FinalCorrectedTextResponse**: Complete corrected document text

#### 5.3 Frontend Components Implementation

##### CorrectionDocumentUpload Component
- **Location**: `frontend/src/components/CorrectionWorkflow/CorrectionDocumentUpload.jsx`
- **Purpose**: Initial workflow setup and Document B upload
- **Features**:
  - Document A validation (OCR completion check)
  - Drag-and-drop Document B upload with progress tracking
  - Two-panel layout showing both document statuses
  - Automatic navigation to comparison phase upon completion
  - Error handling with detailed status messages

##### ComparisonView Component
- **Location**: `frontend/src/components/CorrectionWorkflow/ComparisonView.jsx`
- **Purpose**: Phase 1 - Text comparison and bulk corrections
- **Key Features**:
  - **Two-Panel Layout**: OCR text (editable) vs Editable PDF text (read-only)
  - **Real-time Diff Highlighting**: Color-coded differences with detailed descriptions
  - **Bulk Operations**:
    - "Ignore All" - Keep original OCR text for entire page
    - "Replace All" - Replace with all Document B text for page
    - "Revert" - Return to original OCR text
  - **Individual Difference Handling**: Apply specific changes from Document B
  - **Search Functionality**: Search within both text panels with highlighting
  - **Progress Tracking**: Visual indicators for completed pages
  - **Page Navigation**: Seamless navigation with unsaved changes warnings
  - **State Management**: Track applied changes and edit status
  - **Navigation to Final Review**: Button to proceed to Phase 2

##### FinalReviewView Component  
- **Location**: `frontend/src/components/CorrectionWorkflow/FinalReviewView.jsx`
- **Purpose**: Phase 2 - Final review and manual editing
- **Key Features**:
  - **Split-Screen Layout**: Original PDF preview + corrected text editor
  - **PDF Integration**: react-pdf for displaying original scanned pages
  - **Full-Height Layout**: Maximized screen usage with react-resizable-panels
  - **Page-by-Page Editing**: Individual page corrections with auto-save prompts
  - **Live Synchronization**: PDF page and text editor synchronized navigation
  - **Export Integration**: Direct Word document export from corrected text
  - **Document Finalization**: Complete workflow and enable final export
  - **Back Navigation**: Return to comparison phase for additional corrections
  - **Error Handling**: PDF loading errors and API communication issues

#### 5.4 Context and State Management

##### PDFContext Integration
- **Correction State**: Manages Document B ID and correction data
- **Progress Tracking**: Tracks corrected text per page across workflow
- **Caching Strategy**: Comparison data cached to avoid re-computation
- **Navigation State**: Maintains current page and workflow phase
- **Clear Functions**: Reset correction state for new workflows

##### API Service Layer
- **Centralized Calls**: All correction endpoints in `services/api.js`
- **Progress Tracking**: Upload progress callbacks for large files
- **Error Handling**: Structured error responses with user-friendly messages
- **Request Transformation**: Proper FormData and JSON handling

#### 5.5 User Experience Features

##### Visual Feedback
- **Progress Indicators**: CircularProgress for loading states
- **Status Chips**: Page completion tracking with color coding
- **Alert Messages**: Success/error notifications with appropriate severity
- **Diff Highlighting**: Color-coded text differences (insert, delete, replace)

##### Navigation and Flow
- **Workflow Phases**: Clear progression from upload → compare → review → export
- **Unsaved Changes Warnings**: Prevent data loss during navigation
- **Back Navigation**: Return to previous phases without losing progress
- **Route Integration**: Direct URL access to any workflow phase

##### Responsive Design
- **Material UI Grid**: Responsive layout for different screen sizes
- **Mobile Support**: Touch-friendly interface elements
- **Theme Integration**: Light/dark mode support throughout workflow
- **Accessibility**: Proper ARIA labels and keyboard navigation

### 6. Export and Finalization

#### 6.1 Enhanced Export Functionality
- **Corrected Text Priority**: Export uses corrected text when available
- **Format Preservation**: Maintain document structure in Word export
- **Download Management**: Progress tracking and error handling for large exports
- **Workflow Integration**: Export available from both comparison and review phases

#### 6.2 Document Status Management
- **Status Updates**: Track document progress through correction workflow
- **Finalization Process**: Mark documents as correction-complete
- **Version Control**: Maintain original and corrected text versions
- **Audit Trail**: Track correction history and user changes

### 7. Integration and Testing

#### 7.1 Frontend-Backend Integration
- Connect all correction components to backend APIs with proper error handling
- Implement loading states and progress indicators using Material UI
- Handle file uploads with progress tracking and validation
- Add real-time status updates for correction workflow progress

#### 7.2 Workflow Testing
- **Component Testing**: Unit tests for all correction workflow components
- **Integration Testing**: End-to-end workflow from upload to export
- **API Testing**: Comprehensive endpoint testing with various PDF types
- **Error Scenario Testing**: Invalid files, network issues, corrupted PDFs
- **Performance Testing**: Large PDF handling and memory management

## Phase 2: Enhanced Features and Production Readiness

### 1. Performance Optimization
- Implement lazy loading for PDF pages in correction workflow
- Add caching for comparison data and text differences
- Optimize image processing and text extraction storage
- Implement proper error recovery mechanisms for workflow interruptions

### 2. User Experience Improvements
- **Keyboard Shortcuts**: Navigation shortcuts for power users
- **Bulk Document Processing**: Multiple document correction workflows
- **Advanced Search**: Filters and sorting in difference highlighting
- **Undo/Redo**: Comprehensive change tracking and reversal
- **Auto-Save**: Periodic background saving of correction progress

### 3. Advanced Correction Features
- **Confidence Scoring**: AI-based confidence indicators for corrections
- **Suggestion Engine**: Intelligent correction suggestions
- **Pattern Learning**: Learn from user corrections for future improvements
- **Batch Operations**: Apply corrections across multiple similar documents
- **Template System**: Save correction patterns for reuse

### 4. Production Deployment
- Configure environment variables for production correction workflow
- Set up proper logging and monitoring for correction operations
- Implement security best practices for file handling
- Add database migrations for correction workflow tables
- Create backup strategies for correction data

## Getting Started

### Frontend
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your Azure OpenAI credentials

# Start development server
uvicorn app.main:app --reload
```

### OCR Correction Workflow Setup

1. **Upload Original PDF**: Start with a scanned PDF document
2. **Complete OCR Processing**: Ensure Azure OpenAI extraction is finished
3. **Access Correction Workflow**: Use the correction icon in document list
4. **Upload Editable PDF**: Provide Document B with existing text layers
5. **Compare and Correct**: Review differences and apply bulk or individual corrections
6. **Final Review**: Manual editing with PDF preview for final accuracy
7. **Export and Download**: Generate Word document with corrected text

## Technology Stack Summary

- **Frontend**: React 18, Vite, Material UI, react-pdf, react-resizable-panels, react-dropzone
- **Backend**: FastAPI, SQLAlchemy, PyMuPDF, python-docx, difflib
- **AI Integration**: Azure OpenAI GPT-4 Vision
- **Database**: SQLite (development), PostgreSQL (production ready)
- **Development**: pytest for testing, ESLint for code quality
- **Correction Workflow**: Complete two-phase editing system with diff algorithms 

## Phase 6: Enhanced Text Editing and Alignment System (2024)

### 6.1 CKEditor 5 Integration and Enhancement

#### 6.1.1 CKEditor Configuration
- **Version Upgrade**: Migrate from Classic build to DecoupledEditor v42.0.0
- **Plugin Integration**: Enable alignment plugin for center, right, justify alignment
- **Toolbar Configuration**: Comprehensive editing tools with alignment controls
- **Content Preservation**: Minimal HTML sanitization to preserve LLM formatting

#### 6.1.2 HTML Preprocessing Implementation
- **Location**: `frontend/src/components/TextEditor/CKTextEditor.jsx`
- **Purpose**: Convert LLM div-level alignment to CKEditor-compatible paragraph alignment
- **Pattern Matching**:
  ```javascript
  // Convert: <div style="text-align: center"><p>content</p></div>
  // To: <p style="text-align: center;">content</p>
  const divCenterPattern = /<div[^>]*style[^>]*text-align:\s*center[^>]*>([\s\S]*?)<\/div>/gi;
  processedContent = processedContent.replace(divCenterPattern, (match, innerContent) => {
    return innerContent.replace(/<p([^>]*)>/gi, '<p$1 style="text-align: center;">');
  });
  ```

#### 6.1.3 Always-On WYSIWYG Mode
- **Editor State**: Disable view/edit mode switching
- **Direct Editing**: Immediate text editing capabilities
- **Auto-save Integration**: Page-level save functionality
- **Content Synchronization**: Live updates between editor and backend

#### 6.1.4 Alignment Support Implementation
- **Supported Alignments**: left (default), center, right, justify
- **Style Processing**: Both inline styles and CSS class support
- **Content Validation**: Preserve exact LLM formatting during editing
- **Debug Mode**: HTML preview functionality for troubleshooting

### 6.2 Enhanced Word Export Pipeline

#### 6.2.1 HTML Parsing Enhancement
- **Location**: `backend/app/services/wordextract.py`
- **Library**: BeautifulSoup4 for robust HTML parsing
- **Multi-format Support**:
  - Inline styles: `style="text-align: center;"`
  - CSS classes: `class="ql-align-center"`
  - Nested elements: `<div style="text-align: center"><p>content</p></div>`

#### 6.2.2 Alignment Extraction Algorithm
```python
def parse_html_to_word_format(html_content: str) -> List[Dict[str, Any]]:
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Handle div containers with alignment
    for div_element in soup.find_all('div'):
        if div_element.get('style') and 'text-align:' in div_element.get('style'):
            # Extract alignment and apply to child paragraphs
            alignment = extract_alignment_from_style(div_element.get('style'))
            apply_alignment_to_children(div_element, alignment)
```

#### 6.2.3 Word Document Generation
- **Paragraph Alignment**: Direct application to Word paragraph objects
- **Alignment Mapping**:
  ```python
  if alignment == "center":
      current_paragraph.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
  elif alignment == "right":
      current_paragraph.alignment = WD_PARAGRAPH_ALIGNMENT.RIGHT
  elif alignment == "justify":
      current_paragraph.alignment = WD_PARAGRAPH_ALIGNMENT.JUSTIFY
  ```

#### 6.2.4 Data Validation Fix
- **Critical Fix**: Preserve alignment field in WordGenerator data validation
- **Before (broken)**: alignment field missing from clean_item dictionary
- **After (fixed)**: `"alignment": item.get("alignment", "left")`
- **Impact**: Ensures alignment data flows through entire pipeline

### 6.3 Comprehensive Logging System

#### 6.3.1 PDFVisionLogger Architecture
- **Location**: `backend/app/utils/logging_config.py`
- **Design**: Centralized logging for entire PDF processing pipeline
- **Log Categories**:
  - **Pipeline Logger**: Main workflow operations
  - **Data Logger**: Content transformation tracking
  - **Database Logger**: CRUD operations
  - **Error Logger**: Exception tracking with context

#### 6.3.2 Request ID Tracking
```python
def generate_request_id() -> str:
    return str(uuid.uuid4())

# Usage throughout pipeline
request_id = generate_request_id()
pdf_vision_logger.log_upload_start(request_id, filename, file_size)
```

#### 6.3.3 Data Flow Logging
- **Upload Phase**: File validation, document creation, page extraction
- **LLM Processing**: Azure OpenAI requests, response parsing, HTML generation
- **Database Operations**: All CRUD with data samples and alignment tracking
- **User Edits**: CKEditor changes, save operations, content updates
- **Word Export**: Block processing, alignment application, document generation

#### 6.3.4 Logging Integration Points
```python
# In upload.py
pdf_vision_logger.log_upload_start(request_id, filename, file_size)

# In text_extraction.py  
pdf_vision_logger.log_llm_processing_start(request_id, page_id, page_number)
pdf_vision_logger.log_llm_data(request_id, page_id, raw_text, formatted_text)

# In wordextract.py
pdf_vision_logger.log_word_export_data(request_id, document_id, blocks_count, blocks_sample)
```

#### 6.3.5 Debugging Tools
- **Interactive Log Viewer**: `view_logs.py` for real-time monitoring
- **Test Suite**: `test_logging.py` for validation
- **Log Analysis**: Search and filter capabilities for troubleshooting

### 6.4 Alignment Debugging and Validation

#### 6.4.1 Debug Scripts
- **`debug_alignment.py`**: Test HTML-to-Word alignment conversion
- **`test_generic_alignment.py`**: Validate multiple alignment formats
- **Usage**: Standalone testing of alignment preservation

#### 6.4.2 Pipeline Validation
1. **LLM Output Verification**: Confirm HTML contains proper alignment tags
2. **HTML Parsing Validation**: Verify BeautifulSoup extracts alignment correctly
3. **Database Storage Check**: Ensure alignment field persists in database
4. **CKEditor Processing**: Validate HTML preprocessing maintains alignment
5. **Word Generation Verification**: Confirm paragraph alignment application

#### 6.4.3 Common Debugging Patterns
```bash
# Check LLM output in data_flow.log
grep "LLM_FORMATTED_TEXT" logs/data_flow.log

# Verify alignment extraction
grep "alignment=" logs/data_flow.log

# Monitor Word export process
grep "WORD_EXPORT" logs/pipeline.log
```

### 6.5 Performance Optimizations

#### 6.5.1 Caching Strategy
- **HTML Preprocessing**: Cache processed content to avoid re-computation
- **Alignment Extraction**: Store alignment mappings for reuse
- **Database Queries**: Optimize alignment field storage and retrieval

#### 6.5.2 Memory Management
- **Large Document Handling**: Page-by-page processing for memory efficiency
- **Log File Rotation**: Automatic cleanup to prevent disk space issues
- **Garbage Collection**: Proper cleanup of cached alignment data

#### 6.5.3 API Response Optimization
- **Structured Responses**: Consistent alignment data format across endpoints
- **Error Handling**: Detailed error messages for alignment-related issues
- **Progress Tracking**: Real-time feedback for long-running operations

## Implementation Checklist

### ✅ Core Features (Completed)
- [x] PDF upload and validation
- [x] Azure OpenAI GPT-4 Vision integration
- [x] Split-screen PDF/text viewer
- [x] Complete OCR correction workflow
- [x] Material UI theming and responsive design

### ✅ Enhanced Features (2024)
- [x] **CKEditor 5 DecoupledEditor integration**
- [x] **HTML preprocessing for alignment conversion**
- [x] **Always-on WYSIWYG editing mode**
- [x] **Comprehensive logging system (PDFVisionLogger)**
- [x] **Enhanced Word export with full alignment support**
- [x] **BeautifulSoup4 HTML parsing for alignment extraction**
- [x] **Request ID tracking for end-to-end debugging**
- [x] **Debug tools and validation scripts**

### 🚀 Quality Assurance
- [x] **End-to-end alignment preservation testing**
- [x] **Comprehensive logging of data flow**
- [x] **Debug scripts for standalone testing**
- [x] **Performance monitoring and optimization**
- [x] **Error handling and recovery mechanisms**

### 📊 Monitoring and Maintenance
- [x] **Log file management and rotation**
- [x] **Performance metrics tracking**
- [x] **Alignment validation tools**
- [x] **Documentation updates and examples**

## Troubleshooting Guide

### Alignment Issues
1. **Check LLM HTML Output**: Verify proper `<div style="text-align: center">` tags
2. **Validate HTML Preprocessing**: Confirm conversion to paragraph-level alignment
3. **Debug CKEditor**: Use HTML preview to verify processed content
4. **Check Word Generation**: Review alignment application in Word document
5. **Analyze Logs**: Search data_flow.log for alignment field preservation

### Logging Issues
1. **Verify LOG_LEVEL**: Set environment variable for appropriate verbosity
2. **Check Log Files**: Ensure logs directory exists and files are writable
3. **Request ID Tracking**: Verify unique request IDs for pipeline tracing
4. **Log Rotation**: Monitor disk space and implement rotation if needed

### Performance Issues
1. **Large Document Processing**: Monitor memory usage during page extraction
2. **Database Query Optimization**: Check slow queries in database.log
3. **API Response Times**: Track endpoint performance in pipeline.log
4. **Cache Efficiency**: Verify caching strategy reduces redundant processing

This implementation guide provides comprehensive coverage of all features including recent enhancements for alignment preservation and logging. The system now offers robust text editing capabilities with full formatting preservation from LLM extraction through Word document export. 