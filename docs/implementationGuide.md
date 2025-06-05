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