import React from 'react';
import { Box, Typography } from '@mui/material';

const FormattedTextRenderer = ({ 
  rawText, 
  formattedTextJson, 
  searchTerm = '',
  isEditable = false,
  editValue = '',
  onEditChange = () => {},
  sx = {}
}) => {
  
  // Utility function to strip HTML tags
  const stripHtmlTags = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
  };

  // Highlight search terms
  const getHighlightedText = (text, query) => {
    if (!query || query.trim() === '') return text;
    
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() ? 
            <mark key={index} style={{ backgroundColor: '#FFFF00', padding: 0 }}>{part}</mark> : 
            part
        )}
      </>
    );
  };

  // Clean the raw text by stripping HTML tags
  const cleanText = stripHtmlTags(rawText);

  // If no text available, show message
  if (!cleanText || cleanText.trim() === '') {
    return (
      <Typography color="textSecondary" sx={sx}>
        No text available for this page.
      </Typography>
    );
  }

  // Try to parse formatted text data
  let formattedData = null;
  try {
    if (formattedTextJson) {
      formattedData = JSON.parse(formattedTextJson);
    }
  } catch (e) {
    console.log("Failed to parse formatted text, using raw text");
  }

  // If we have formatted data, render with proper formatting
  if (formattedData && formattedData.blocks) {
    return (
      <Box sx={sx}>
        {formattedData.blocks.map((block, index) => {
          const blockText = stripHtmlTags(block.text || '');
          const highlightedText = getHighlightedText(blockText, searchTerm);
          
          return (
            <Typography
              key={index}
              component="div"
              sx={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: `${block.font_size || 14}px`,
                fontWeight: block.is_bold ? 'bold' : 'normal',
                fontStyle: block.is_italic ? 'italic' : 'normal',
                textAlign: block.alignment === 'center' ? 'center' : 'left',
                paddingLeft: block.is_indent ? '2rem' : '0',
                marginBottom: block.is_title || block.is_heading ? '1rem' : '0.5rem',
                // Add extra styling for titles and headings
                ...(block.is_title && {
                  fontSize: '18px',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }),
                ...(block.is_heading && {
                  fontSize: '16px',
                  fontWeight: 'bold'
                })
              }}
            >
              {highlightedText}
            </Typography>
          );
        })}
      </Box>
    );
  }

  // Fallback to plain text rendering with basic layout marker processing
  const processBasicMarkers = (text) => {
    // Split text into lines and process markers
    const lines = text.split('\n');
    const processedElements = [];
    
    lines.forEach((line, index) => {
      let processedLine = stripHtmlTags(line); // Strip HTML from each line
      let alignment = 'left';
      let fontSize = 14;
      let fontWeight = 'normal';
      let isIndent = false;
      
      // Process markers
      if (processedLine.includes('[CENTER]')) {
        alignment = 'center';
        processedLine = processedLine.replace(/\[CENTER\]/g, '');
      }
      if (processedLine.includes('[TITLE]')) {
        fontSize = 18;
        fontWeight = 'bold';
        alignment = 'center';
        processedLine = processedLine.replace(/\[TITLE\]/g, '');
      }
      if (processedLine.includes('[HEADING]')) {
        fontSize = 16;
        fontWeight = 'bold';
        processedLine = processedLine.replace(/\[HEADING\]/g, '');
      }
      if (processedLine.includes('[INDENT]')) {
        isIndent = true;
        processedLine = processedLine.replace(/\[INDENT\]/g, '');
      }
      
      // Only render non-empty lines
      if (processedLine.trim()) {
        processedElements.push(
          <Typography
            key={index}
            component="div"
            sx={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: `${fontSize}px`,
              fontWeight: fontWeight,
              textAlign: alignment,
              paddingLeft: isIndent ? '2rem' : '0',
              marginBottom: '0.5rem'
            }}
          >
            {getHighlightedText(processedLine, searchTerm)}
          </Typography>
        );
      } else if (processedLine === '') {
        // Add spacing for empty lines
        processedElements.push(
          <Box key={index} sx={{ height: '0.5rem' }} />
        );
      }
    });
    
    return processedElements;
  };

  return (
    <Box sx={sx}>
      {processBasicMarkers(cleanText)}
    </Box>
  );
};

export default FormattedTextRenderer; 