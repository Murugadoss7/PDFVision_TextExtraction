import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  PanelGroup, 
  Panel, 
  PanelResizeHandle 
} from 'react-resizable-panels';
import { usePDFContext } from '../../contexts/PDFContext';
import { useThemeContext } from '../../contexts/ThemeContext';
import PDFRenderer from './PDFRenderer';
import TextDisplay from '../TextEditor/TextDisplay';
import Header from '../UI/Header';
import ViewerToolbar from '../UI/ViewerToolbar';
import { 
  Box, 
  Paper, 
  CircularProgress, 
  Alert,
  Container,
  useTheme
} from '@mui/material';

const ViewerPage = () => {
  const { documentId } = useParams();
  const { 
    currentDocument, 
    currentPage, 
    totalPages, 
    extractedText,
    formattedText,
    loading,
    error,
    setCurrentPage,
    setTotalPages,
    fetchDocumentDetails, 
    fetchPageText,
    checkExtractionStatus,
    exportDocumentToWord
  } = usePDFContext();
  const { mode, toggleTheme } = useThemeContext();
  const theme = useTheme();

  const [statusCheckInterval, setStatusCheckInterval] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [formattingEnabled, setFormattingEnabled] = useState(false);
  const [errorDetectionEnabled, setErrorDetectionEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Clear interval when component unmounts
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, []);

  // Fetch document details on mount
  useEffect(() => {
    if (documentId) {
      fetchDocumentDetails(documentId);
    }
  }, [documentId, fetchDocumentDetails]);

  // Start polling for extraction status if document is in processing state
  useEffect(() => {
    // Clear previous interval if exists
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }

    if (currentDocument && currentDocument.status === 'processing') {
      // Create interval to check status every 5 seconds
      const interval = setInterval(async () => {
        const status = await checkExtractionStatus(documentId);
        
        // If extraction is complete, refresh document details
        if (status && (status.status === 'completed' || status.status === 'error')) {
          fetchDocumentDetails(documentId);
          clearInterval(interval);
          setStatusCheckInterval(null);
        }
      }, 5000);
      
      setStatusCheckInterval(interval);
    }
  }, [currentDocument, documentId, fetchDocumentDetails, checkExtractionStatus]);

  // Fetch page text when current page changes
  useEffect(() => {
    if (documentId && currentPage) {
      fetchPageText(documentId, currentPage);
    }
  }, [documentId, currentPage, fetchPageText]);

  const handlePageChange = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    // Implement search logic here
  };

  // Panel resize handle style
  const resizeHandleStyle = {
    width: '8px',
    background: theme.palette.divider,
    '&:hover': {
      background: theme.palette.primary.light,
    },
    cursor: 'col-resize',
    transition: 'background 0.2s',
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header 
        onSearchChange={handleSearchChange}
        searchQuery={searchQuery}
        isDarkMode={mode === 'dark'}
        onToggleTheme={toggleTheme}
      />
      
      <Container maxWidth="xl" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', pt: 2, pb: 2 }}>
        <ViewerToolbar 
          currentPage={currentPage}
          totalPages={totalPages}
          zoom={zoom}
          onPageChange={handlePageChange}
          onZoomChange={setZoom}
          syncEnabled={syncEnabled}
          onSyncToggle={setSyncEnabled}
          editModeEnabled={editModeEnabled}
          onEditModeToggle={setEditModeEnabled}
          formattingEnabled={formattingEnabled}
          onFormattingToggle={setFormattingEnabled}
          errorDetectionEnabled={errorDetectionEnabled}
          onErrorDetectionToggle={setErrorDetectionEnabled}
          onExport={() => exportDocumentToWord(documentId)}
        />
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'hidden', 
          display: 'flex',
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`,
          height: 'calc(100vh - 180px)'  // Calculate height to ensure scrolling works
        }}>
          <PanelGroup direction="horizontal" style={{ width: '100%', height: '100%' }}>
            {/* Left panel: PDF Viewer */}
            <Panel defaultSize={50}>
              <Paper 
                elevation={0} 
                sx={{ 
                  height: '100%', 
                  overflow: 'auto', 
                  bgcolor: 'background.paper',
                  borderRadius: 0,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {currentDocument ? (
                  <PDFRenderer 
                    documentUrl={`http://localhost:8000/api/documents/${documentId}/file`}
                    currentPage={currentPage}
                    zoom={zoom}
                    onLoadSuccess={(numPages) => {
                      // If totalPages is 0, update it from the PDF
                      if (totalPages === 0) {
                        setTotalPages(numPages);
                      }
                    }}
                  />
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100%' 
                  }}>
                    {loading ? <CircularProgress /> : 'No document found'}
                  </Box>
                )}
              </Paper>
            </Panel>
            
            <PanelResizeHandle style={resizeHandleStyle} />
            
            {/* Right panel: Text Display */}
            <Panel defaultSize={50}>
              <Paper 
                elevation={0} 
                sx={{ 
                  height: '100%', 
                  overflow: 'auto',
                  bgcolor: 'background.paper',
                  borderRadius: 0,
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {loading ? (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100%' 
                  }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TextDisplay 
                    text={extractedText[currentPage] || ''}
                    formattedText={formattedText[currentPage] || null}
                    pageNumber={currentPage}
                    documentId={documentId}
                    editModeEnabled={editModeEnabled}
                    formattingEnabled={formattingEnabled}
                    errorDetectionEnabled={errorDetectionEnabled}
                    searchQuery={searchQuery}
                  />
                )}
              </Paper>
            </Panel>
          </PanelGroup>
        </Box>
      </Container>
    </Box>
  );
};

export default ViewerPage; 