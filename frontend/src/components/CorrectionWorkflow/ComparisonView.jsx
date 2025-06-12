import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Container, CircularProgress, Typography, Alert } from '@mui/material';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { getPageComparisonData, submitPageCorrections, getFinalCorrectedText } from '../../services/api';
import { useHighlighting } from '../../hooks/useHighlighting';
import DocumentPanel from './DocumentPanel';
import DifferencePanel from './DifferencePanel';
import PageNavigation from './PageNavigation';

const ComparisonView = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [pageData, setPageData] = useState(null);
  const [textAEditable, setTextAEditable] = useState('');
  const [originalOcrText, setOriginalOcrText] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [appliedDifferences, setAppliedDifferences] = useState([]);
  const [ignoredDifferences, setIgnoredDifferences] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTermA, setSearchTermA] = useState('');
  const [searchTermB, setSearchTermB] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [savedCorrections, setSavedCorrections] = useState({});
  const [dbLoaded, setDbLoaded] = useState(false);

  // Highlighting hook
  const {
    documentARef,
    documentBRef,
    htmlDiffDisplayRef,
    clearHighlights,
    highlightDifference
  } = useHighlighting();

  // Utility function to strip HTML tags from text
  const stripHtmlTags = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
  };

  // Load saved corrections from database (only once)
  const loadSavedCorrections = async () => {
    if (dbLoaded) {
      console.log('Database already loaded, using local state');
      return savedCorrections;
    }
    
    try {
      const response = await getFinalCorrectedText(documentId);
      if (response.data && response.data.corrected_content_by_page) {
        const dbCorrections = {};
        Object.entries(response.data.corrected_content_by_page).forEach(([page, text]) => {
          dbCorrections[parseInt(page)] = text;
        });
        
        setSavedCorrections(dbCorrections);
        setDbLoaded(true);
        console.log('Loaded corrections from database:', dbCorrections);
        return dbCorrections;
      }
    } catch (error) {
      console.log('No saved corrections found or error loading:', error.message);
    }
    
    setDbLoaded(true);
    return {};
  };

  // Fetch page data
  const fetchData = async (pageNum) => {
    try {
      setLoading(true);
      setError(null);
      
      // Load saved corrections first
      const corrections = await loadSavedCorrections();
      
      const response = await getPageComparisonData(documentId, pageNum);
      const data = response.data;
      setPageData(data);
      
      // Strip HTML tags from OCR text and reference text
      const cleanOcrText = stripHtmlTags(data.text_a_ocr) || "";
      const cleanReferenceText = stripHtmlTags(data.text_b_editable_pdf) || "";
      
      // Use saved correction if available, otherwise use original OCR text
      const savedData = corrections[pageNum];
      let textToEdit, restoredApplied = [], restoredIgnored = [];
      
      if (savedData) {
        // Handle both old format (string) and new format (object)
        if (typeof savedData === 'string') {
          textToEdit = savedData;
        } else {
          textToEdit = savedData.text || cleanOcrText;
          restoredApplied = savedData.appliedDifferences || [];
          restoredIgnored = savedData.ignoredDifferences || [];
        }
      } else {
        textToEdit = cleanOcrText;
      }
      
      setTextAEditable(textToEdit);
      setOriginalOcrText(cleanOcrText);
      setHasUnsavedChanges(false);
      
      // Update page data with clean text
      setPageData(prev => ({
        ...prev,
        text_a_ocr: cleanOcrText,
        text_b_editable_pdf: cleanReferenceText
      }));
      
      // Restore applied and ignored differences
      setAppliedDifferences(restoredApplied);
      setIgnoredDifferences(restoredIgnored);
      
      console.log(`Page ${pageNum} loaded:`, {
        textLength: textToEdit.length,
        appliedCount: restoredApplied.length,
        ignoredCount: restoredIgnored.length,
        appliedDiffs: restoredApplied,
        ignoredDiffs: restoredIgnored,
        savedDataType: typeof savedData,
        savedData: savedData
      });
      
      // Set total pages from response
      if (data.document_id) {
        setTotalPages(data.total_pages || 10);
      }
      
    } catch (error) {
      console.error('Error fetching page data:', error);
      setError(`Failed to load page data: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Save corrections to database with state information
  const saveCorrections = async () => {
    if (!hasUnsavedChanges) return;
    
    try {
      setSaving(true);
      
      // Create enhanced correction data including applied/ignored states
      const correctionData = {
        text: textAEditable,
        appliedDifferences: appliedDifferences,
        ignoredDifferences: ignoredDifferences,
        timestamp: new Date().toISOString()
      };
      
      // For now, we'll save just the text to maintain API compatibility
      // In the future, the API could be enhanced to accept the full correction data
      await submitPageCorrections(documentId, currentPage, textAEditable);
      
      // Update saved corrections state with full data
      setSavedCorrections(prev => ({
        ...prev,
        [currentPage]: correctionData
      }));
      
      setHasUnsavedChanges(false);
      console.log(`Page ${currentPage} saved:`, {
        textLength: correctionData.text.length,
        appliedCount: correctionData.appliedDifferences.length,
        ignoredCount: correctionData.ignoredDifferences.length,
        appliedDiffs: correctionData.appliedDifferences,
        ignoredDiffs: correctionData.ignoredDifferences
      });
      
    } catch (error) {
      console.error('Error saving corrections:', error);
      setError(`Failed to save corrections: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Effects
  useEffect(() => {
    if (documentId) {
      fetchData(currentPage);
    }
  }, [documentId, currentPage]);

  // Reset database loaded flag when document changes
  useEffect(() => {
    setDbLoaded(false);
    setSavedCorrections({});
  }, [documentId]);

  // Auto-save when user stops editing (debounced)
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const saveTimer = setTimeout(() => {
      saveCorrections();
    }, 2000); // Auto-save after 2 seconds of inactivity
    
    return () => clearTimeout(saveTimer);
  }, [textAEditable, hasUnsavedChanges]);

  // Handle content changes
  const handleContentChange = (newContent) => {
    setTextAEditable(newContent);
    
    // Check if content differs from saved version
    const savedData = savedCorrections[currentPage];
    const savedText = savedData ? (typeof savedData === 'string' ? savedData : savedData.text) : originalOcrText;
    setHasUnsavedChanges(newContent !== savedText);
  };

  // Apply difference
  const handleApplyDifference = (diffIndex) => {
    const diff = pageData.differences.find(d => d.index === diffIndex);
    if (!diff || appliedDifferences.includes(diffIndex)) return;

    let newText = textAEditable;
    const wordA = stripHtmlTags(diff.word_a) || '';
    const wordB = stripHtmlTags(diff.word_b) || '';

    if (diff.type === 'replace') {
      newText = newText.replace(wordA, wordB);
    } else if (diff.type === 'insert') {
      const position = diff.position_in_a || 0;
      newText = newText.slice(0, position) + wordB + ' ' + newText.slice(position);
    } else if (diff.type === 'delete') {
      newText = newText.replace(wordA, '');
    }

    setTextAEditable(newText);
    // Remove from ignored list if it was ignored
    setIgnoredDifferences(prev => prev.filter(id => id !== diffIndex));
    // Add to applied list
    setAppliedDifferences(prev => [...prev, diffIndex]);
    setHasUnsavedChanges(true);
  };

  // Ignore difference (toggle function)
  const handleIgnoreDifference = (diffIndex) => {
    const isCurrentlyIgnored = ignoredDifferences.includes(diffIndex);
    
    if (isCurrentlyIgnored) {
      // Revert: Remove from ignored list
      setIgnoredDifferences(prev => prev.filter(id => id !== diffIndex));
    } else {
      // Ignore: Remove from applied and add to ignored
      setAppliedDifferences(prev => prev.filter(id => id !== diffIndex));
      setIgnoredDifferences(prev => [...prev, diffIndex]);
    }
    setHasUnsavedChanges(true);
  };

  // Apply all differences
  const handleApplyAll = () => {
    if (!pageData?.differences) return;

    let newText = textAEditable;
    const newApplied = [];

    pageData.differences
      .filter(diff => 
        diff.type !== 'equal' && 
        !appliedDifferences.includes(diff.index) &&
        !ignoredDifferences.includes(diff.index)
      )
      .forEach(diff => {
        const wordA = stripHtmlTags(diff.word_a) || '';
        const wordB = stripHtmlTags(diff.word_b) || '';

        if (diff.type === 'replace') {
          newText = newText.replace(wordA, wordB);
        } else if (diff.type === 'insert') {
          const position = diff.position_in_a || 0;
          newText = newText.slice(0, position) + wordB + ' ' + newText.slice(position);
        } else if (diff.type === 'delete') {
          newText = newText.replace(wordA, '');
        }

        newApplied.push(diff.index);
      });

    setTextAEditable(newText);
    setAppliedDifferences(prev => [...prev, ...newApplied]);
    setHasUnsavedChanges(true);
  };

  // Ignore all differences
  const handleIgnoreAll = () => {
    if (!pageData?.differences) return;
    
    const allDiffIndices = pageData.differences
      .filter(diff => diff.type !== 'equal')
      .map(diff => diff.index);
    
    setIgnoredDifferences(allDiffIndices);
    setAppliedDifferences([]);
    setHasUnsavedChanges(true);
  };

  // Reset to original
  const handleReset = () => {
    setTextAEditable(originalOcrText);
    setAppliedDifferences([]);
    setIgnoredDifferences([]);
    setHasUnsavedChanges(true);
  };

  // Page navigation with save check
  const handlePageChange = async (newPage) => {
    if (hasUnsavedChanges) {
      try {
        // Always save changes before navigation
        await saveCorrections();
        console.log('Changes saved before page navigation');
      } catch (error) {
        console.error('Failed to save changes before navigation:', error);
        const proceedAnyway = window.confirm(
          'Failed to save changes. Do you want to proceed anyway? Unsaved changes will be lost.'
        );
        if (!proceedAnyway) {
          return; // Cancel navigation
        }
      }
    }
    setCurrentPage(newPage);
  };

  // Navigation functions
  const handleBackToUpload = async () => {
    if (hasUnsavedChanges) {
      try {
        await saveCorrections();
        console.log('Changes saved before navigating to upload');
      } catch (error) {
        console.error('Failed to save changes:', error);
        const proceedAnyway = window.confirm(
          'Failed to save changes. Do you want to proceed anyway? Unsaved changes will be lost.'
        );
        if (!proceedAnyway) {
          return;
        }
      }
    }
    navigate(`/correction/${documentId}/upload`);
  };

  const handleProceedToReview = async () => {
    if (hasUnsavedChanges) {
      try {
        await saveCorrections();
        console.log('Changes saved before proceeding to review');
      } catch (error) {
        console.error('Failed to save changes:', error);
        const proceedAnyway = window.confirm(
          'Failed to save changes. Do you want to proceed anyway? Unsaved changes will be lost.'
        );
        if (!proceedAnyway) {
          return;
        }
      }
    }
    navigate(`/correction/${documentId}/review`);
  };

  // Get panel size based on differences count
  const getDifferencePanelSize = () => {
    const diffCount = pageData?.differences?.filter(d => d.type !== 'equal')?.length || 0;
    if (diffCount === 0) return 15;
    if (diffCount <= 5) return 20;
    if (diffCount <= 15) return 25;
    return 30;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={40} />
        <Typography sx={{ ml: 2 }}>Loading comparison data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ pt: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!pageData) {
    return (
      <Container maxWidth="xl" sx={{ pt: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          No comparison data available for this page.
        </Alert>
      </Container>
    );
  }

  const differencePanelSize = getDifferencePanelSize();
  const documentPanelSize = (100 - differencePanelSize) / 2;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Page Navigation Header */}
      <PageNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onBackToUpload={handleBackToUpload}
        onProceedToReview={handleProceedToReview}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={saveCorrections}
        saving={saving}
        documentId={documentId}
      />

      {error && (
        <Alert severity="error" sx={{ mx: 2, mb: 1 }}>
          {error}
        </Alert>
      )}

      {/* Main Comparison Area */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Container maxWidth="xl" sx={{ height: '100%', py: 1 }}>
          <PanelGroup direction="horizontal" style={{ height: '100%' }}>
            {/* Document B Panel (Reference) - LEFT */}
            <Panel defaultSize={documentPanelSize}>
              <DocumentPanel
                title="Document B (Reference)"
                content={pageData.text_b_editable_pdf || 'No reference text available'}
                formattedContent={pageData.formatted_text_b}
                searchTerm={searchTermB}
                onSearchChange={setSearchTermB}
                ref={documentBRef}
                readOnly={true}
                position="left"
              />
            </Panel>

            <PanelResizeHandle style={{ width: '8px', background: '#e0e0e0' }} />

            {/* Differences Panel - MIDDLE */}
            <Panel defaultSize={differencePanelSize}>
              <DifferencePanel
                differences={pageData.differences || []}
                appliedDifferences={appliedDifferences}
                ignoredDifferences={ignoredDifferences}
                onApply={handleApplyDifference}
                onIgnore={handleIgnoreDifference}
                onApplyAll={handleApplyAll}
                onIgnoreAll={handleIgnoreAll}
                onReset={handleReset}
                onHighlight={highlightDifference}
                onClearHighlights={clearHighlights}
                ref={htmlDiffDisplayRef}
              />
            </Panel>

            <PanelResizeHandle style={{ width: '8px', background: '#e0e0e0' }} />

            {/* Document A Panel (OCR - Editable) - RIGHT */}
            <Panel defaultSize={documentPanelSize}>
              <DocumentPanel
                title="Document A (OCR Text)"
                content={textAEditable}
                formattedContent={pageData.formatted_text_a}
                searchTerm={searchTermA}
                onSearchChange={setSearchTermA}
                onContentChange={handleContentChange}
                ref={documentARef}
                readOnly={false}
                position="right"
                hasUnsavedChanges={hasUnsavedChanges}
                saving={saving}
              />
            </Panel>
          </PanelGroup>
        </Container>
      </Box>
    </Box>
  );
};

export default ComparisonView; 