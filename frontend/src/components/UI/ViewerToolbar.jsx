import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  IconButton,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Tooltip,
  Paper
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  NavigateBefore,
  NavigateNext,
  Download,
  CompareArrows
} from '@mui/icons-material';

const ViewerToolbar = ({
  currentPage = 1,
  totalPages = 1,
  zoom = 100,
  onPageChange,
  onZoomChange,
  onSyncToggle = () => {},
  syncEnabled = false,
  onEditModeToggle = () => {},
  editModeEnabled = false,
  onFormattingToggle = () => {},
  formattingEnabled = false,
  onErrorDetectionToggle = () => {},
  errorDetectionEnabled = false,
  onExport = () => {}
}) => {
  const [pageInput, setPageInput] = useState(currentPage);
  const navigate = useNavigate();
  const { documentId } = useParams();

  const handlePageInputChange = (e) => {
    setPageInput(e.target.value);
  };

  const handlePageSubmit = (e) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (isNaN(page) || page < 1 || page > totalPages) {
      setPageInput(currentPage);
      return;
    }
    onPageChange(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      onPageChange(newPage);
      setPageInput(newPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      onPageChange(newPage);
      setPageInput(newPage);
    }
  };

  return (
    <Paper 
      elevation={1}
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 0.5, 
        borderRadius: 1,
        mb: 1,
        flexWrap: 'wrap'
      }}
    >
      {/* Zoom Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
        <Tooltip title="Zoom out">
          <IconButton 
            size="small" 
            onClick={() => onZoomChange(zoom - 10)}
            disabled={zoom <= 50}
          >
            <ZoomOut />
          </IconButton>
        </Tooltip>
        <Typography variant="body2" sx={{ mx: 1 }}>
          {zoom}%
        </Typography>
        <Tooltip title="Zoom in">
          <IconButton 
            size="small" 
            onClick={() => onZoomChange(zoom + 10)}
            disabled={zoom >= 200}
          >
            <ZoomIn />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

      {/* Page Navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
        <Tooltip title="Previous page">
          <span>
            <IconButton 
              size="small" 
              onClick={handlePreviousPage}
              disabled={currentPage <= 1}
            >
              <NavigateBefore />
            </IconButton>
          </span>
        </Tooltip>
        
        <form onSubmit={handlePageSubmit} style={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            size="small"
            value={pageInput}
            onChange={handlePageInputChange}
            sx={{ width: '60px', mx: 1 }}
            inputProps={{ style: { textAlign: 'center', padding: '5px' } }}
          />
          <Typography variant="body2">
            of {totalPages}
          </Typography>
        </form>
        
        <Tooltip title="Next page">
          <span>
            <IconButton 
              size="small" 
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              <NavigateNext />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

      {/* Toggle Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={<Switch checked={syncEnabled} onChange={(e) => onSyncToggle(e.target.checked)} />}
          label="Sync Scroll"
          sx={{ mr: 2 }}
        />
        
        <Tooltip title="Toggle edit mode">
          <FormControlLabel
            control={<Switch checked={editModeEnabled} onChange={(e) => onEditModeToggle(e.target.checked)} />}
            label="Edit Mode"
            labelPlacement="end"
            sx={{ mr: 2 }}
          />
        </Tooltip>
        
        <Tooltip title="Toggle formatting options">
          <FormControlLabel
            control={<Switch checked={formattingEnabled} onChange={(e) => onFormattingToggle(e.target.checked)} />}
            label="Formatting"
            labelPlacement="end"
            sx={{ mr: 2 }}
          />
        </Tooltip>
        
        <Tooltip title="Toggle error detection">
          <FormControlLabel
            control={<Switch checked={errorDetectionEnabled} onChange={(e) => onErrorDetectionToggle(e.target.checked)} />}
            label="Error Detection"
            labelPlacement="end"
          />
        </Tooltip>
      </Box>

      {/* Export and Correction Buttons */}
      <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<CompareArrows />}
          onClick={() => navigate(`/correction/${documentId}/upload`)}
          size="small"
        >
          OCR Correction
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Download />}
          onClick={onExport}
          size="small"
        >
          Export to Word
        </Button>
      </Box>
    </Paper>
  );
};

export default ViewerToolbar; 