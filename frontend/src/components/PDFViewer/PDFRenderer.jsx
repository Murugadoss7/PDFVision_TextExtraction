import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Box, Typography, CircularProgress } from '@mui/material';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set worker source for pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PDFRenderer = ({ 
  documentUrl, 
  currentPage = 1, 
  zoom = 100, 
  onLoadSuccess = () => {} 
}) => {
  const [, setNumPages] = useState(null);
  const [, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    onLoadSuccess(numPages);
  };

  const handleDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF document. Please try again later.');
    setLoading(false);
  };

  const handlePageLoadSuccess = () => {
    setLoading(false);
  };

  const scale = zoom / 100;

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      p: 2,
      width: '100%',
      minHeight: 'fit-content'
    }}>
      <Document
        file={documentUrl}
        onLoadSuccess={handleDocumentLoadSuccess}
        onLoadError={handleDocumentLoadError}
        loading={
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh'
          }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1">Loading PDF document...</Typography>
          </Box>
        }
      >
        {error ? (
          <Box sx={{ 
            p: 3, 
            border: '1px solid', 
            borderColor: 'error.main', 
            borderRadius: 1, 
            bgcolor: 'error.light', 
            color: 'error.dark'
          }}>
            <Typography>{error}</Typography>
          </Box>
        ) : (
          <Page
            pageNumber={currentPage}
            scale={scale}
            loading={
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                p: 4
              }}>
                <CircularProgress size={24} sx={{ mb: 1 }} />
                <Typography variant="body2">Loading page...</Typography>
              </Box>
            }
            onLoadSuccess={handlePageLoadSuccess}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        )}
      </Document>
    </Box>
  );
};

export default PDFRenderer; 