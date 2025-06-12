import React, { useState, useEffect, useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import { 
  Box, 
  Typography, 
  Button, 
  Toolbar,
  IconButton,
  Tooltip,
  Paper,
  ButtonGroup,
  Chip,
  Divider
} from '@mui/material';
import { 
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { usePDFContext } from '../../contexts/PDFContext';
import { submitPageCorrections } from '../../services/api';

const CKTextEditor = ({ 
  text, 
  formattedText,
  pageNumber, 
  documentId,
  searchQuery = ''
}) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const editorRef = useRef(null);
  const { loading, exportDocumentToWord } = usePDFContext();

  // Simple function to prepare HTML content - minimal processing to preserve LLM formatting
  const prepareHtmlContent = (inputContent) => {
    if (!inputContent) return '<p></p>';

    // If it's already HTML (contains tags), process it to preserve alignment
    if (typeof inputContent === 'string' && (inputContent.includes('<') && inputContent.includes('>'))) {
      // Convert div wrappers with text-align to paragraph-level alignment
      let processedContent = inputContent;
      
      // Pattern to match: <div style="text-align: center"><p>content</p></div>
      const divCenterPattern = /<div[^>]*style[^>]*text-align:\s*center[^>]*>([\s\S]*?)<\/div>/gi;
      processedContent = processedContent.replace(divCenterPattern, (match, innerContent) => {
        // Extract paragraphs from inside the div and apply center alignment to each
        return innerContent.replace(/<p([^>]*)>/gi, '<p$1 style="text-align: center;">');
      });
      
      // Pattern for right alignment
      const divRightPattern = /<div[^>]*style[^>]*text-align:\s*right[^>]*>([\s\S]*?)<\/div>/gi;
      processedContent = processedContent.replace(divRightPattern, (match, innerContent) => {
        return innerContent.replace(/<p([^>]*)>/gi, '<p$1 style="text-align: right;">');
      });
      
      // Pattern for justify alignment
      const divJustifyPattern = /<div[^>]*style[^>]*text-align:\s*justify[^>]*>([\s\S]*?)<\/div>/gi;
      processedContent = processedContent.replace(divJustifyPattern, (match, innerContent) => {
        return innerContent.replace(/<p([^>]*)>/gi, '<p$1 style="text-align: justify;">');
      });
      
      console.log('Original HTML:', inputContent);
      console.log('Processed HTML:', processedContent);
      
      return processedContent;
    }

    // If it's JSON formatted text, try to parse it
    if (typeof inputContent === 'string' && inputContent.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(inputContent);
        if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
          return parsed.blocks.map(block => {
            let html = block.text || '';
            
            if (block.is_bold) html = `<strong>${html}</strong>`;
            if (block.is_italic) html = `<em>${html}</em>`;
            
            let style = '';
            if (block.alignment === 'center') style = ' style="text-align: center;"';
            else if (block.alignment === 'right') style = ' style="text-align: right;"';
            else if (block.alignment === 'justify') style = ' style="text-align: justify;"';
            
            switch (block.type) {
              case 'heading':
              case 'header':
                const level = block.level || 2;
                return `<h${level}${style}>${html}</h${level}>`;
              case 'paragraph':
              default:
                return `<p${style}>${html}</p>`;
            }
          }).join('');
        }
        
        if (parsed && parsed.clean_text) {
          return parsed.clean_text.replace(/\n/g, '<br>');
        }
      } catch (error) {
        console.warn('Failed to parse JSON content, treating as plain text:', error);
      }
    }

    // For plain text, preserve line breaks
    if (typeof inputContent === 'string') {
      return inputContent.replace(/\n/g, '<br>');
    }

    return '<p></p>';
  };

  // Initialize content when text or formattedText changes
  useEffect(() => {
    // Prefer formattedText over text as it should contain the LLM-processed HTML
    const sourceContent = formattedText || text;
    const processedContent = prepareHtmlContent(sourceContent);
    
    console.log('CKTextEditor - Source content:', sourceContent);
    console.log('CKTextEditor - Processed content:', processedContent);
    
    setContent(processedContent);
  }, [text, formattedText]);

  const handleContentChange = (event, editor) => {
    const data = editor.getData();
    setContent(data);
  };

  const handleReset = () => {
    // Reset to original content
    const sourceContent = formattedText || text;
    const resetContent = prepareHtmlContent(sourceContent);
    
    setContent(resetContent);
    
    if (editorRef.current) {
      editorRef.current.setData(resetContent);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Get current content from editor
      const currentContent = editorRef.current ? editorRef.current.getData() : content;
      
      console.log('Saving content for page', pageNumber, 'of document', documentId);
      console.log('Content:', currentContent);
      
      await submitPageCorrections(documentId, pageNumber, currentContent);
      
      console.log('Content saved successfully');
      alert('Page saved successfully!');
    } catch (error) {
      console.error('Error saving content:', error);
      alert(`Failed to save changes: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!documentId || isExporting) return;
    
    setIsExporting(true);
    try {
      await exportDocumentToWord(documentId);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Failed to export document: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleHtmlPreview = () => {
    setShowHtmlPreview(!showHtmlPreview);
  };

  // CKEditor Document Editor configuration optimized for preserving LLM HTML formatting
  const editorConfiguration = {
    toolbar: [
      'heading',
      '|',
      'bold', 'italic', 'underline',
      '|',
      'alignment',
      '|',
      'bulletedList', 'numberedList',
      '|',
      'outdent', 'indent',
      '|',
      'blockQuote', 'insertTable',
      '|',
      'link', 'mediaEmbed',
      '|',
      'undo', 'redo'
    ],
    
    heading: {
      options: [
        { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
        { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
        { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
        { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
      ]
    },
    
    // Document Editor includes alignment plugin by default!
    alignment: {
      options: ['left', 'center', 'right', 'justify']
    },

    // Preserve all HTML content exactly as received from LLM
    htmlSupport: {
      allow: [
        {
          name: /^.*$/,
          styles: true,
          attributes: true,
          classes: true
        }
      ],
      disallow: []
    },

    // Minimal content filtering to preserve LLM formatting
    htmlEmbed: {
      showPreviews: true,
      sanitizeHtml: (inputHtml) => inputHtml // No sanitization
    },

    // Disable paste normalization to preserve exact formatting
    clipboard: {
      matchVisual: false
    },

    // Enhanced to preserve exact LLM formatting
    contentStyles: `
      .ck-content {
        font-family: inherit;
        line-height: 1.6;
        padding: 1.5rem;
        min-height: 100% !important;
        height: auto !important;
        border: none;
        outline: none;
        overflow-y: auto;
      }
      .ck-content * {
        margin: inherit;
        padding: inherit;
      }
      /* CRITICAL: Preserve ALL alignment from LLM HTML */
      .ck-content div[style*="text-align: center"],
      .ck-content div[style*="text-align:center"] {
        text-align: center !important;
      }
      .ck-content div[style*="text-align: center"] p,
      .ck-content div[style*="text-align:center"] p {
        text-align: center !important;
      }
      .ck-content p[style*="text-align: center"],
      .ck-content p[style*="text-align:center"] {
        text-align: center !important;
      }
      /* Preserve right alignment */
      .ck-content div[style*="text-align: right"],
      .ck-content p[style*="text-align: right"] {
        text-align: right !important;
      }
      /* Preserve justify alignment */
      .ck-content div[style*="text-align: justify"],
      .ck-content p[style*="text-align: justify"] {
        text-align: justify !important;
      }
    `
  };

  const renderContent = () => {
    if (showHtmlPreview) {
      const currentContent = editorRef.current ? editorRef.current.getData() : content;
      return (
        <Box sx={{ 
          p: 2, 
          bgcolor: 'grey.50',
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          whiteSpace: 'pre-wrap',
          height: '100%',
          overflow: 'auto',
          border: '1px solid',
          borderColor: 'divider'
        }}>
          {currentContent}
        </Box>
      );
    }

    return (
      <Box sx={{ 
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        '& .ck-editor__main': {
          height: '100% !important',
          overflow: 'hidden !important'
        },
        '& .ck-editor__editable': {
          border: 'none !important',
          boxShadow: 'none !important',
          borderRadius: '0 !important',
          height: '100% !important',
          maxHeight: 'none !important',
          overflow: 'auto !important',
          padding: '20px !important'
        },
        '& .ck-toolbar': {
          borderLeft: 'none !important',
          borderRight: 'none !important',
          borderTop: 'none !important',
          borderRadius: '0 !important',
          flexShrink: 0
        }
      }}>
        {/* CKEditor Toolbar Container */}
        <Box id="document-editor-toolbar" sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          bgcolor: 'background.paper',
          flexShrink: 0,
          '& .ck-toolbar': {
            backgroundColor: 'transparent !important',
            border: 'none !important'
          }
        }} />
        
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100% - 48px)' // Account for toolbar height
        }}>
          <CKEditor
            editor={DecoupledEditor}
            config={editorConfiguration}
            data={content}
            onChange={handleContentChange}
            onReady={editor => {
              editorRef.current = editor;
              
              // Insert toolbar into the designated container
              const toolbarContainer = document.querySelector('#document-editor-toolbar');
              if (toolbarContainer && editor.ui.view.toolbar.element) {
                toolbarContainer.appendChild(editor.ui.view.toolbar.element);
              }

              // Ensure the editing area takes full height
              const editingView = editor.editing.view;
              const editableElement = editingView.document.getRoot();
              
              // Set minimum height to ensure content is scrollable
              if (editableElement) {
                editor.editing.view.change(writer => {
                  writer.setStyle('min-height', '100%', editableElement);
                });
              }
              
              console.log('Document Editor ready with content:', content);
            }}
          />
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.paper'
    }}>
      {/* Compact Header */}
      <Paper 
        elevation={0}
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2, 
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          borderRadius: 0,
          bgcolor: 'background.default'
        }}
      >
        {/* Page Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Page {pageNumber}
          </Typography>
          <Chip 
            label="Text Editor" 
            size="small" 
            variant="outlined"
            sx={{ height: 24, fontSize: '0.7rem' }}
          />
        </Box>
        
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Toggle HTML Preview" arrow>
            <IconButton 
              size="small"
              onClick={toggleHtmlPreview}
              color={showHtmlPreview ? "primary" : "default"}
              sx={{ 
                width: 32, 
                height: 32,
                border: showHtmlPreview ? 1 : 0,
                borderColor: 'primary.main'
              }}
            >
              <CodeIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <ButtonGroup size="small" variant="outlined">
            <Button
              startIcon={<RefreshIcon sx={{ fontSize: '16px !important' }} />}
              onClick={handleReset}
              disabled={isLoading}
              sx={{ 
                minWidth: 80,
                height: 32,
                fontSize: '0.75rem',
                textTransform: 'none'
              }}
            >
              Reset
            </Button>
            <Button
              startIcon={<SaveIcon sx={{ fontSize: '16px !important' }} />}
              onClick={handleSave}
              disabled={isLoading}
              variant="contained"
              sx={{ 
                minWidth: 80,
                height: 32,
                fontSize: '0.75rem',
                textTransform: 'none'
              }}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </ButtonGroup>

          <Button
            startIcon={<DownloadIcon sx={{ fontSize: '16px !important' }} />}
            onClick={handleExport}
            variant="contained"
            color="secondary"
            disabled={isExporting || !documentId}
            size="small"
            sx={{ 
              minWidth: 100,
              height: 32,
              fontSize: '0.75rem',
              textTransform: 'none',
              ml: 1
            }}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </Box>
      </Paper>

      {/* Editor Content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {renderContent()}
      </Box>
    </Box>
  );
};

export default CKTextEditor; 