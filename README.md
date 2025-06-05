# PDF Vision Text Extractor

A web application that allows users to upload PDF documents and extract text while preserving formatting. The application features a sophisticated OCR correction workflow, side-by-side viewer with synchronized scrolling, text editing capabilities, and export functionality.

## Features

- ✅ PDF Upload with validation and progress tracking
- ✅ Text extraction using Azure OpenAI's GPT-4 Vision model
- ✅ Split-screen viewer (PDF on left, extracted text on right)
- ✅ Page navigation with synchronized views
- ✅ Text editing with formatting options
- ✅ **Complete two-phase OCR correction workflow**
- ✅ **Advanced text comparison with diff highlighting**
- ✅ **Bulk correction operations (Ignore All, Replace All)**
- ✅ **Individual difference application and manual editing**
- ✅ **PDF preview with synchronized navigation**
- ✅ Word document export with corrected text priority
- ✅ Search functionality within extracted text
- ✅ Light/Dark theme support
- ✅ Responsive UI with Material UI
- ✅ Document management with correction status tracking

## Tech Stack

- **Frontend**: React 18 with Vite and Material UI components
- **Backend**: FastAPI with comprehensive correction endpoints
- **Database**: SQLite (development), PostgreSQL ready
- **PDF Processing**: PyMuPDF (fitz) for text extraction and layer processing
- **Text Extraction**: Azure OpenAI GPT-4 Vision model
- **Text Comparison**: difflib algorithm for accurate diff generation
- **PDF Rendering**: react-pdf
- **Split View**: react-resizable-panels
- **Document Export**: python-docx library
- **File Upload**: react-dropzone with progress tracking

## OCR Correction Workflow

The application includes a sophisticated two-phase OCR correction workflow that significantly improves text extraction accuracy:

### Phase 1: Text Comparison and Bulk Correction
1. **Upload Editable PDF**: Users upload a second PDF (Document B) with existing text layers
2. **Automatic Text Extraction**: System extracts text from Document B using PyMuPDF
3. **Intelligent Comparison**: Advanced diff algorithm compares OCR text with editable text
4. **Visual Diff Display**: Color-coded highlighting shows differences between texts
5. **Bulk Operations**:
   - **Ignore All**: Keep original OCR text for entire page
   - **Replace All**: Replace with Document B text for entire page
   - **Individual Changes**: Apply specific corrections from Document B
6. **Search and Navigation**: Search within both text versions with highlighting
7. **Progress Tracking**: Visual indicators show completion status across all pages

### Phase 2: Final Review and Manual Editing
1. **PDF Preview**: Side-by-side view of original scanned PDF and corrected text
2. **Manual Editing**: Full text editing capabilities with real-time updates
3. **Synchronized Navigation**: PDF pages and text editor automatically stay aligned
4. **Page-by-Page Editing**: Individual page corrections with unsaved changes warnings
5. **Document Finalization**: Complete the correction process for export
6. **Enhanced Export**: Word document generation prioritizes corrected text

### Correction Workflow Features
- **Two-Panel Interface**: Intuitive layout for comparing and editing text
- **Real-time Diff Highlighting**: Color-coded differences with detailed descriptions
- **Bulk Operations**: Efficient correction of entire pages
- **Individual Difference Handling**: Precise control over specific changes
- **Progress Tracking**: Visual completion indicators across all document pages
- **State Management**: Workflow state preserved during navigation
- **Error Prevention**: Unsaved changes warnings and validation
- **Export Integration**: Seamless Word document generation with corrections

## Project Structure

The project follows a structured architecture as outlined in `docs/systemArchitecture.md`:

