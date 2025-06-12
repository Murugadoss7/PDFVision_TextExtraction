import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import { PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { getPageComparisonData, submitPageCorrections } from '../../services/api';
import { useHighlighting } from '../../hooks/useHighlighting';
import DocumentPanel from './DocumentPanel';
import DifferencePanel from './DifferencePanel';
import PageNavigation from './PageNavigation';

const ComparisonView = () => {
  const { docId, pageNum } = useParams();
  
  // State
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState(null);
  const [textAEditable, setTextAEditable] = useState('');
  const [originalOcrText, setOriginalOcrText] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [appliedDifferences, setAppliedDifferences] = useState([]);
  const [currentPage, setCurrentPage] = useState(parseInt(pageNum) || 1);
  const [searchTermA, setSearchTermA] = useState('');
  const [searchTermB, setSearchTermB] = useState('');

  // Highlighting hook
  const {
    documentARef,
    documentBRef,
    htmlDiffDisplayRef,
    clearHighlights,
    highlightDifference
  } = useHighlighting();

  // Fetch page data
  const fetchData = async (docId, pageNum) => {
    try {
      setLoading(true);
      const response = await getPageComparisonData(docId, pageNum);
      setPageData(response.data);
      
      const ocrText = response.data.text_a_ocr || "";
      setTextAEditable(ocrText);
      setOriginalOcrText(ocrText);
      setHasUnsavedChanges(false);
      setAppliedDifferences([]);
      
    } catch (error) {
      console.error('Error fetching page data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    if (docId && pageNum) {
      fetchData(docId, parseInt(pageNum));
    }
  }, [docId, pageNum]);

  useEffect(() => {
    clearHighlights();
  }, [currentPage, clearHighlights]);

  useEffect(() => {
    return () => clearHighlights();
  }, [clearHighlights]);

  // Handlers
  const handlePageChange = (event, newPage) => {
    clearHighlights();
    setCurrentPage(newPage);
    window.history.pushState(null, '', `/correction/${docId}/compare/${newPage}`);
  };

  const handleSave = async () => {
    try {
      await submitPageCorrections(docId, currentPage, textAEditable);
      setOriginalOcrText(textAEditable);
      setHasUnsavedChanges(false);
      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving changes');
    }
  };

  const handleReset = () => {
    setTextAEditable(originalOcrText);
    setHasUnsavedChanges(false);
    setAppliedDifferences([]);
  };

  const handleApplyDifference = (diff) => {
    setAppliedDifferences(prev => [...prev, diff]);
    setHasUnsavedChanges(true);
  };

  const handleIgnoreDifference = (diff) => {
    // Add ignore logic if needed
    console.log('Ignoring difference:', diff);
  };

  const handleApplyAll = () => {
    if (pageData?.differences) {
      setAppliedDifferences([...pageData.differences]);
      setHasUnsavedChanges(true);
    }
  };

  const handleIgnoreAll = () => {
    setAppliedDifferences([]);
    console.log('Ignoring all differences');
  };

  const handleRevert = () => {
    setAppliedDifferences([]);
    setHasUnsavedChanges(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        Loading...
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth={false} sx={{ flex: 1, py: 2 }}>
        <PageNavigation
          currentPage={currentPage}
          totalPages={pageData?.total_pages || 1}
          docId={docId}
          onPageChange={handlePageChange}
          hasUnsavedChanges={hasUnsavedChanges}
        />

        <Box sx={{ height: 'calc(100vh - 200px)' }}>
          <PanelGroup direction="horizontal">
            {/* Document A Panel */}
            <DocumentPanel
              title="Document A (OCR - Editable)"
              icon="📝"
              content={textAEditable}
              isEditable={true}
              searchValue={searchTermA}
              onSearchChange={setSearchTermA}
              onSave={handleSave}
              onReset={handleReset}
              hasUnsavedChanges={hasUnsavedChanges}
              forwardRef={documentARef}
              htmlDiffDisplayRef={htmlDiffDisplayRef}
              originalContent={pageData?.text_a_ocr}
            />

            <PanelResizeHandle />

            {/* Differences Panel */}
            <DifferencePanel
              differences={pageData?.differences || []}
              appliedDifferences={appliedDifferences}
              onHighlightDifference={highlightDifference}
              onApplyDifference={handleApplyDifference}
              onIgnoreDifference={handleIgnoreDifference}
              onApplyAll={handleApplyAll}
              onIgnoreAll={handleIgnoreAll}
              onRevert={handleRevert}
            />

            <PanelResizeHandle />

            {/* Document B Panel */}
            <DocumentPanel
              title="Document B (Reference)"
              icon="📖"
              content={pageData?.text_b_reference}
              isReference={true}
              searchValue={searchTermB}
              onSearchChange={setSearchTermB}
              forwardRef={documentBRef}
            />
          </PanelGroup>
        </Box>
      </Container>
    </Box>
  );
};

export default ComparisonView; 