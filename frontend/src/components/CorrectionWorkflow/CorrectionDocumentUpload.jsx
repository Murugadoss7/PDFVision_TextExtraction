import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, Alert, Paper, Button, Grid, CircularProgress, Chip } from '@mui/material';
import { CloudUpload as CloudUploadIcon, CheckCircleOutline as CheckCircleIcon, ArrowForward as ArrowForwardIcon, Assignment as AssignmentIcon } from '@mui/icons-material';
import { getDocumentDetails, uploadEditablePdfForCorrection } from '../../services/api';
import { usePDFContext } from '../../contexts/PDFContext';

const CorrectionDocumentUpload = () => {
  const navigate = useNavigate();
  const { documentId } = useParams();
  
  // Debug the context
  const pdfContext = usePDFContext();
  console.log('🔍 PDFContext value:', pdfContext);
  console.log('🔍 setCurrentDocument type:', typeof pdfContext?.setCurrentDocument);
  
  const { setCurrentDocument } = pdfContext || {};

  // Document A (existing document) state
  const [existingDoc, setExistingDoc] = useState(null);
  const [docALoading, setDocALoading] = useState(true);
  const [docAError, setDocAError] = useState(null);

  // Document B (editable PDF) state
  const [docBFile, setDocBFile] = useState(null);
  const [docBUploading, setDocBUploading] = useState(false);
  const [docBUploadProgress, setDocBUploadProgress] = useState(0);
  const [docBError, setDocBError] = useState(null);
  const [docBUploadedInfo, setDocBUploadedInfo] = useState(null);

  // Load existing document details
  useEffect(() => {
    const loadExistingDocument = async () => {
      if (!documentId) {
        setDocAError('No document ID provided in URL');
        setDocALoading(false);
        return;
      }

      try {
        setDocALoading(true);
        const response = await getDocumentDetails(documentId);
        const docData = response.data;
        
        // Validate document has OCR completed
        if (docData.status !== 'completed' && docData.status !== 'correction_finalized' && docData.status !== 'images_extracted') {
          setDocAError(`Document status is "${docData.status}". OCR processing must be completed before correction.`);
          setDocALoading(false);
          return;
        }

        // For images_extracted status, verify OCR text actually exists
        if (docData.status === 'images_extracted') {
          try {
            // Quick check - try to get text from first page to verify OCR is done
            const textCheck = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/documents/${documentId}/pages/1/text`);
            if (!textCheck.ok) {
              setDocAError(`Document status is "${docData.status}". OCR text not found - processing may still be in progress.`);
              setDocALoading(false);
              return;
            }
          } catch (err) {
            setDocAError(`Document status is "${docData.status}". Unable to verify OCR completion - processing may still be in progress.`);
            setDocALoading(false);
            return;
          }
        }

        setExistingDoc(docData);
        if (typeof setCurrentDocument === 'function') {
          setCurrentDocument(docData);
        } else {
          console.error('❌ setCurrentDocument is not a function:', typeof setCurrentDocument);
        }
        console.log('✅ Loaded existing document for correction:', docData);
        
      } catch (err) {
        console.error('❌ Failed to load document:', err);
        setDocAError(`Failed to load document: ${err.response?.data?.detail || err.message}`);
      } finally {
        setDocALoading(false);
      }
    };

    loadExistingDocument();
  }, [documentId, setCurrentDocument]);

  // Handle Document B upload
  const handleDocBUpload = async (file) => {
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setDocBError('Please upload a PDF file');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setDocBError('File size exceeds 50MB limit');
      return;
    }

    setDocBFile(file);
    setDocBError(null);
    setDocBUploading(true);
    setDocBUploadProgress(0);

    try {
      console.log('📤 Uploading editable PDF for document ID:', documentId);
      
      const response = await uploadEditablePdfForCorrection(documentId, file, (progress) => {
        const percentCompleted = Math.round((progress.loaded * 100) / progress.total);
        setDocBUploadProgress(percentCompleted);
      });
      
      console.log('✅ Editable PDF uploaded successfully:', response.data);
      setDocBUploadedInfo(response.data);
      
    } catch (err) {
      console.error('❌ Editable PDF upload failed:', err);
      setDocBError(`Upload failed: ${err.response?.data?.detail || err.message}`);
      setDocBFile(null);
    } finally {
      setDocBUploading(false);
    }
  };

  // Navigate to comparison
  const handleProceedToComparison = () => {
    if (existingDoc && docBUploadedInfo) {
      navigate(`/correction/${documentId}/compare`);
    }
  };

  // Dropzone for Document B
  const onDropDocB = useCallback((acceptedFiles, rejectedFiles) => {
    console.log('🔍 Dropzone onDrop called:', { acceptedFiles, rejectedFiles });
    if (acceptedFiles.length > 0) {
      handleDocBUpload(acceptedFiles[0]);
    }
  }, [documentId]);

  const { getRootProps: getRootPropsB, getInputProps: getInputPropsB, isDragActive: isDragActiveB, open: openFileDialog } = useDropzone({ 
    onDrop: onDropDocB, 
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false, 
    disabled: docBUploading || !!docBUploadedInfo,
    onDropAccepted: (files) => console.log('🔍 Files accepted:', files),
    onDropRejected: (rejectedFiles) => console.log('🔍 Files rejected:', rejectedFiles),
    onFileDialogCancel: () => console.log('🔍 File dialog cancelled'),
    onError: (err) => console.log('🔍 Dropzone error:', err)
  });

  // Dropzone styling
  const dropzoneStyle = (isDragActive, disabled) => ({
    border: '2px dashed',
    borderColor: isDragActive ? 'primary.main' : (disabled ? 'grey.400' : 'grey.500'),
    borderRadius: 2,
    bgcolor: isDragActive ? 'action.hover' : (disabled ? 'grey.200' : 'background.paper'),
    p: 3,
    minHeight: 150,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    transition: 'all 0.2s ease-in-out',
    opacity: disabled ? 0.6 : 1,
    '&:hover': !disabled && { borderColor: 'primary.main', bgcolor: 'action.hover' },
  });

  // Render Document B content
  const renderDocBContent = () => {
    console.log('🔍 Rendering DocB content - uploading:', docBUploading, 'uploadedInfo:', !!docBUploadedInfo);
    
    if (docBUploading) {
      return (
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress variant="determinate" value={docBUploadProgress} sx={{mb: 1}} />
          <Typography>{docBUploadProgress}% Uploaded</Typography>
          <Typography variant="caption">{docBFile?.name}</Typography>
        </Box>
      );
    }
    
    if (docBUploadedInfo) {
      return (
        <Box sx={{ textAlign: 'center', color: 'success.main' }}>
          <CheckCircleIcon sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h6">Document B Uploaded</Typography>
          <Typography variant="caption">{docBFile?.name}</Typography>
        </Box>
      );
    }

    return (
      <>
        <CloudUploadIcon color={isDragActiveB ? 'primary' : 'action'} sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="subtitle1">Editable PDF (Document B)</Typography>
        <Typography variant="caption" color="textSecondary">Drag & drop or click to browse</Typography>
        {docBError && <Alert severity="error" sx={{ mt: 1, width: '100%', fontSize: '0.8rem' }}>{docBError}</Alert>}
      </>
    );
  };

  // Loading state
  if (docALoading) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography>Loading document details...</Typography>
      </Paper>
    );
  }

  // Error state
  if (docAError) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Alert severity="error">{docAError}</Alert>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{textAlign: 'center', mb: 3}}>
        Interactive OCR Correction Setup
      </Typography>
      
      <Grid container spacing={3}>
        {/* Document A - Existing Document (Ready) */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Document A (Scanned PDF) - Ready ✅
          </Typography>
          <Paper 
            elevation={1} 
            sx={{ 
              p: 3, 
              minHeight: 150, 
              bgcolor: 'success.light', 
              border: '2px solid', 
              borderColor: 'success.main',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <Box sx={{ textAlign: 'center', color: 'success.dark' }}>
              <AssignmentIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" gutterBottom>Document Ready</Typography>
              <Box sx={{ textAlign: 'left', mt: 2 }}>
                <Typography variant="body2"><strong>ID:</strong> {existingDoc?.id}</Typography>
                <Typography variant="body2"><strong>File:</strong> {existingDoc?.filename}</Typography>
                <Typography variant="body2"><strong>Pages:</strong> {existingDoc?.total_pages}</Typography>
                <Chip 
                  label={`Status: ${existingDoc?.status}`} 
                  color="success" 
                  size="small" 
                  sx={{ mt: 1 }} 
                />
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Document B - Editable PDF Upload */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Document B (Editable PDF) - Upload Required
          </Typography>
          <Paper 
            {...getRootPropsB} 
            sx={dropzoneStyle(isDragActiveB, docBUploading || !!docBUploadedInfo)}
            onClick={(e) => {
              console.log('🔍 Paper clicked, disabled:', docBUploading || !!docBUploadedInfo);
              if (!docBUploading && !docBUploadedInfo) {
                e.stopPropagation();
                openFileDialog();
              }
            }}
          >
            <input {...getInputPropsB()} />
            {renderDocBContent()}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Success Section */}
      {existingDoc && docBUploadedInfo && (
        <Box sx={{mt: 3}}>
          <Alert severity="success" sx={{mb: 2}}>
            Both documents ready! You can now proceed to text comparison and correction.
          </Alert>
          <Box sx={{textAlign: 'center'}}>
            <Button 
              variant="contained" 
              size="large" 
              onClick={handleProceedToComparison}
              endIcon={<ArrowForwardIcon />}
              sx={{px: 4, py: 1.5}}
            >
              Proceed to Comparison
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default CorrectionDocumentUpload; 