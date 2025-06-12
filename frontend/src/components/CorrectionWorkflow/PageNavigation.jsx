import React from 'react';
import { Box, Typography, Pagination, Button, Chip } from '@mui/material';
import { ArrowBack as ArrowBackIcon, ArrowForward as ArrowForwardIcon, Save as SaveIcon } from '@mui/icons-material';

const PageNavigation = ({ 
  currentPage, 
  totalPages, 
  documentId,
  onPageChange,
  onBackToUpload,
  onProceedToReview,
  hasUnsavedChanges,
  onSave,
  saving
}) => {
  const handlePageChange = (event, newPage) => {
    // Material-UI Pagination onChange gives us (event, page)
    // But our parent expects just the page number
    if (typeof onPageChange === 'function') {
      onPageChange(newPage);
    }
  };

  const handleBackToUpload = () => {
    if (typeof onBackToUpload === 'function') {
      onBackToUpload();
    }
  };

  const handleProceedToReview = () => {
    if (typeof onProceedToReview === 'function') {
      onProceedToReview();
    }
  };

  const handleSave = () => {
    if (typeof onSave === 'function') {
      onSave();
    }
  };

  return (
    <Box sx={{ 
      borderBottom: '1px solid', 
      borderColor: 'divider',
      backgroundColor: 'background.paper'
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" component="h1">
            Compare & Correct - Page {currentPage} of {totalPages}
          </Typography>
          {hasUnsavedChanges && (
            <Chip 
              label={saving ? "Saving..." : "Unsaved Changes"} 
              size="small" 
              color={saving ? "info" : "warning"}
              variant="outlined"
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {hasUnsavedChanges && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          )}
          
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToUpload}
          >
            Back to Upload
          </Button>
          
          <Button
            variant="contained"
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={handleProceedToReview}
          >
            Proceed to Review
          </Button>
        </Box>
      </Box>

      {/* Page Navigation */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        p: 2,
        pt: 0
      }}>
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
          size="medium"
          showFirstButton
          showLastButton
          disabled={saving}
        />
      </Box>
    </Box>
  );
};

export default PageNavigation; 