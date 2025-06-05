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

  // If no text available, show message
  if (!rawText || rawText.trim() === '') {
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
          const text = block.text || '';
          const highlightedText = getHighlightedText(text, searchTerm);
          
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
      let processedLine = line;
      let alignment = 'left';
      let fontSize = 14;
      let fontWeight = 'normal';
      let isIndent = false;
      
      // Process markers
      if (line.includes('[CENTER]')) {
        alignment = 'center';
        processedLine = processedLine.replace(/\[CENTER\]/g, '');
      }
      if (line.includes('[TITLE]')) {
        fontSize = 18;
        fontWeight = 'bold';
        alignment = 'center';
        processedLine = processedLine.replace(/\[TITLE\]/g, '');
      }
      if (line.includes('[HEADING]')) {
        fontSize = 16;
        fontWeight = 'bold';
        processedLine = processedLine.replace(/\[HEADING\]/g, '');
      }
      if (line.includes('[INDENT]')) {
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
      {processBasicMarkers(rawText)}
    </Box>
  );
};

export default FormattedTextRenderer; 