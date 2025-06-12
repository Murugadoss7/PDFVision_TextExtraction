import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Box } from '@mui/material';
import HtmlDiff from 'htmldiff-js';
import DOMPurify from 'dompurify';

const HtmlDiffDisplay = forwardRef(({ originalHtml, modifiedHtml, sx }, ref) => {
  const containerRef = useRef(null);

  const createMarkup = (html) => {
    // Sanitize the HTML to prevent XSS attacks
    const sanitizedHtml = DOMPurify.sanitize(html, { 
      USE_PROFILES: { html: true },
      // Allow ins and del tags which are used by htmldiff-js
      ADD_TAGS: ['ins', 'del'], 
    });
    return { __html: sanitizedHtml };
  };

  // Function to highlight text within the diff display
  const highlightText = (searchText, colorType = 'warning') => {
    if (!containerRef.current || !searchText) return;

    // Clear existing highlights
    const existingHighlights = containerRef.current.querySelectorAll('.search-highlight');
    existingHighlights.forEach(highlight => {
      const parent = highlight.parentNode;
      parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
      parent.normalize();
    });

    // Create a TreeWalker to find all text nodes
    const walker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    // Search and highlight in each text node
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const searchRegex = new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      
      if (searchRegex.test(text)) {
        const highlightedHtml = text.replace(searchRegex, (match) => {
          const bgColor = colorType === 'success' ? 'rgba(40, 167, 69, 0.4)' : 'rgba(255, 193, 7, 0.4)';
          return `<span class="search-highlight" style="background-color: ${bgColor}; padding: 2px 4px; border-radius: 3px;">${match}</span>`;
        });
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = highlightedHtml;
        
        // Replace the text node with highlighted content
        while (tempDiv.firstChild) {
          textNode.parentNode.insertBefore(tempDiv.firstChild, textNode);
        }
        textNode.parentNode.removeChild(textNode);
      }
    });
  };

  // Expose the highlight function to parent components
  useImperativeHandle(ref, () => ({
    highlightText,
    clearHighlights: () => highlightText('') // Clear by searching for empty string
  }));

  const diffHtml = HtmlDiff.execute(originalHtml, modifiedHtml);

  return (
    <Box
      ref={containerRef}
      sx={{
        ...sx,
        '& ins': {
          backgroundColor: 'rgba(40, 167, 69, 0.2)',
          textDecoration: 'none',
          color: 'green',
        },
        '& del': {
          backgroundColor: 'rgba(220, 53, 69, 0.2)',
          textDecoration: 'line-through',
          color: 'red',
        },
        // Preserve paragraphs and line breaks
        whiteSpace: 'pre-wrap', 
        wordBreak: 'break-word',
        fontFamily: 'monospace',
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'auto',
      }}
      dangerouslySetInnerHTML={createMarkup(diffHtml)}
    />
  );
});

HtmlDiffDisplay.displayName = 'HtmlDiffDisplay';

export default HtmlDiffDisplay; 