```
PDFVision_TextExtraction/
├── frontend/          # React application (Vite + Material UI)
│   ├── src/           # Source code
│   │   ├── components/# UI components
│   │   │   ├── CorrectionWorkflow/  # OCR correction workflow components
│   │   │   │   ├── CorrectionDocumentUpload.jsx  # Document B upload
│   │   │   │   ├── ComparisonView.jsx           # Phase 1: Text comparison
│   │   │   │   └── FinalReviewView.jsx          # Phase 2: Final review
│   │   │   ├── PDFViewer/          # PDF rendering components
│   │   │   ├── TextEditor/         # Text editing components
│   │   │   ├── ToolBar/            # Navigation controls
│   │   │   └── UI/                 # Reusable UI components
│   │   ├── contexts/  # Context providers
│   │   └── theme.js   # Material UI theme configuration
└── backend/           # FastAPI application
    ├── app/           # Core application code
    │   ├── api/routes/# API endpoints
    │   │   └── correction.py        # OCR correction endpoints
    │   ├── services/  # Business logic
    │   │   ├── editable_pdf_service.py    # Document B text extraction
    │   │   └── text_comparison_service.py # Diff algorithm
    │   └── db/        # Database models
    │       └── models.py            # Includes correction tables
    ├── uploads/       # Uploaded PDF files
    │   └── correction_inputs/       # Editable PDFs for correction
    ├── extracted/     # Extracted page images
    └── exports/       # Exported Word documents
```

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- Azure OpenAI API access with GPT-4 Vision deployment

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with your Azure OpenAI configuration:
   ```
   # Azure OpenAI API Configuration
   AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
   AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
   AZURE_OPENAI_API_VERSION=2023-12-01
   AZURE_OPENAI_DEPLOYMENT=your-gpt4-vision-deployment-name
   
   # Database Configuration
   DATABASE_URL=sqlite:///./database/pdf_extractor.db
   
   # CORS settings
   ALLOWED_ORIGINS=http://localhost:5173
   
   # Logging Configuration
   LOG_LEVEL=INFO
   ```

5. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. The application will be available at `http://localhost:5173`

## Azure OpenAI Configuration

This application uses Azure OpenAI for text extraction. See `docs/azure_openai_setup.md` for detailed instructions on setting up your Azure OpenAI resources.

## Usage Guide

### Basic Text Extraction

1. **Uploading a PDF**: From the homepage, use the upload zone to drag and drop a PDF file or click to select one.

2. **Viewing Documents**: After uploading, you'll be redirected to the viewer page showing the PDF on the left and extracted text on the right.

3. **Navigating Pages**: Use the toolbar controls to navigate between pages with synchronized scrolling.

4. **Editing Text**: Toggle the "Edit Mode" switch in the toolbar to make changes to the extracted text.

5. **Search Text**: Use the search bar in the header to find specific text within the extracted content.

6. **Export**: Click the "Export to Word" button to download the document as a Word file with preserved formatting.

### OCR Correction Workflow

For improved text accuracy, use the comprehensive correction workflow:

#### Accessing Correction Workflow
1. **From Document List**: Click the correction icon (⚔️) next to any completed document
2. **Route**: Navigate to `/correction/{documentId}/upload`

#### Phase 1: Document Setup and Text Comparison
1. **Document Validation**: System validates that OCR processing is complete
2. **Upload Editable PDF**: 
   - Drag and drop or click to upload a PDF with existing text layers (Document B)
   - System validates the file and tracks upload progress
   - Text extraction occurs automatically using PyMuPDF
3. **Navigate to Comparison**: Click "Proceed to Comparison" when both documents are ready
4. **Text Comparison Interface**:
   - **Left Panel**: Original OCR text (editable)
   - **Right Panel**: Editable PDF text (reference)
   - **Difference Highlighting**: Color-coded differences with detailed descriptions
5. **Apply Corrections**:
   - **Individual Changes**: Click on specific differences to apply them
   - **Bulk Operations**:
     - "Ignore All" - Keep original OCR text
     - "Replace All" - Use Document B text for entire page
     - "Revert" - Return to original OCR text
6. **Search and Navigate**: Use search functionality and page navigation
7. **Progress Tracking**: Monitor completion across all pages
8. **Proceed to Final Review**: Click "Proceed to Final Review" when ready

#### Phase 2: Final Review and Manual Editing
1. **PDF Preview**: View original scanned PDF alongside corrected text
2. **Manual Editing**: 
   - Full text editing capabilities
   - Page-by-page text refinement
   - Real-time synchronization with PDF pages
3. **Save Progress**: Save changes per page with unsaved changes warnings
4. **Navigation**: 
   - Use pagination to move between pages
   - "Back to Compare" to return to Phase 1
