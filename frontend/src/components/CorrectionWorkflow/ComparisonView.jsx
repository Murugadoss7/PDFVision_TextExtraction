import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert, Button, TextField, IconButton, Tooltip, Chip, Pagination, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Container, useTheme, Divider, Card, CardContent, List, ListItem } from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, ArrowBack as ArrowBackIcon, ArrowForward as ArrowForwardIcon, Search as SearchIcon, ContentCopy as ContentCopyIcon, Difference as DifferenceIcon, Clear as ClearIcon, CheckCircle as CheckCircleIcon, NextPlan as NextPlanIcon, CompareArrows as CompareArrowsIcon, TextFields as TextFieldsIcon, Block as BlockIcon, Check as CheckIcon } from '@mui/icons-material';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { getPageComparisonData, submitPageCorrections } from  '../../services/api'; 
import { usePDFContext } from '../../contexts/PDFContext';
import FormattedTextRenderer from '../UI/FormattedTextRenderer';
import logger from '../../utils/logger';
import { useStateLogger, useFunctionLogger, useComponentLogger } from '../../hooks/useStateLogger';

const ComparisonView = ({ onCompletePage, onProceedToFinalReview }) => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { currentDocument } = usePDFContext();
  const theme = useTheme();
  
  // Initialize logging for this component
  useComponentLogger('ComparisonView');
  const logFunction = useFunctionLogger('ComparisonView');
  
  // Refs for text highlighting
  const documentARef = useRef(null);
  const documentBRef = useRef(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pageData, setPageData] = useState(null);
  
  const [textAEditable, setTextAEditable] = useState("");
  const [isEditingTextA, setIsEditingTextA] = useState(false);
  const [saving, setSaving] = useState(false);

  const [searchTermA, setSearchTermA] = useState("");
  const [searchTermB, setSearchTermB] = useState("");

  // FORCE RE-RENDER: Add a render counter to force component updates
  const [renderCounter, setRenderCounter] = useState(0);
  const forceRerender = () => setRenderCounter(prev => prev + 1);

  // Bulk operation states
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: '', title: '', message: '' });
  
  // Track changes state
  const [originalOcrText, setOriginalOcrText] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track completion status for all pages
  const [completedPages, setCompletedPages] = useState(new Set());

  // SIMPLIFIED: Track ignored differences and applied changes per page for persistence
  const [pageStates, setPageStates] = useState({});
  
  // Current page state (derived from pageStates)
  const currentPageState = pageStates[currentPage] || {
    ignoredDifferences: new Set(),
    appliedDifferences: new Set(),
    appliedChangesState: 'none'
  };
  
  const ignoredDifferences = currentPageState.ignoredDifferences;
  const appliedDifferences = currentPageState.appliedDifferences;
  const appliedChangesState = currentPageState.appliedChangesState;

  // LOG ALL STATE CHANGES
  useStateLogger('ComparisonView', 'currentPage', currentPage);
  useStateLogger('ComparisonView', 'loading', loading);
  useStateLogger('ComparisonView', 'error', error);
  useStateLogger('ComparisonView', 'textAEditable', `${textAEditable.substring(0, 50)}...`);
  useStateLogger('ComparisonView', 'isEditingTextA', isEditingTextA);
  useStateLogger('ComparisonView', 'saving', saving);
  useStateLogger('ComparisonView', 'hasUnsavedChanges', hasUnsavedChanges);
  useStateLogger('ComparisonView', 'appliedChangesState', appliedChangesState);
  useStateLogger('ComparisonView', 'appliedDifferences', Array.from(appliedDifferences));

  const actualTotalPages = currentDocument?.total_pages || 8;

  const fetchData = useCallback(async (docId, pageNum) => {
    logFunction('fetchData', { docId, pageNum });
    setLoading(true);
    setError(null);
    try {
      logger.info('ComparisonView', 'fetchData', 'Starting API call', { docId, pageNum });
      const response = await getPageComparisonData(docId, pageNum);
      logger.info('ComparisonView', 'fetchData', 'API call successful', { dataKeys: Object.keys(response.data) });
      
      setPageData(response.data);
      const ocrText = response.data.text_a_ocr || "";
      setTextAEditable(ocrText);
      setOriginalOcrText(ocrText);
      setIsEditingTextA(false);
      setHasUnsavedChanges(false);
      
      logger.debug('ComparisonView', 'fetchData', 'OCR text set', { 
        textLength: ocrText.length, 
        preview: ocrText.substring(0, 100) 
      });
      
      // Initialize page state if it doesn't exist - use functional update to avoid dependency
      setPageStates(prev => {
        if (!prev[pageNum]) {
          logger.debug('ComparisonView', 'fetchData', 'Initializing page state', { pageNum });
          return {
            ...prev,
            [pageNum]: {
              ignoredDifferences: new Set(),
              appliedDifferences: new Set(),
              appliedChangesState: 'none'
            }
          };
        }
        return prev;
      });
    } catch (err) {
      logger.error('ComparisonView', 'fetchData', 'API call failed', { error: err.message });
      setError(`Failed to load page data: ${err.response?.data?.detail || err.message}`);
      setPageData(null);
      setTextAEditable("");
      setOriginalOcrText("");
      setHasUnsavedChanges(false);
    }
    setLoading(false);
    logger.info('ComparisonView', 'fetchData', 'Completed');
  }, [logFunction]);

  useEffect(() => {
    logger.info('ComparisonView', 'useEffect[documentId,currentPage]', 'Effect triggered', { documentId, currentPage });
    if (documentId) {
      fetchData(documentId, currentPage);
    }
  }, [documentId, currentPage]);

  const handleSaveChanges = async () => {
    logFunction('handleSaveChanges');
    if (!documentId || !pageData) return;
    setSaving(true);
    setError(null);
    try {
      logger.info('ComparisonView', 'handleSaveChanges', 'Starting save', { 
        documentId, 
        currentPage, 
        textLength: textAEditable.length,
        textPreview: textAEditable.substring(0, 100) + '...',
        originalOcrPreview: (pageData?.text_a_ocr || '').substring(0, 100) + '...'
      });
      
      await submitPageCorrections(documentId, currentPage, textAEditable);
      
      logger.info('ComparisonView', 'handleSaveChanges', 'Before state updates', {
        currentTextAEditable: textAEditable.substring(0, 100) + '...',
        aboutToSetEditingTo: false
      });
      
      setIsEditingTextA(false);
      
      logger.info('ComparisonView', 'handleSaveChanges', 'Before pageData update', {
        currentTextAEditable: textAEditable.substring(0, 100) + '...',
        updatingPageDataWith: textAEditable.substring(0, 100) + '...'
      });
      
      setPageData(prev => ({...prev, text_a_ocr: textAEditable})); 
      setHasUnsavedChanges(false);
      setCompletedPages(prev => new Set([...prev, currentPage]));
      
      logger.info('ComparisonView', 'handleSaveChanges', 'After all updates', {
        currentTextAEditable: textAEditable.substring(0, 100) + '...'
      });
      
      logger.info('ComparisonView', 'handleSaveChanges', 'Save successful');
      alert("Changes saved successfully!");
      
      if (onCompletePage && typeof onCompletePage === 'function') {
        onCompletePage(currentPage, textAEditable);
      }
    } catch (err) {
      logger.error('ComparisonView', 'handleSaveChanges', 'Save failed', { error: err.message });
      setError(`Failed to save changes: ${err.response?.data?.detail || err.message}`);
    }
    setSaving(false);
  };

  const handlePageChange = (event, value) => {
    logFunction('handlePageChange', { fromPage: currentPage, toPage: value });
    if (isEditingTextA) {
        if(window.confirm("You have unsaved changes. Are you sure you want to navigate away? Changes will be lost.")){
            setIsEditingTextA(false);
            logger.info('ComparisonView', 'handlePageChange', 'User confirmed navigation with unsaved changes');
        } else {
            logger.info('ComparisonView', 'handlePageChange', 'User cancelled navigation');
            return;
        }
    }
    setCurrentPage(value);
  };

  const handleProceedToFinalReview = () => {
    logFunction('handleProceedToFinalReview');
    if (onProceedToFinalReview && typeof onProceedToFinalReview === 'function') {
      onProceedToFinalReview();
    } else {
      navigate(`/correction/${documentId}/review`);
    }
  };

  const allPagesCompleted = completedPages.size === actualTotalPages;
  const hasCompletedSomePages = completedPages.size > 0;

  // SIMPLIFIED: Helper function to update current page state
  const updatePageState = (updates) => {
    logFunction('updatePageState', { currentPage, updates });
    setPageStates(prev => ({
      ...prev,
      [currentPage]: {
        ...currentPageState,
        ...updates
      }
    }));
    logger.debug('ComparisonView', 'updatePageState', 'Page state updated', { currentPage, updates });
  };

  // SIMPLIFIED: Enhanced applyDifference with error handling
  const applyDifference = (diff, index) => {
    try {
      logFunction('applyDifference', { diff: { type: diff.type, index }, index });
      logger.info('ComparisonView', 'applyDifference', 'Starting application', { 
        diffType: diff.type,
        index,
        startIndex: diff.a_start_index,
        endIndex: diff.a_end_index
      });
      
      // Log current state before changes
      logger.debug('ComparisonView', 'applyDifference', 'Current state before changes', {
        isEditingTextA,
        hasUnsavedChanges,
        appliedChangesState,
        textAEditableLength: textAEditable.length
      });
      
      if (diff.type === 'insert' || diff.type === 'replace') {
        logger.info('ComparisonView', 'applyDifference', 'Processing diff type', { type: diff.type });
        
        // SIMPLIFIED: Get original text safely
        const originalA = pageData?.text_a_ocr || "";
        logger.debug('ComparisonView', 'applyDifference', 'Got original text', { originalLength: originalA.length });
        
        // SIMPLIFIED: Build new text step by step
        const prefix = originalA.substring(0, diff.a_start_index);
        const suffix = originalA.substring(diff.a_end_index);
        const newText = prefix + diff.suggested_text_b_segment + suffix;
        
        logger.info('ComparisonView', 'applyDifference', 'New text created successfully');
        
        // SIMPLIFIED: Update states one by one
        logger.info('ComparisonView', 'applyDifference', 'Step 1: Updating text content');
        setTextAEditable(newText);
        
        logger.info('ComparisonView', 'applyDifference', 'Step 2: Setting unsaved changes');
        setHasUnsavedChanges(true);
        
        logger.info('ComparisonView', 'applyDifference', 'Step 3: FORCING EDIT MODE TO TRUE');
        setIsEditingTextA(true);
        
        // FORCE IMMEDIATE RE-RENDER
        setTimeout(() => {
          logger.info('ComparisonView', 'applyDifference', 'FORCING COMPONENT RE-RENDER');
          forceRerender();
          
          // DIRECT STATE CHECK
          setIsEditingTextA(current => {
            logger.info('ComparisonView', 'applyDifference', 'CHECKING EDIT STATE IN TIMEOUT', { 
              currentEditState: current,
              shouldBeTrue: true 
            });
            if (!current) {
              logger.error('ComparisonView', 'applyDifference', 'EDIT STATE IS STILL FALSE - FORCING AGAIN');
            }
            return true; // Force true regardless
          });
        }, 5);
        
        logger.info('ComparisonView', 'applyDifference', 'Step 4: Updating page state');
        updatePageState({
          appliedDifferences: new Set([...appliedDifferences, index]),
          appliedChangesState: 'custom'
        });
        
        logger.info('ComparisonView', 'applyDifference', 'All steps completed successfully');
        
      } else {
        logger.warn('ComparisonView', 'applyDifference', 'Unsupported diff type', { type: diff.type });
      }
      
    } catch (error) {
      logger.error('ComparisonView', 'applyDifference', 'ERROR OCCURRED', { 
        error: error.message, 
        stack: error.stack 
      });
      console.error('applyDifference error:', error);
    }
  };

  // Track when isEditingTextA changes in real-time
  useEffect(() => {
    logger.stateChange('ComparisonView', 'useEffect[isEditingTextA]', 'isEditingTextA', 'previous', isEditingTextA);
    logger.info('ComparisonView', 'useEffect[isEditingTextA]', 'Edit mode changed', { isEditingTextA });
  }, [isEditingTextA]);

  // SIMPLIFIED: New function to revert individual applied difference
  const revertDifference = (diff, index) => {
    console.log("Revert Difference - Starting revert for index:", index);
    
    // Revert the text change by restoring original segment
    if (diff.type === 'insert' || diff.type === 'replace') {
      const currentText = textAEditable;
      const prefix = currentText.substring(0, diff.a_start_index);
      const suffix = currentText.substring(diff.a_start_index + diff.suggested_text_b_segment.length);
      const revertedText = prefix + diff.original_text_a_segment + suffix;
      
      // Update text first
      setTextAEditable(revertedText);
      setHasUnsavedChanges(true);
      setIsEditingTextA(true);
      
      // Remove from applied differences
      const newAppliedDifferences = new Set(appliedDifferences);
      newAppliedDifferences.delete(index);
      
      updatePageState({
        appliedDifferences: newAppliedDifferences
      });
      
      console.log("Revert Difference - Text reverted and states updated");
    }
    
    setTimeout(() => {
      smartHighlightAndSearch(diff);
    }, 50);
  };

  // Smart search and highlight function
  const smartHighlightAndSearch = (diff) => {
    // Extract meaningful text for search bars
    const originalText = diff.original_text_a_segment || '';
    const suggestedText = diff.suggested_text_b_segment || '';
    
    // For longer text, use first few words
    const getSearchText = (text) => {
      if (!text) return '';
      const words = text.trim().split(/\s+/);
      return words.length > 4 ? words.slice(0, 4).join(' ') : text;
    };
    
    // Set search terms to help user locate the text
    setSearchTermA(getSearchText(originalText));
    setSearchTermB(getSearchText(suggestedText));
    
    // Highlight actual text content in panels
    setTimeout(() => {
      highlightTextContent(diff);
    }, 100); // Small delay to ensure search terms are set
  };

  // Enhanced text highlighting function
  const highlightTextContent = (diff) => {
    // Clear any existing highlights first
    clearExistingHighlights();
    
    // Highlight in Document A
    if (documentARef.current && diff.original_text_a_segment) {
      highlightTextInElement(documentARef.current, diff.original_text_a_segment, 'warning');
    }
    
    // Highlight in Document B  
    if (documentBRef.current && diff.suggested_text_b_segment) {
      highlightTextInElement(documentBRef.current, diff.suggested_text_b_segment, 'success');
    }
  };

  // Helper function to highlight specific text in an element
  const highlightTextInElement = (containerRef, searchText, colorType) => {
    const textElement = containerRef.querySelector('[data-text-content]');
    if (!textElement || !searchText) return;
    
    const walker = document.createTreeWalker(
      textElement,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    // Find text nodes containing our search text
    textNodes.forEach(textNode => {
      const content = textNode.textContent;
      const searchIndex = content.toLowerCase().indexOf(searchText.toLowerCase());
      
      if (searchIndex !== -1) {
        // Create highlight span
        const span = document.createElement('span');
        span.className = `highlight-${colorType}`;
        span.style.backgroundColor = colorType === 'warning' ? theme.palette.warning.light : theme.palette.success.light;
        span.style.padding = '2px 4px';
        span.style.borderRadius = '4px';
        span.style.fontWeight = 'bold';
        
        // Split text node and wrap the found text
        const beforeText = content.substring(0, searchIndex);
        const highlightText = content.substring(searchIndex, searchIndex + searchText.length);
        const afterText = content.substring(searchIndex + searchText.length);
        
        const beforeNode = document.createTextNode(beforeText);
        const afterNode = document.createTextNode(afterText);
        span.textContent = highlightText;
        
        const parent = textNode.parentNode;
        parent.insertBefore(beforeNode, textNode);
        parent.insertBefore(span, textNode);
        parent.insertBefore(afterNode, textNode);
        parent.removeChild(textNode);
        
        // Scroll to highlighted element
        span.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  };

  // Helper function to clear existing highlights
  const clearExistingHighlights = () => {
    ['warning', 'success'].forEach(type => {
      const highlights = document.querySelectorAll(`.highlight-${type}`);
      highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        parent.insertBefore(document.createTextNode(highlight.textContent), highlight);
        parent.removeChild(highlight);
        parent.normalize(); // Merge adjacent text nodes
      });
    });
  };

  // SIMPLIFIED: New function to ignore individual difference
  const ignoreDifference = (diff, index) => {
    console.log("Ignore Difference - Starting ignore for index:", index);
    
    // Transition to custom state if coming from bulk operation
    const newAppliedChangesState = appliedChangesState === 'replaced' || appliedChangesState === 'ignored' ? 'custom' : appliedChangesState;
    
    updatePageState({
      ignoredDifferences: new Set([...ignoredDifferences, index]),
      appliedChangesState: newAppliedChangesState === 'none' ? 'custom' : newAppliedChangesState
    });
    
    setTimeout(() => {
      smartHighlightAndSearch(diff);
    }, 50);
  };

  // RESTORED: highlightText function for search highlighting
  const highlightText = (text, searchTerm) => {
    if (!searchTerm || !text) return text;
    const parts = text.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === searchTerm.toLowerCase() ? 
            <mark key={index} style={{ backgroundColor: theme.palette.warning.light }}>{part}</mark> : 
            part
        )}
      </>
    );
  };

  // SIMPLIFIED: Bulk Operations
  const handleIgnoreAll = () => {
    setConfirmDialog({
      open: true,
      type: 'ignore',
      title: 'Ignore All Changes',
      message: 'This will keep the current OCR text (Document A) and ignore all suggested changes from Document B. Are you sure?'
    });
  };

  const handleReplaceAll = () => {
    setConfirmDialog({
      open: true,
      type: 'replace',
      title: 'Replace All with Document B',
      message: 'This will replace all OCR text (Document A) with the text from Document B. Are you sure?'
    });
  };

  const handleRevertToOriginal = () => {
    setConfirmDialog({
      open: true,
      type: 'revert',
      title: 'Revert to Original OCR',
      message: 'This will restore the original OCR text and reset all changes. Any unsaved modifications will be lost. Are you sure?'
    });
  };

  // SIMPLIFIED: Execute confirmed bulk operations
  const executeConfirmedAction = () => {
    console.log("Executing bulk operation:", confirmDialog.type);
    
    if (confirmDialog.type === 'ignore') {
      setTextAEditable(originalOcrText);
      setIsEditingTextA(true);
      setHasUnsavedChanges(true);
      
      updatePageState({ 
        appliedChangesState: 'ignored',
        ignoredDifferences: new Set(), // Clear individual ignored since this is bulk operation
        appliedDifferences: new Set() // Clear applied differences
      });
      
      console.log("Bulk ignore completed");
      alert("All suggestions ignored. Current OCR text retained.");
      
    } else if (confirmDialog.type === 'replace') {
      console.log("Replace All - pageData:", pageData);
      console.log("Replace All - text_b_editable_pdf:", pageData?.text_b_editable_pdf);
      
      const replaceText = pageData?.text_b_editable_pdf || "";
      console.log("Replace All - setting text to:", replaceText.substring(0, 100) + "...");
      
      setTextAEditable(replaceText);
      setIsEditingTextA(true);
      setHasUnsavedChanges(true);
      
      // For bulk replace all - only set bulk state, clear individual states
      updatePageState({ 
        appliedChangesState: 'replaced',
        ignoredDifferences: new Set(), // Clear individual ignored
        appliedDifferences: new Set() // Clear individual applied - this is bulk operation
      });
      
      console.log("Bulk replace completed");
      alert("All text replaced with Document B content.");
      
    } else if (confirmDialog.type === 'revert') {
      setTextAEditable(originalOcrText);
      setIsEditingTextA(false);
      setHasUnsavedChanges(false);
      
      // Reset all states for revert operation
      updatePageState({ 
        appliedChangesState: 'none',
        ignoredDifferences: new Set(),
        appliedDifferences: new Set()
      });
      
      console.log("Bulk revert completed");
      alert("Reverted to original OCR text.");
    }
    
    setConfirmDialog({ open: false, type: '', title: '', message: '' });
  };

  const cancelConfirmedAction = () => {
    setConfirmDialog({ open: false, type: '', title: '', message: '' });
  };

  // Panel resize handle style
  const resizeHandleStyle = {
    width: '6px',
    background: theme.palette.divider,
    '&:hover': {
      background: theme.palette.primary.light,
    },
    cursor: 'col-resize',
    transition: 'background 0.2s',
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={40} />
        <Typography sx={{ ml: 2 }}>Loading comparison data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Container maxWidth="xl" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', pt: 2, pb: 2 }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h5" component="h1">
              Compare & Correct: Page {currentPage} of {actualTotalPages}
            </Typography>
            {hasCompletedSomePages && (
              <Chip 
                label={`${completedPages.size}/${actualTotalPages} pages completed`}
                color={allPagesCompleted ? 'success' : 'primary'}
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {hasCompletedSomePages && (
              <Button 
                variant="contained" 
                color="primary" 
                size="small" 
                startIcon={<NextPlanIcon />}
                onClick={handleProceedToFinalReview}
                disabled={isEditingTextA || saving}
              >
                {allPagesCompleted ? 'Proceed to Final Review' : 'Continue to Final Review'}
              </Button>
            )}
            <Button variant="outlined" size="small" onClick={() => navigate(-1)} startIcon={<ArrowBackIcon />}>
              Back to Uploads
            </Button>
          </Box>
        </Box>
        
        {/* Progress and Status Information */}
        {hasCompletedSomePages && (
          <Alert 
            severity={allPagesCompleted ? 'success' : 'info'} 
            sx={{ mb: 2 }}
          >
            {allPagesCompleted 
              ? `🎉 All ${actualTotalPages} pages have been corrected! You can now proceed to the Final Review to make any final adjustments and export your document.`
              : `Progress: ${completedPages.size} of ${actualTotalPages} pages completed. You can continue to Final Review anytime to review your work so far.`
            }
          </Alert>
        )}
        
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Main Content Area - SWAPPED: Document B (left), Differences (center), Document A (right) */}
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'hidden', 
          display: 'flex',
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`,
          height: 'calc(100vh - 220px)'
        }}>
          <PanelGroup direction="horizontal" style={{ width: '100%', height: '100%' }}>
            {/* Left panel: Document B (Reference) - MOVED FROM RIGHT */}
            <Panel defaultSize={35}>
              <Paper 
                elevation={0} 
                sx={{ 
                  height: '100%', 
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  borderRadius: 0,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Box sx={{
                  p: 2, 
                  pb: 1, 
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  bgcolor: theme.palette.grey[50]
                }}>
                  <Typography variant="h6" sx={{display: 'flex', alignItems: 'center', mb: 0}}>
                    <ContentCopyIcon sx={{mr:1, color: 'secondary.main'}}/> Document B (Reference)
                  </Typography>
                </Box>
                <Box sx={{ p: 2, pb: 1 }}>
                  <TextField 
                    fullWidth 
                    variant="outlined" 
                    size="small" 
                    placeholder="Search in Document B..." 
                    value={searchTermB}
                    onChange={(e) => setSearchTermB(e.target.value)}
                    InputProps={{endAdornment: <SearchIcon />}}
                  />
                </Box>
                <Box 
                  ref={documentBRef}
                  sx={{ 
                    flexGrow: 1, 
                    p: 2, 
                    pt: 0, 
                    overflow: 'auto'
                  }}
                >
                  <Box sx={{ 
                    height: '100%', 
                    p: 2, 
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    bgcolor: 'grey.50'
                  }}>
                    <div data-text-content>
                      <FormattedTextRenderer 
                        rawText={pageData?.text_b_editable_pdf} 
                        formattedTextJson={pageData?.formatted_text_b} 
                        searchTerm={searchTermB} 
                      />
                    </div>
                  </Box>
                </Box>
              </Paper>
            </Panel>
            
            <PanelResizeHandle style={resizeHandleStyle} />
            
            {/* Center panel: Differences and Actions - UPDATED LAYOUT */}
            <Panel defaultSize={30} minSize={25}>
              <Paper 
                elevation={0} 
                sx={{ 
                  height: '100%', 
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  borderRadius: 0,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Box sx={{
                  p: 2, 
                  pb: 1, 
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  bgcolor: theme.palette.grey[50]
                }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <CompareArrowsIcon sx={{ color: 'secondary.main' }}/> 
                    Differences 
                    {pageData?.differences && (
                      <Chip 
                        icon={<DifferenceIcon />} 
                        label={`${pageData.differences.filter(d => d.type !== 'equal').length} changes`} 
                        size="small" 
                        color="secondary"
                      />
                    )}
                  </Typography>
                  
                  {/* Status Indicator */}
                  {appliedChangesState !== 'none' && (
                    <Chip 
                      label={
                        appliedChangesState === 'ignored' ? 'All Ignored' : 
                        appliedChangesState === 'replaced' ? 'All Replaced' : 
                        'Custom Changes'
                      }
                      color={
                        appliedChangesState === 'ignored' ? 'warning' : 
                        appliedChangesState === 'replaced' ? 'success' : 
                        'primary'
                      }
                      size="small"
                      variant="filled"
                      sx={{ mb: 2 }}
                    />
                  )}
                  
                  {/* IMPROVED: Compact Bulk Operation Buttons */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                    <Tooltip title="Keep current OCR text, ignore all changes">
                      <span>
                        <Button 
                          variant="outlined" 
                          color="warning"
                          size="small"
                          startIcon={<ClearIcon />}
                          onClick={handleIgnoreAll}
                          disabled={isEditingTextA || !pageData?.text_a_ocr || appliedChangesState === 'ignored'}
                          sx={{ 
                            minWidth: 'auto',
                            fontSize: '0.75rem',
                            ...(appliedChangesState === 'ignored' && { 
                              bgcolor: 'warning.light', 
                              borderColor: 'warning.main',
                              color: 'warning.dark'
                            })
                          }}
                        >
                          {appliedChangesState === 'ignored' ? 'Ignored ✓' : 'Ignore All'}
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip title="Replace all OCR text with Document B">
                      <span>
                        <Button 
                          variant="outlined" 
                          color="success"
                          size="small"
                          startIcon={<CheckCircleIcon />}
                          onClick={handleReplaceAll}
                          disabled={isEditingTextA || !pageData?.text_b_editable_pdf || appliedChangesState === 'replaced'}
                          sx={{ 
                            minWidth: 'auto',
                            fontSize: '0.75rem',
                            ...(appliedChangesState === 'replaced' && { 
                              bgcolor: 'success.light', 
                              borderColor: 'success.main',
                              color: 'success.dark'
                            })
                          }}
                        >
                          {appliedChangesState === 'replaced' ? 'Replaced ✓' : 'Replace All'}
                        </Button>
                      </span>
                    </Tooltip>
                    <Button 
                      variant="outlined" 
                      color="info"
                      size="small"
                      startIcon={<ArrowBackIcon />}
                      onClick={handleRevertToOriginal}
                      disabled={isEditingTextA || appliedChangesState === 'none'}
                      sx={{ 
                        minWidth: 'auto',
                        fontSize: '0.75rem'
                      }}
                    >
                      Revert
                    </Button>
                  </Box>
                </Box>
                
                {/* ENHANCED: Individual Differences List with Ignore buttons */}
                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
                  {pageData?.differences && pageData.differences.length > 0 ? (
                    <List dense sx={{ p: 0 }}>
                      {pageData.differences
                        .filter(diff => diff.type !== 'equal')
                        .map((diff, index) => (
                          <ListItem key={index} sx={{ p: 0, mb: 1 }}>
                            <Card 
                              variant="outlined" 
                              sx={{ 
                                width: '100%',
                                borderColor: 
                                  appliedChangesState === 'replaced' ? 'success.main' :
                                  appliedChangesState === 'ignored' ? 'grey.400' :
                                  appliedDifferences.has(index) ? 'success.main' :
                                  ignoredDifferences.has(index) ? 'grey.400' :
                                  diff.type === 'replace' ? 'warning.main' : 
                                  diff.type === 'insert' ? 'success.main' : 'error.main',
                                opacity: (appliedChangesState === 'ignored' || appliedChangesState === 'replaced' || ignoredDifferences.has(index)) ? 0.6 : 1,
                                '&:hover': { 
                                  boxShadow: (appliedChangesState === 'ignored' || appliedChangesState === 'replaced' || ignoredDifferences.has(index)) ? 1 : 2
                                }
                              }}
                            >
                              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Chip 
                                    label={
                                      appliedChangesState === 'replaced' ? 'REPLACED' :
                                      appliedChangesState === 'ignored' ? 'IGNORED' : 
                                      appliedDifferences.has(index) ? 'APPLIED' :
                                      ignoredDifferences.has(index) ? 'IGNORED' : 
                                      diff.type.toUpperCase()
                                    } 
                                    size="small"
                                    color={
                                      appliedChangesState === 'replaced' ? 'success' :
                                      appliedChangesState === 'ignored' ? 'default' : 
                                      appliedDifferences.has(index) ? 'success' :
                                      ignoredDifferences.has(index) ? 'default' : 
                                      diff.type === 'replace' ? 'warning' : 
                                      diff.type === 'insert' ? 'success' : 'error'
                                    }
                                  />
                                  {/* Enhanced Action buttons for each difference */}
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    {appliedDifferences.has(index) && appliedChangesState !== 'replaced' && appliedChangesState !== 'ignored' ? (
                                      // Show revert button for individually applied differences (not bulk operations)
                                      <Tooltip title="Revert this change">
                                        <IconButton 
                                          size="small" 
                                          color="warning"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            logFunction('revertDifference', { diff, index });
                                            revertDifference(diff, index);
                                          }}
                                        >
                                          <ArrowBackIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    ) : (appliedChangesState === 'none' || appliedChangesState === 'custom') && !appliedDifferences.has(index) && !ignoredDifferences.has(index) ? (
                                      // Show apply/ignore buttons when no bulk operation is active or in custom state and not individually handled
                                      <>
                                        {logger.info('ComparisonView', 'ButtonVisibility', `Apply button VISIBLE for index ${index}`, {
                                          appliedChangesState,
                                          hasAppliedDiff: appliedDifferences.has(index),
                                          hasIgnoredDiff: ignoredDifferences.has(index),
                                          diff
                                        })}
                                        <Tooltip title="Apply this change">
                                          <IconButton 
                                            size="small" 
                                            color="success"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              logFunction('applyDifference', { diff, index, appliedChangesState });
                                              applyDifference(diff, index);
                                            }}
                                          >
                                            <CheckIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Ignore this change">
                                          <IconButton 
                                            size="small" 
                                            color="warning"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              logFunction('ignoreDifference', { diff, index });
                                              ignoreDifference(diff, index);
                                            }}
                                          >
                                            <BlockIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      </>
                                    ) : (
                                      logger.info('ComparisonView', 'ButtonVisibility', `Apply button HIDDEN for index ${index}`, {
                                        appliedChangesState,
                                        hasAppliedDiff: appliedDifferences.has(index),
                                        hasIgnoredDiff: ignoredDifferences.has(index),
                                        conditionMet: (appliedChangesState === 'none' || appliedChangesState === 'custom') && !appliedDifferences.has(index) && !ignoredDifferences.has(index)
                                      })
                                    )}
                                  </Box>
                                </Box>
                                <Box 
                                  sx={{ cursor: 'pointer' }}
                                  onClick={() => smartHighlightAndSearch(diff)}
                                >
                                  <Box sx={{ mb: 1 }}>
                                    <Typography variant="caption" color="error" sx={{ fontWeight: 'bold' }}>
                                      Original (A):
                                    </Typography>
                                    <Typography variant="body2" sx={{ 
                                      bgcolor: 'error.light', 
                                      p: 1, 
                                      borderRadius: 1, 
                                      fontFamily: 'monospace',
                                      fontSize: '12px',
                                      wordBreak: 'break-word'
                                    }}>
                                      {diff.original_text_a_segment || '(empty)'}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>
                                      Suggested (B):
                                    </Typography>
                                    <Typography variant="body2" sx={{ 
                                      bgcolor: 'success.light', 
                                      p: 1, 
                                      borderRadius: 1, 
                                      fontFamily: 'monospace',
                                      fontSize: '12px',
                                      wordBreak: 'break-word'
                                    }}>
                                      {diff.suggested_text_b_segment || '(empty)'}
                                    </Typography>
                                  </Box>
                                </Box>
                              </CardContent>
                            </Card>
                          </ListItem>
                        ))
                      }
                    </List>
                  ) : (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography color="textSecondary">
                        {pageData?.differences ? 'No differences found between documents.' : 'Loading differences...'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Panel>
            
            <PanelResizeHandle style={resizeHandleStyle} />
            
            {/* Right panel: Document A (OCR Text - Editable) - MOVED FROM LEFT */}
            <Panel defaultSize={35}>
              <Paper 
                elevation={0} 
                sx={{ 
                  height: '100%', 
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  borderRadius: 0,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Box sx={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  p: 2, 
                  pb: 1, 
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  bgcolor: theme.palette.grey[50]
                }}>
                  <Typography variant="h6" sx={{display: 'flex', alignItems: 'center', mb: 0}}>
                    <TextFieldsIcon sx={{mr:1, color: 'primary.main'}}/> Document A (OCR - Editable)
                  </Typography>
                  {!isEditingTextA ? (
                    <Button 
                      variant="contained" 
                      size="small"
                      startIcon={<EditIcon />} 
                      onClick={() => setIsEditingTextA(true)} 
                      disabled={!pageData?.text_a_ocr}
                    >
                      Edit
                    </Button>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button 
                        variant="contained" 
                        color="success" 
                        size="small"
                        startIcon={<SaveIcon />} 
                        onClick={handleSaveChanges} 
                        disabled={saving}
                      >
                        {saving ? <CircularProgress size={16}/> : 'Save'}
                      </Button>
                      <Button 
                        variant="outlined" 
                        size="small"
                        startIcon={<CancelIcon />} 
                        onClick={() => { 
                          setIsEditingTextA(false); 
                          setTextAEditable(pageData?.text_a_ocr || ""); 
                          setError(null); 
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Box>
                <Box sx={{ p: 2, pb: 1 }}>
                  <TextField 
                    fullWidth 
                    variant="outlined" 
                    size="small" 
                    placeholder="Search in Document A..." 
                    value={searchTermA}
                    onChange={(e) => setSearchTermA(e.target.value)}
                    InputProps={{endAdornment: <SearchIcon />}}
                    disabled={!isEditingTextA && !pageData?.text_a_ocr}
                  />
                </Box>
                <Box 
                  ref={documentARef}
                  sx={{ flexGrow: 1, p: 2, pt: 0, overflow: 'hidden', display: 'flex' }}
                >
                  {/* DEBUG: Log the current state during render */}
                  {logger.debug('ComparisonView', 'render', 'Edit mode check', { 
                    isEditingTextA, 
                    textAEditableLength: textAEditable.length,
                    hasPageData: !!pageData?.text_a_ocr 
                  })}
                  {isEditingTextA ? (
                    <>
                      {logger.info('ComparisonView', 'render', 'RENDERING TEXTFIELD (EDIT MODE)', { isEditingTextA })}
                      <TextField
                        key={`text-editor-${currentPage}-${textAEditable.length}`}
                        fullWidth
                        multiline
                        variant="outlined"
                        value={textAEditable}
                        onChange={(e) => {
                          setTextAEditable(e.target.value);
                          if (e.target.value !== originalOcrText && e.target.value !== pageData?.text_b_editable_pdf) {
                            updatePageState({ appliedChangesState: 'custom' });
                          }
                          setHasUnsavedChanges(true);
                        }}
                        sx={{ 
                          height: '100%',
                          '& .MuiOutlinedInput-root': { 
                            height: '100%',
                          }, 
                          '& .MuiOutlinedInput-input': { 
                            height: '100% !important', 
                            overflowY: 'auto',
                            padding: '12px',
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            whiteSpace: 'pre-wrap'
                          } 
                        }}
                      />
                    </>
                  ) : (
                    <>
                      {logger.info('ComparisonView', 'render', 'RENDERING FORMATTEDTEXTRENDERER (VIEW MODE)', { 
                        isEditingTextA,
                        textAEditablePreview: textAEditable.substring(0, 100) + '...',
                        textAEditableLength: textAEditable.length
                      })}
                      <Box sx={{ 
                        width: '100%', 
                        height: '100%', 
                        overflow: 'auto', 
                        p: 2, 
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 1,
                        bgcolor: 'grey.50'
                      }}>
                        <div data-text-content>
                          <FormattedTextRenderer 
                            rawText={textAEditable} 
                            formattedTextJson={hasUnsavedChanges || appliedChangesState !== 'none' ? null : pageData?.formatted_text_a}
                            searchTerm={searchTermA} 
                          />
                        </div>
                      </Box>
                    </>
                  )}
                </Box>
              </Paper>
            </Panel>
          </PanelGroup>
        </Box>

        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination 
            count={actualTotalPages} 
            page={currentPage} 
            onChange={handlePageChange} 
            color="primary" 
            disabled={loading || saving}
            size="large"
          />
        </Box>
      </Container>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={cancelConfirmedAction}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelConfirmedAction}>Cancel</Button>
          <Button onClick={executeConfirmedAction} autoFocus>Confirm</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComparisonView; 