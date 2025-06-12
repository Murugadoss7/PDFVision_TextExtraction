# Project Structure Guide

This document outlines the recommended file and directory structure for the PDF Vision Text Extraction project, providing guidelines for organizing code, assets, and documentation to ensure maintainability and scalability.

## 📁 Project Overview

The project follows a **monorepo structure** with clear separation between frontend (React) and backend (FastAPI) applications, along with comprehensive documentation and configuration files.

```
PDFVision_TextExtraction/
├── 📂 frontend/                    # React application (Vite + Material UI)
├── 📂 backend/                     # FastAPI application
├── 📂 docs/                        # Project documentation
├── 📂 .cursor/                     # Cursor IDE configuration
├── 📄 README.md                    # Main project documentation
├── 📄 task.md                      # Implementation task tracking
└── 📄 project plan1.md             # Detailed project planning
```

---

## 🎨 Frontend Structure (`frontend/`)

The frontend follows **React best practices** with component-based architecture and Material UI theming.

### Directory Structure

```
frontend/
├── 📂 public/                      # Static assets served directly
│   ├── 🖼️ favicon.ico             # Application favicon
│   └── 📄 index.html              # Main HTML template
├── 📂 src/                         # Source code
│   ├── 📂 components/              # React components
│   │   ├── 📂 CorrectionWorkflow/  # OCR correction workflow components (ENHANCED)
│   │   │   ├── 📄 CorrectionDocumentUpload.jsx  # Document B upload interface
│   │   │   ├── 📄 ComparisonView.jsx            # Phase 1: Text comparison & bulk editing
│   │   │   ├── 📄 FinalReviewView.jsx           # Phase 2: Final review & manual editing
│   │   │   ├── 📄 HtmlDiffDisplay.jsx           # Diff visualization component
│   │   │   ├── 📄 DiffCard.jsx                  # Individual difference display
│   │   │   ├── 📄 DocumentPanel.jsx             # Document display panel
│   │   │   ├── 📄 DifferencePanel.jsx           # Difference management panel
│   │   │   └── 📄 PageNavigation.jsx            # Page navigation controls
│   │   ├── 📂 PDFViewer/          # PDF rendering components
│   │   ├── 📂 TextEditor/         # Text editing components (ENHANCED)
│   │   │   ├── 📄 CKTextEditor.jsx              # Enhanced CKEditor 5 with alignment
│   │   │   └── 📄 quilEditor.jsx                # Alternative editor
│   │   ├── 📂 ToolBar/            # Navigation and control components
│   │   ├── 📂 UI/                 # Reusable UI components
│   │   ├── 📄 HomePage.jsx        # Main landing page
│   │   └── 📄 PDFUpload.jsx       # File upload interface
│   ├── 📂 contexts/               # React Context providers (with correction workflow state)
│   ├── 📂 hooks/                  # Custom React hooks (NEW)
│   │   └── 📄 useHighlighting.js  # Text highlighting and search functionality
│   ├── 📂 services/               # API communication layer
│   ├── 📂 utils/                  # Utility functions and helpers (NEW)
│   │   └── 📄 stringUtils.js      # String manipulation and formatting utilities
│   ├── 📄 App.jsx                 # Main application component
│   ├── 📄 index.jsx               # Application entry point
│   ├── 📄 index.css               # Global styles
│   └── 📄 theme.js                # Material UI theme configuration
├── 📂 node_modules/               # Dependencies (auto-generated)
├── 📄 package.json                # Dependencies and scripts
├── 📄 package-lock.json           # Dependency lock file
└── 📄 vite.config.js              # Vite build configuration
```

### Component Organization Guidelines

#### 🔧 Component Naming Conventions
- **PascalCase** for component files: `PDFViewer.jsx`, `TextEditor.jsx`
- **camelCase** for utility files: `apiService.js`, `formatUtils.js`
- **kebab-case** for CSS modules: `pdf-viewer.module.css`

#### 📦 Component Structure Pattern
```javascript
// ComponentName/
├── index.jsx           // Main component export
├── ComponentName.jsx   // Component implementation
├── styles.module.css   // Component-specific styles
└── README.md          // Component documentation
```

#### 🎯 Component Categories
- **`UI/`**: Reusable components (buttons, modals, inputs)
- **`PDFViewer/`**: PDF rendering and navigation
- **`TextEditor/`**: Text editing and formatting
- **`ToolBar/`**: Application controls and navigation
- **`CorrectionWorkflow/`**: Text correction and validation