5. **Finalize Document**: Complete the correction process
6. **Export Enhanced Document**: Download Word document with corrected text

### Advanced Features

#### Theme and UI
- **Theme Toggle**: Switch between light and dark themes using the Material UI theme toggle
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Progress Indicators**: Real-time feedback for all operations

#### Search and Navigation
- **Global Search**: Find text across all extracted content
- **Page Synchronization**: PDF and text views stay aligned
- **Keyboard Navigation**: Efficient page navigation controls

#### Export Options
- **Standard Export**: Uses original OCR text
- **Corrected Export**: Prioritizes corrected text when available
- **Format Preservation**: Maintains document structure in Word export

## API Endpoints

### Core Endpoints
- `POST /api/upload` - Upload PDF documents
- `GET /api/documents` - List all documents
- `GET /api/documents/{id}` - Get document details
- `POST /api/export/{id}` - Export document as Word

### OCR Correction Endpoints
- `POST /api/correction/documents/{id}/editable-pdf` - Upload Document B
- `GET /api/correction/documents/{id}/compare/page/{page}` - Get comparison data
- `POST /api/correction/documents/{id}/corrections/page/{page}` - Submit corrections
- `GET /api/correction/documents/{id}/corrected-text` - Get final corrected text
- `POST /api/correction/documents/{id}/finalize` - Finalize correction workflow

## Implementation Details

The implementation is divided into phases:

1. **Phase 1 (Completed)**: PDF Upload, Text Extraction with Azure OpenAI GPT-4 Vision, and Split Screen View
2. **Phase 2 (Completed)**: Modern UI with Material UI, Export to Word functionality  
3. **Phase 3 (Completed)**: Advanced OCR Correction Workflow with Two-Phase Editing System
4. **Phase 4 (Completed)**: Performance Optimization and User Experience Enhancements

### OCR Correction Architecture
- **Backend Services**: EditablePDFService and TextComparisonService
- **Database Models**: EditablePDFText and CorrectedText tables
- **Frontend Components**: CorrectionDocumentUpload, ComparisonView, FinalReviewView
- **Diff Algorithm**: Advanced text comparison using difflib.SequenceMatcher
- **State Management**: React Context with caching for performance

For detailed implementation guidance, see `docs/implementationGuide.md`.

## Development

- **Code Structure**: See `docs/STRUCTURE.md` for project organization guidelines
- **Implementation Examples**: Refer to `docs/implementationCode.md` for detailed code snippets
- **System Architecture**: View `docs/diagrams/system-architecture-flow.md` for visual documentation
- **OCR Correction Workflow**: Complete implementation details in `docs/tasks/task-plan-interactive-ocr-correction.md`

## Testing

### Backend Testing
```bash
cd backend
python -m pytest
```

### Frontend Testing
```bash
cd frontend
npm test
```

### OCR Correction Workflow Testing
```bash
# Backend correction endpoints
cd backend
python -m pytest tests/api/test_correction_endpoints.py

# Frontend correction components
cd frontend
npm test -- --testPathPattern=CorrectionWorkflow
```

### Azure OpenAI Integration Testing
```bash
cd backend
python test_azure_openai.py
```

## Performance Features

- **Caching Strategy**: Comparison data cached per page for performance
- **Memory Optimization**: Efficient handling of large PDFs
- **Lazy Loading**: PDF pages loaded on demand
- **Progress Tracking**: Real-time feedback for all operations
- **Error Recovery**: Comprehensive error handling and recovery mechanisms

## Documentation

Complete documentation is available in the `docs/` directory:
- `docs/STRUCTURE.md` - Project organization guide
- `docs/systemArchitecture.md` - Technical architecture with OCR correction details
- `docs/implementationGuide.md` - Development guidelines including correction workflow
- `docs/azure_openai_setup.md` - Azure OpenAI configuration
- `docs/diagrams/system-architecture-flow.md` - Visual documentation with correction workflow
- `docs/tasks/task-plan-interactive-ocr-correction.md` - Complete correction implementation details

## License

[MIT License](LICENSE) 