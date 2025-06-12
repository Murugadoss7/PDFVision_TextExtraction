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
import CKTextEditor from '../TextEditor/CKTextEditor';
import Header from '../UI/Header';
import { 
  Box, 
  Paper, 
  CircularProgress, 
  Alert,
  Container,
  useTheme,
  IconButton,
  Typography,
  Tooltip,
  ButtonGroup,
  Chip
} from '@mui/material';
import {
  NavigateBefore,
  NavigateNext,
  ZoomIn,
  ZoomOut,
  FitScreen,
  FindInPage
} from '@mui/icons-material';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfZoom, setPdfZoom] = useState(100);

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
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setPdfZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setPdfZoom(prev => Math.max(prev - 25, 50));
  };

  const handleFitToWidth = () => {
    setPdfZoom(100);
  };

  // Panel resize handle style
  const resizeHandleStyle = {
    width: '4px',
    background: theme.palette.divider,
    '&:hover': {
      background: theme.palette.primary.main,
    },
    cursor: 'col-resize',
    transition: 'background 0.2s',
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      <Header 
        onSearchChange={handleSearchChange}
        searchQuery={searchQuery}
        isDarkMode={mode === 'dark'}
        onToggleTheme={toggleTheme}
        documentId={documentId}
      />
      
      <Container maxWidth="xl" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', py: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1, borderRadius: 1 }}>
            {error}
          </Alert>
        )}
        
        {/* Main Content Area */}
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'hidden', 
          display: 'flex',
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: `1px solid ${theme.palette.divider}`,
          height: 'calc(100vh - 100px)',
          bgcolor: 'background.paper'
        }}>
          <PanelGroup direction="horizontal" style={{ width: '100%', height: '100%' }}>
            
            {/* Left Panel: PDF Viewer */}
            <Panel defaultSize={50}>
              <Box sx={{ 
                height: '100%', 
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'grey.50'
              }}>
                {/* PDF Controls Bar */}
                <Paper 
                  elevation={0}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    px: 2, 
                    py: 1,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    borderRadius: 0,
                    bgcolor: 'background.paper'
                  }}
                >
                  {/* Page Navigation */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title="Previous page" arrow>
                      <span>
                        <IconButton 
                          size="small" 
                          onClick={handlePreviousPage}
                          disabled={currentPage <= 1}
                          sx={{ 
                            width: 32, 
                            height: 32,
                            color: currentPage <= 1 ? 'text.disabled' : 'primary.main',
                          }}
                        >
                          <NavigateBefore fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    
                    <Chip 
                      label={`${currentPage} / ${totalPages}`}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        minWidth: 80,
                        fontSize: '0.75rem',
                        height: 28,
                        bgcolor: 'background.default'
                      }}
                    />
                    
                    <Tooltip title="Next page" arrow>
                      <span>
                        <IconButton 
                          size="small" 
                          onClick={handleNextPage}
                          disabled={currentPage >= totalPages}
                          sx={{ 
                            width: 32, 
                            height: 32,
                            color: currentPage >= totalPages ? 'text.disabled' : 'primary.main',
                          }}
                        >
                          <NavigateNext fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>

                  {/* Document Title */}
                  <Typography variant="subtitle2" sx={{ 
                    color: 'text.secondary',
                    fontWeight: 500,
                    textAlign: 'center',
                    flex: 1,
                    mx: 2
                  }}>
                    {currentDocument?.filename || 'Document Viewer'}
                  </Typography>

                  {/* Zoom Controls */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="Zoom out" arrow>
                      <span>
                        <IconButton 
                          size="small"
                          onClick={handleZoomOut}
                          disabled={pdfZoom <= 50}
                          sx={{ width: 32, height: 32 }}
                        >
                          <ZoomOut fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    
                    <Chip 
                      label={`${pdfZoom}%`}
                      size="small"
                      clickable
                      onClick={handleFitToWidth}
                      sx={{ 
                        minWidth: 60,
                        fontSize: '0.75rem',
                        height: 28,
                        bgcolor: 'primary.light',
                        color: 'primary.contrastText',
                        '&:hover': {
                          bgcolor: 'primary.main'
                        }
                      }}
                    />
                    
                    <Tooltip title="Zoom in" arrow>
                      <span>
                        <IconButton 
                          size="small"
                          onClick={handleZoomIn}
                          disabled={pdfZoom >= 200}
                          sx={{ width: 32, height: 32 }}
                        >
                          <ZoomIn fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    
                    <Tooltip title="Fit to width" arrow>
                      <IconButton 
                        size="small"
                        onClick={handleFitToWidth}
                        sx={{ width: 32, height: 32, ml: 0.5 }}
                      >
                        <FitScreen fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>

                {/* PDF Content */}
                <Box sx={{ 
                  flexGrow: 1, 
                  overflow: 'auto', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  bgcolor: 'grey.100'
                }}>
                  {currentDocument ? (
                    <PDFRenderer 
                      documentUrl={`http://localhost:8000/api/documents/${documentId}/file`}
                      currentPage={currentPage}
                      zoom={pdfZoom}
                      onLoadSuccess={(numPages) => {
                        if (totalPages === 0) {
                          setTotalPages(numPages);
                        }
                      }}
                    />
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      color: 'text.secondary'
                    }}>
                      {loading ? (
                        <>
                          <CircularProgress size={40} />
                          <Typography variant="body2">Loading document...</Typography>
                        </>
                      ) : (
                        <>
                          <FindInPage sx={{ fontSize: 48, opacity: 0.5 }} />
                          <Typography variant="body2">No document found</Typography>
                        </>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            </Panel>
            
            <PanelResizeHandle style={resizeHandleStyle} />
            
            {/* Right Panel: Text Editor */}
            <Panel defaultSize={50}>
              <Box sx={{ 
                height: '100%', 
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {loading ? (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100%',
                    gap: 2,
                    color: 'text.secondary'
                  }}>
                    <CircularProgress size={40} />
                    <Typography variant="body2">Loading text content...</Typography>
                  </Box>
                ) : (
                  <CKTextEditor 
                    text={extractedText[currentPage] || ''}
                    formattedText={formattedText[currentPage] || null}
                    pageNumber={currentPage}
                    documentId={documentId}
                    searchQuery={searchQuery}
                  />
                )}
              </Box>
            </Panel>
          </PanelGroup>
        </Box>
      </Container>
    </Box>
  );
};

export default ViewerPage; 