---

## ⚡ Backend Structure (`backend/`)

The backend follows **FastAPI best practices** with clean architecture and separation of concerns.

### Directory Structure

```
backend/
├── 📂 app/                         # Core application code
│   ├── 📂 api/                     # API layer
│   │   └── 📂 routes/             # API route handlers
│   │       ├── 📄 upload.py       # Enhanced file upload endpoints with logging
│   │       ├── 📄 documents.py    # Document management with correction status
│   │       ├── 📄 extract.py      # Text extraction endpoints
│   │       └── 📄 correction.py   # Complete OCR correction workflow endpoints (NEW)
│   ├── 📂 core/                   # Core application logic
│   │   ├── 📄 config.py           # Configuration management
│   │   └── 📄 security.py         # Authentication and security
│   ├── 📂 db/                     # Database layer
│   │   ├── 📄 database.py         # Database connection
│   │   ├── 📄 models.py           # Enhanced SQLAlchemy models with correction tables
│   │   └── 📄 schemas.py          # Enhanced Pydantic schemas with correction workflows
│   ├── 📂 services/               # Business logic layer (ENHANCED)
│   │   ├── 📄 pdf_processing.py   # PDF manipulation with logging
│   │   ├── 📄 text_extraction.py  # AI text extraction with comprehensive logging
│   │   ├── 📄 export_service.py   # Document export
│   │   ├── 📄 wordextract.py      # Enhanced Word generation with alignment support
│   │   ├── 📄 editable_pdf_service.py    # Document B text extraction service (NEW)
│   │   └── 📄 text_comparison_service.py # Advanced diff algorithm service (NEW)
│   ├── 📂 utils/                  # Utility functions (ENHANCED)
│   │   ├── 📄 file_utils.py       # File operations
│   │   ├── 📄 validation.py       # Input validation
│   │   └── 📄 logging_config.py   # Comprehensive logging system (PDFVisionLogger) (NEW)
│   └── 📄 main.py                 # FastAPI application entry
├── 📂 database/                   # SQLite database files
│   └── 📄 pdf_extractor.db        # Main database with correction workflow tables
├── 📂 uploads/                    # Uploaded PDF files
│   └── 📂 correction_inputs/      # Editable PDFs for correction workflow (NEW)
├── 📂 extracted/                  # Extracted page images
├── 📂 exports/                    # Enhanced Word document exports
├── 📂 temp_exports/               # Temporary export files (NEW)
├── 📂 logs/                       # Comprehensive logging system (NEW)
│   ├── 📄 pipeline.log            # Main operations and workflow progress
│   ├── 📄 data_flow.log           # Data transformation and content tracking
│   ├── 📄 database.log            # Database operations and queries
│   └── 📄 errors.log              # Error tracking with context and stack traces
├── 📂 tests/                      # Test files
├── 📂 venv/                       # Python virtual environment
├── 📄 requirements.txt            # Enhanced Python dependencies
├── 📄 .env                        # Environment variables with logging configuration
├── 📄 view_logs.py                # Interactive log viewer utility (NEW)
├── 📄 test_logging.py             # Logging system validation script (NEW)
└── 📄 debug_*.py                  # Debug and alignment testing scripts (NEW)
```

### Backend Organization Guidelines

#### 🏗️ Architecture Layers
1. **API Layer** (`api/routes/`): HTTP endpoints and request/response handling
2. **Service Layer** (`services/`): Business logic and external integrations
3. **Data Layer** (`db/`): Database models and data access
4. **Core Layer** (`core/`): Configuration and cross-cutting concerns

#### 📄 File Naming Conventions
- **snake_case** for Python files: `pdf_processing.py`, `text_extraction.py`
- **PascalCase** for classes: `DocumentModel`, `TextExtractionService`
- **UPPER_CASE** for constants: `MAX_FILE_SIZE`, `ALLOWED_EXTENSIONS`

#### 🔐 Environment Configuration
```bash
# Required environment variables in .env

# Azure OpenAI API Configuration
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2023-12-01
AZURE_OPENAI_DEPLOYMENT=your-deployment-name

# Database Configuration
DATABASE_URL=sqlite:///./database/pdf_extractor.db

# CORS settings
ALLOWED_ORIGINS=http://localhost:5173

# Comprehensive Logging Configuration (NEW)
LOG_LEVEL=INFO                    # DEBUG, INFO, WARNING, ERROR, CRITICAL
ENABLE_PIPELINE_LOGGING=true     # Enable pipeline operations logging
ENABLE_DATA_FLOW_LOGGING=true    # Enable data transformation logging
ENABLE_DATABASE_LOGGING=true     # Enable database operations logging
ENABLE_ERROR_LOGGING=true        # Enable error tracking logging
```

