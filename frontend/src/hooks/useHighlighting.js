import { useRef, useCallback } from 'react';

export const useHighlighting = () => {
  const documentARef = useRef(null);
  const documentBRef = useRef(null);
  const htmlDiffDisplayRef = useRef(null);

  const getHighlightColor = (colorType) => {
    switch (colorType) {
      case 'success': return 'rgba(40, 167, 69, 0.4)';
      case 'warning': return 'rgba(255, 193, 7, 0.4)';
      case 'error': return 'rgba(220, 53, 69, 0.4)';
      case 'info': return 'rgba(23, 162, 184, 0.4)';
      default: return 'rgba(255, 235, 59, 0.4)';
    }
  };

  const clearHighlights = useCallback(() => {
    // Clear from HtmlDiffDisplay
    if (htmlDiffDisplayRef.current?.clearHighlights) {
      htmlDiffDisplayRef.current.clearHighlights();
    }
    
    // Clear from document panels
    [documentARef, documentBRef].forEach(ref => {
      if (ref.current) {
        // Remove all highlight spans
        const highlights = ref.current.querySelectorAll('.word-highlight');
        highlights.forEach(highlight => {
          const parent = highlight.parentNode;
          parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
          parent.normalize();
        });
      }
    });
  }, []);

  const highlightText = useCallback((searchText, containerRef, colorType = 'success') => {
    if (!containerRef?.current || !searchText) return false;

    const container = containerRef.current;
    
    try {
      // Find all text nodes in the container
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }

      let foundMatch = false;

      // Search for exact word matches in text nodes
      textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const searchPattern = new RegExp(`\\b${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        
        if (searchPattern.test(text)) {
          foundMatch = true;
          const highlightedHtml = text.replace(searchPattern, (match) => {
            return `<span class="word-highlight" style="background-color: ${getHighlightColor(colorType)}; padding: 1px 3px; border-radius: 3px; font-weight: bold;">${match}</span>`;
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

      return foundMatch;
    } catch (error) {
      console.error('Highlighting error:', error);
      return false;
    }
  }, []);

  const highlightDifference = useCallback((diff) => {
    clearHighlights();
    
    if (!diff) return;

    const stripHtmlTags = (html) => {
      if (!html) return '';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
    };

    // Use word-level data if available, otherwise fall back to segment data
    const originalText = stripHtmlTags(diff.word_a || diff.original_text_a_segment || '');
    const suggestedText = stripHtmlTags(diff.word_b || diff.suggested_text_b_segment || '');
    
    console.log('Highlighting difference:', { originalText, suggestedText, type: diff.type });
    
    // For word-level highlighting, treat each word individually
    if (originalText.trim()) {
      // Split into individual words and highlight each
      const words = originalText.trim().split(/\s+/).filter(word => word.length > 0);
      
      words.forEach((word, index) => {
        setTimeout(() => {
          const cleanWord = word.replace(/[^\w]/g, ''); // Remove punctuation for matching
          if (cleanWord.length > 0) {
            highlightText(cleanWord, documentARef, 'error');
          }
        }, index * 100); // Stagger highlighting
      });
    }
    
    if (suggestedText.trim()) {
      // Split into individual words and highlight each
      const words = suggestedText.trim().split(/\s+/).filter(word => word.length > 0);
      
      words.forEach((word, index) => {
        setTimeout(() => {
          const cleanWord = word.replace(/[^\w]/g, ''); // Remove punctuation for matching
          if (cleanWord.length > 0) {
            highlightText(cleanWord, documentBRef, 'success');
          }
        }, index * 100); // Stagger highlighting
      });
    }
  }, [highlightText, clearHighlights]);

  return {
    documentARef,
    documentBRef,
    htmlDiffDisplayRef,
    clearHighlights,
    highlightText,
    highlightDifference
  };
}; 