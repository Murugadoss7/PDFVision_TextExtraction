// Alternative solution using React Quill
// Install: npm install react-quill quill

import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { 
  Box, 
  Typography, 
  Button, 
  Alert,
  Toolbar,
  IconButton,
  Tooltip,
  Paper
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Save as SaveIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { usePDFContext } from '../../contexts/PDFContext';
import { submitPageCorrections } from '../../services/api';

const QuillTextEditor = ({ 
  text, 
  formattedText,
  pageNumber, 
  documentId,
  editModeEnabled = false,
  formattingEnabled = false,
  errorDetectionEnabled = false,
  searchQuery = ''
}) => {
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const { loading } = usePDFContext();

  // Function to convert JSON formatted text to HTML
  const convertJsonToHtml = (jsonText) => {
    try {
      // If it's already a string, try to parse it
      let parsedData;
      if (typeof jsonText === 'string') {
        parsedData = JSON.parse(jsonText);
      } else {
        parsedData = jsonText;
      }

      // Check if it has blocks structure
      if (parsedData && parsedData.blocks && Array.isArray(parsedData.blocks)) {
        return parsedData.blocks.map(block => {
          let html = block.text || '';
          
          // Apply formatting based on block properties
          if (block.is_bold) {
            html = `<strong>${html}</strong>`;
          }
          if (block.is_italic) {
            html = `<em>${html}</em>`;
          }
          
          // Handle different block types
          switch (block.type) {
            case 'heading':
            case 'header':
              const level = block.level || 2;
              return `<h${level}>${html}</h${level}>`;
            case 'paragraph':
            default:
              return `<p>${html}</p>`;
          }
        }).join('');
      }
      
      // If it's a different JSON structure, try to extract clean text
      if (parsedData && parsedData.clean_text) {
        return parsedData.clean_text.replace(/\n/g, '<br>');
      }
      
      // Fallback: return as paragraph
      return `<p>${jsonText}</p>`;
    } catch (error) {
      console.error('Error parsing JSON formatted text:', error);
      // If parsing fails, treat as plain text
      return jsonText.replace(/\n/g, '<br>');
    }
  };

  // Update content when text or formattedText changes
  useEffect(() => {
    if (formattedText) {
      // Check if formattedText looks like JSON (legacy format)
      if (typeof formattedText === 'string' && formattedText.trim().startsWith('{')) {
        // It's JSON, convert to HTML
        const htmlContent = convertJsonToHtml(formattedText);
        setContent(htmlContent);
      } else if (typeof formattedText === 'object') {
        // It's already parsed JSON object
        const htmlContent = convertJsonToHtml(formattedText);
        setContent(htmlContent);
      } else if (typeof formattedText === 'string' && (formattedText.includes('<') || formattedText.includes('>'))) {
        // It's HTML content from the new LLM system
        setContent(formattedText);
      } else {
        // Fallback: treat as plain text
        const htmlContent = formattedText.replace(/\n/g, '<br>');
        setContent(htmlContent);
      }
    } else if (text) {
      // Check if text looks like JSON
      if (typeof text === 'string' && text.trim().startsWith('{')) {
        const htmlContent = convertJsonToHtml(text);
        setContent(htmlContent);
      } else if (typeof text === 'string' && (text.includes('<') || text.includes('>'))) {
        // Text contains HTML tags
        setContent(text);
      } else {
        // Otherwise, convert plain text to HTML with line breaks
        const htmlContent = text.replace(/\n/g, '<br>');
        setContent(htmlContent);
      }
    } else {
      setContent('');
    }
  }, [text, formattedText]);

  const handleContentChange = (value) => {
    setContent(value);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset content to original - use same logic as useEffect
    if (formattedText) {
      if (typeof formattedText === 'string' && formattedText.trim().startsWith('{')) {
        const htmlContent = convertJsonToHtml(formattedText);
        setContent(htmlContent);
      } else if (typeof formattedText === 'string' && (formattedText.includes('<') || formattedText.includes('>'))) {
        setContent(formattedText);
      } else {
        const htmlContent = formattedText.replace(/\n/g, '<br>');
        setContent(htmlContent);
      }
    } else if (text) {
      if (typeof text === 'string' && text.trim().startsWith('{')) {
        const htmlContent = convertJsonToHtml(text);
        setContent(htmlContent);
      } else if (typeof text === 'string' && (text.includes('<') || text.includes('>'))) {
        setContent(text);
      } else {
        const htmlContent = text.replace(/\n/g, '<br>');
        setContent(htmlContent);
      }
    }
  };

  // Function to convert QuillTextEditor CSS classes to inline styles
  const convertQuillClassesToInlineStyles = (html) => {
    return html
      .replace(/class="ql-align-center"/g, 'style="text-align: center;"')
      .replace(/class="ql-align-right"/g, 'style="text-align: right;"')
      .replace(/class="ql-align-justify"/g, 'style="text-align: justify;"')
      // Handle combined classes (e.g., class="ql-align-center other-class")
      .replace(/class="([^"]*\s+)?ql-align-center(\s+[^"]*)?"([^>]*>)/g, (match, before, after, rest) => {
        const cleanedClasses = (before || '') + (after || '');
        const classAttr = cleanedClasses.trim() ? ` class="${cleanedClasses.trim()}"` : '';
        return `style="text-align: center;"${classAttr}${rest}`;
      })
      .replace(/class="([^"]*\s+)?ql-align-right(\s+[^"]*)?"([^>]*>)/g, (match, before, after, rest) => {
        const cleanedClasses = (before || '') + (after || '');
        const classAttr = cleanedClasses.trim() ? ` class="${cleanedClasses.trim()}"` : '';
        return `style="text-align: right;"${classAttr}${rest}`;
      })
      .replace(/class="([^"]*\s+)?ql-align-justify(\s+[^"]*)?"([^>]*>)/g, (match, before, after, rest) => {
        const cleanedClasses = (before || '') + (after || '');
        const classAttr = cleanedClasses.trim() ? ` class="${cleanedClasses.trim()}"` : '';
        return `style="text-align: justify;"${classAttr}${rest}`;
      });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      console.log('Saving content for page', pageNumber, 'of document', documentId);
      console.log('Original content:', content);
      
      // Convert QuillTextEditor CSS classes to inline styles for better Word export compatibility
      const contentWithInlineStyles = convertQuillClassesToInlineStyles(content);
      console.log('Content with inline styles:', contentWithInlineStyles);
      
      // Call the API to save the edited content with converted styles
      await submitPageCorrections(documentId, pageNumber, contentWithInlineStyles);
      
      setIsEditing(false);
      console.log('Content saved successfully');
      
      // Show success message
      alert('Page saved successfully!');
    } catch (error) {
      console.error('Error saving content:', error);
      alert(`Failed to save changes: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleHtmlPreview = () => {
    setShowHtmlPreview(!showHtmlPreview);
  };

  // Quill editor modules configuration
  const modules = {
    toolbar: formattingEnabled ? [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['link', 'blockquote', 'code-block'],
      ['clean']
    ] : [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'indent',
    'align', 'link', 'blockquote', 'code-block'
  ];

  // Custom styles for the Quill editor
  const quillStyles = {
    '& .ql-editor': {
      minHeight: '400px',
      fontSize: '14px',
      lineHeight: '1.6',
      fontFamily: 'inherit'
    },
    '& .ql-toolbar': {
      borderTop: '1px solid #ccc',
      borderLeft: '1px solid #ccc',
      borderRight: '1px solid #ccc',
      borderBottom: 'none'
    },
    '& .ql-container': {
      borderBottom: '1px solid #ccc',
      borderLeft: '1px solid #ccc',
      borderRight: '1px solid #ccc',
      borderTop: 'none'
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Typography variant="body1" color="textSecondary">
          Loading text...
        </Typography>
      );
    }

    if (!text || text.trim() === '') {
      return (
        <Typography variant="body1" color="textSecondary">
          No extracted text available for this page.
        </Typography>
      );
    }

    if (isEditing) {
      return (
        <Box>
          <Box sx={quillStyles}>
            <ReactQuill
              value={content}
              onChange={handleContentChange}
              modules={modules}
              formats={formats}
              theme="snow"
              style={{ marginBottom: '20px' }}
            />
          </Box>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Button
                variant="outlined"
                startIcon={<VisibilityIcon />}
                onClick={toggleHtmlPreview}
                size="small"
                sx={{ mr: 1 }}
              >
                {showHtmlPreview ? 'Hide' : 'Show'} HTML
              </Button>
            </Box>
            
            <Box>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                size="small"
                sx={{ mr: 1 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={isLoading}
                size="small"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          </Box>

          {showHtmlPreview && (
            <Paper 
              elevation={1} 
              sx={{ 
                mt: 2, 
                p: 2, 
                backgroundColor: 'grey.50',
                border: '1px solid',
                borderColor: 'grey.300'
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                HTML Preview:
              </Typography>
              <pre style={{
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '200px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {content}
              </pre>
            </Paper>
          )}
        </Box>
      );
    }

    // Display mode - render the HTML content
    return (
      <Box 
        sx={{ 
          '& p': { mb: 1 },
          '& h1, & h2, & h3, & h4, & h5, & h6': { mt: 2, mb: 1 },
          '& ul, & ol': { pl: 2, mb: 1 },
          '& blockquote': { 
            pl: 2, 
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            fontStyle: 'italic',
            backgroundColor: 'grey.50',
            py: 1,
            mb: 1
          },
          '& code': {
            backgroundColor: 'grey.100',
            padding: '2px 4px',
            borderRadius: '4px',
            fontSize: '0.9em'
          },
          '& pre': {
            backgroundColor: 'grey.100',
            padding: '12px',
            borderRadius: '4px',
            overflow: 'auto',
            mb: 1
          }
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Extracted Text - Page {pageNumber}
        </Typography>
        
        {!isEditing && editModeEnabled && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            size="small"
          >
            Edit
          </Button>
        )}
      </Box>
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {renderContent()}
      </Box>
    </Box>
  );
};

export default QuillTextEditor;