---

## 📚 Documentation Structure (`docs/`)

Comprehensive documentation following **docs-as-code** principles.

### Directory Structure

```
docs/
├── 📂 diagrams/                   # Visual documentation
│   └── 📄 system-architecture-flow.md
├── 📂 tasks/                      # Task management
├── 📄 STRUCTURE.md               # This file - project organization
├── 📄 implementationGuide.md     # Development guidelines
├── 📄 implementationCode.md      # Code examples and snippets
├── 📄 projectPlan.md            # Project roadmap and phases
├── 📄 systemArchitecture.md     # Technical architecture
└── 📄 azure_openai_setup.md     # Azure OpenAI configuration
```

### Documentation Guidelines

#### 📝 File Naming Conventions
- **PascalCase** for major documents: `STRUCTURE.md`, `README.md`
- **camelCase** for specific guides: `implementationGuide.md`, `projectPlan.md`
- **kebab-case** for diagrams: `system-architecture-flow.md`

#### 📊 Documentation Types
- **`.md`** files: All documentation in Markdown format
- **Mermaid diagrams**: For system architecture and workflow visualization
- **Code examples**: Embedded in documentation with syntax highlighting

---

## 🛠️ Development Guidelines

### File Creation Best Practices

#### ✅ DO:
- **Create small, focused files** with single responsibilities
- **Use descriptive names** that clearly indicate purpose
- **Group related functionality** in logical directories
- **Include README.md** in complex component directories
- **Add JSDoc/docstrings** for functions and classes

#### ❌ DON'T:
- **Create monolithic files** with multiple responsibilities
- **Use generic names** like `utils.js` or `helpers.py`
- **Mix different concerns** in the same directory
- **Skip documentation** for complex components
- **Hardcode configuration** values

### Naming Conventions Summary

| File Type | Convention | Example |
|-----------|------------|---------|
| React Components | PascalCase | `PDFViewer.jsx` |
| Python Modules | snake_case | `pdf_processing.py` |
| CSS Files | kebab-case | `pdf-viewer.module.css` |
| Documentation | PascalCase/camelCase | `STRUCTURE.md`, `implementationGuide.md` |
| Directories | PascalCase/camelCase | `PDFViewer/`, `api/routes/` |

### Code Organization Principles

1. **Separation of Concerns**: Each file should have a single, well-defined purpose
2. **Dependency Direction**: Dependencies should flow from UI → Services → Data
3. **Feature Grouping**: Related components should be grouped together
4. **Configuration Management**: All environment-specific values in `.env` files
5. **Error Boundaries**: Implement error handling at appropriate architectural levels

---

## 🚀 Getting Started

### Adding New Features

1. **Frontend Components**:
   ```bash
   mkdir frontend/src/components/NewFeature
   touch frontend/src/components/NewFeature/{index.jsx,NewFeature.jsx,README.md}
   ```

2. **Backend Services**:
   ```bash
   touch backend/app/services/new_feature_service.py
   touch backend/app/api/routes/new_feature.py
   ```

3. **Documentation**:
   ```bash
   touch docs/new-feature-guide.md
   # Add to docs/diagrams/ if architectural changes
   ```

### Maintenance Tasks

- **Dependency Updates**: Regular `npm audit` and `pip list --outdated` checks
- **Documentation Sync**: Update docs when adding new components/services
- **Database Migrations**: Use proper migration scripts for schema changes
- **Test Coverage**: Maintain tests alongside feature development

---

## 🔍 Quick Reference

### Common File Locations

| Need to... | Look in... |
|------------|------------|
| Add UI component | `frontend/src/components/` |
| Modify API endpoint | `backend/app/api/routes/` |
| Update business logic | `backend/app/services/` |
| Change database schema | `backend/app/db/models.py` |
| Add documentation | `docs/` |
| Configure environment | `backend/.env` |
| Update dependencies | `package.json` or `requirements.txt` |

This structure ensures **scalability**, **maintainability**, and **team collaboration** while following industry best practices for React and FastAPI applications. 