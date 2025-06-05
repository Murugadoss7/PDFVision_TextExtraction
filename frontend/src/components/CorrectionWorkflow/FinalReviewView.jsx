import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert, Button, TextField, Pagination, useTheme, Container } from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon, ArrowBack as ArrowBackIcon, ArrowForward as ArrowForwardIcon, PictureAsPdf as PdfIcon, TextFields as TextFieldsIcon, FileDownload as DownloadIcon, Edit as EditIcon } from '@mui/icons-material';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import PDFRenderer from '../PDFViewer/PDFRenderer';
import FormattedTextRenderer from '../UI/FormattedTextRenderer';

import { getDocumentDetails, submitPageCorrections, getFinalCorrectedText, finalizeDocumentCorrection, downloadDocumentAsWord } from '../../services/api'; 
import { usePDFContext } from '../../contexts/PDFContext';

const FinalReviewView = ({ onFinalize, onBackToPhase1 }) => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { currentDocument, updateCorrectedTextForPage } = usePDFContext();
  const theme = useTheme();
  
  const [correctedTextData, setCorrectedTextData] = useState({});
  const [editablePageText, setEditablePageText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState(null);
  const [documentData, setDocumentData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const actualTotalPages = documentData?.total_pages || currentDocument?.total_pages || 2;

  // Fetch document details and corrected text
  useEffect(() => {
    const fetchData = async () => {
      if (!documentId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch document details
        const docResponse = await getDocumentDetails(documentId);
        const docData = docResponse.data;
        setDocumentData(docData);
        
        // Fetch corrected text for all pages
        try {
          const correctedResponse = await getFinalCorrectedText(documentId);
          const correctedData = correctedResponse.data;
          
          // Convert the response to page-indexed format
          const pageTextMap = {};
          if (correctedData && correctedData.corrected_content_by_page) {
            // The API returns data as { "1": "text", "2": "text", ... }
            Object.entries(correctedData.corrected_content_by_page).forEach(([pageNum, text]) => {
              pageTextMap[parseInt(pageNum)] = text || '';
            });
          }
          setCorrectedTextData(pageTextMap);
          setEditablePageText(pageTextMap[currentPage] || '');
        } catch (correctedErr) {
          console.warn('No corrected text found yet:', correctedErr.message);
          setCorrectedTextData({});
          setEditablePageText('');
        }
        
      } catch (err) {
        setError(`Failed to load document data: ${err.response?.data?.detail || err.message}`);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [documentId, currentDocument]);

  // Update editable text when page changes
  useEffect(() => {
    setEditablePageText(correctedTextData[currentPage] || '');
  }, [currentPage, correctedTextData]);

  const handleSaveChanges = async () => {
    if (!documentId) return;
    setSaving(true);
    setError(null);
    try {
      await submitPageCorrections(documentId, currentPage, editablePageText);
      
      // Update local state
      setCorrectedTextData(prev => ({
        ...prev,
        [currentPage]: editablePageText
      }));
      
      updateCorrectedTextForPage(currentPage, editablePageText); 
      alert('Page saved successfully!');
    } catch (err) {
      setError(`Failed to save page ${currentPage}: ${err.response?.data?.detail || err.message}`);
    }
    setSaving(false);
  };

  const handleFinalize = async () => {
    if (onFinalize && typeof onFinalize === 'function') {
      onFinalize();
      return;
    }
    
    // Default finalization behavior
    setFinalizing(true);
    setError(null);
    
    try {
      await finalizeDocumentCorrection(documentId);
      alert('Document finalized successfully! You can now download the corrected version.');
      
      // Optional: Navigate back to document list or viewer
      navigate(`/viewer/${documentId}`);
    } catch (err) {
      setError(`Failed to finalize document: ${err.response?.data?.detail || err.message}`);
    }
    
    setFinalizing(false);
  };

  const handleDownload = async () => {
    try {
      const response = await downloadDocumentAsWord(documentId);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `corrected_document_${documentId}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      alert('Document downloaded successfully!');
    } catch (err) {
      setError(`Failed to download document: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handlePageChange = (event, value) => {
    const initialTextForPage = correctedTextData[currentPage] || '';
    if (editablePageText !== initialTextForPage) {
        if(!window.confirm("You have unsaved changes on this page. Are you sure you want to navigate away? Changes will be lost.")){
            return; 
        }
    }
    setCurrentPage(value);
    setError(null); 
  };

  const handleBackToCompare = () => {
    if (onBackToPhase1 && typeof onBackToPhase1 === 'function') {
      onBackToPhase1();
    } else {
      navigate(`/correction/${documentId}/compare`);
    }
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={40} />
        <Typography sx={{ ml: 2 }}>Loading document data...</Typography>
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
              Final Review: Page {currentPage} of {actualTotalPages}
            </Typography>
            {documentData?.filename && (
              <Typography variant="subtitle1" color="textSecondary">
                {documentData.filename}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={handleDownload}
              startIcon={<DownloadIcon />}
              disabled={saving || finalizing}
            >
              Download Word
            </Button>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={handleBackToCompare} 
              startIcon={<ArrowBackIcon />}
              disabled={saving || finalizing}
            >
              Back to Compare
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleFinalize} 
              disabled={saving || finalizing}
            >
              {finalizing ? <CircularProgress size={20} /> : 'Finalize & Proceed'}
            </Button>
          </Box>
        </Box>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Main Content Area */}
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'hidden', 
          display: 'flex',
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`,
          height: 'calc(100vh - 200px)'
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
                <Typography variant="h6" sx={{display: 'flex', alignItems: 'center', p: 2, pb: 1, borderBottom: `1px solid ${theme.palette.divider}`}}>
                  <PdfIcon sx={{mr:1}}/> Original Scanned PDF (Page {currentPage})
                </Typography>
                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', p: 1 }}>
                  {documentData ? (
                    <PDFRenderer 
                      documentUrl={`http://localhost:8000/api/documents/${documentId}/file`}
                      currentPage={currentPage}
                      zoom={100}
                      onLoadSuccess={(numPages) => {
                        console.log(`PDF loaded with ${numPages} pages`);
                      }}
                    />
                  ) : (
                    <Typography color="textSecondary">Loading PDF preview...</Typography>
                  )}
                </Box>
              </Paper>
            </Panel>
            
            <PanelResizeHandle style={resizeHandleStyle} />
            
            {/* Right panel: Text Editor */}
            <Panel defaultSize={50}>
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
                <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 1, borderBottom: `1px solid ${theme.palette.divider}`}}>
                  <Typography variant="h6" sx={{display: 'flex', alignItems: 'center', mb: 0}}>
                    <TextFieldsIcon sx={{mr:1}}/> Corrected Text (Page {currentPage})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {!isEditing ? (
                      <Button 
                        variant="outlined" 
                        size="small"
                        startIcon={<EditIcon />} 
                        onClick={() => setIsEditing(true)} 
                        disabled={saving || loading || finalizing}
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
                          onClick={() => {
                            handleSaveChanges();
                            setIsEditing(false);
                          }} 
                          disabled={saving || loading || finalizing}
                        >
                          {saving ? <CircularProgress size={16}/> : 'Save'}
                        </Button>
                        <Button 
                          variant="outlined" 
                          size="small"
                          startIcon={<CancelIcon />} 
                          onClick={() => {
                            setEditablePageText(correctedTextData[currentPage] || '');
                            setIsEditing(false);
                          }}
                          disabled={saving || finalizing}
                        >
                          Cancel
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Box>
                <Box sx={{ flexGrow: 1, p: 2, overflow: 'hidden', display: 'flex' }}>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      multiline
                      variant="outlined"
                      value={editablePageText}
                      onChange={(e) => setEditablePageText(e.target.value)}
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
                          whiteSpace: 'pre-wrap'
                        } 
                      }}
                      placeholder={`Enter corrected text for page ${currentPage}...`}
                    />
                  ) : (
                    <Box sx={{ 
                      width: '100%', 
                      height: '100%', 
                      overflow: 'auto', 
                      p: 2, 
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 1,
                      bgcolor: 'grey.50'
                    }}>
                      <FormattedTextRenderer 
                        rawText={editablePageText} 
                        formattedTextJson={null}
                        searchTerm=""
                      />
                    </Box>
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
              disabled={loading || saving || finalizing}
              size="large"
          />
        </Box>
      </Container>
    </Box>
  );
};

export default FinalReviewView; 