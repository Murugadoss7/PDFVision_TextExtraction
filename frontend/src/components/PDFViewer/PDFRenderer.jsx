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
  zoom = 200, 
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

  return (
    <Box sx={{ 
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      overflow: 'auto',
      bgcolor: '#f5f5f5',
      position: 'relative',
      p: 2
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
            gap: 2,
            p: 4
          }}>
            <CircularProgress size={40} color="primary" />
            <Typography variant="body1" color="text.secondary">
              Loading PDF document...
            </Typography>
          </Box>
        }
      >
        {error ? (
          <Box sx={{ 
            p: 4, 
            border: '2px solid', 
            borderColor: 'error.main', 
            borderRadius: 2, 
            bgcolor: 'error.light', 
            color: 'error.dark',
            maxWidth: 500,
            textAlign: 'center',
            mx: 'auto'
          }}>
            <Typography variant="h6" gutterBottom>Error Loading PDF</Typography>
            <Typography>{error}</Typography>
          </Box>
        ) : (
          <Box sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            width: '100%',
            minHeight: '100%'
          }}>
            <Box sx={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: '8px',
              overflow: 'visible',
              border: '1px solid #ddd',
              bgcolor: 'white',
              display: 'inline-block'
            }}>
              <Page
                pageNumber={currentPage}
                scale={zoom / 100}
                loading={
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: 2,
                    p: 8,
                    minHeight: 400,
                    minWidth: 300
                  }}>
                    <CircularProgress size={32} color="primary" />
                    <Typography variant="body1" color="text.secondary">
                      Loading page {currentPage}...
                    </Typography>
                  </Box>
                }
                onLoadSuccess={handlePageLoadSuccess}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Box>
          </Box>
        )}
      </Document>
    </Box>
  );
};

export default PDFRenderer; 