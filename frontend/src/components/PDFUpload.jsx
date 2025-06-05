import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { usePDFContext } from '../contexts/PDFContext';
import {
  Box,
  Typography,
  LinearProgress,
  Alert,
  Paper
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';

const PDFUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { uploadDocument } = usePDFContext();

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }
    
    // Validate file size (limit to 10MB for example)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      // Handle upload progress
      const handleProgress = (progress) => {
        setUploadProgress(progress);
      };
      
      // Upload the file
      const response = await uploadDocument(file, handleProgress);
      
      // Navigate to the viewer page with the document ID
      navigate(`/viewer/${response.document_id}`);
    } catch (error) {
      setError('Upload failed: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  return (
    <Box sx={{ py: 2 }}>
      <Paper
        {...getRootProps()}
        elevation={0}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          bgcolor: isDragActive ? 'primary.50' : 'grey.50',
          p: 4,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'primary.50',
          }
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
        {isDragActive ? (
          <Typography variant="h6" align="center">
            Drop the PDF file here...
          </Typography>
        ) : (
          <>
            <Typography variant="h6" align="center" gutterBottom>
              Drag & drop a PDF file here, or click to select
            </Typography>
            <Typography variant="body2" align="center" color="textSecondary">
              Supports PDF files up to 10MB
            </Typography>
          </>
        )}
      </Paper>

      {uploading && (
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={uploadProgress} 
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Typography variant="body2" align="center" sx={{ mt: 1 }}>
            {uploadProgress}% Uploaded
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default PDFUpload; 