import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Toolbar, 
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Save as SaveIcon,
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatUnderlined as FormatUnderlinedIcon,
  FormatListBulleted as FormatListBulletedIcon,
  FormatListNumbered as FormatListNumberedIcon
} from '@mui/icons-material';
import { usePDFContext } from '../../contexts/PDFContext';
import FormattedTextRenderer from '../UI/FormattedTextRenderer';

const TextDisplay = ({ 
  text, 
  formattedText,
  pageNumber, 
  documentId,
  editModeEnabled = false,
  formattingEnabled = false,
  errorDetectionEnabled = false,
  searchQuery = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);
  const { loading } = usePDFContext();

  // Handle starting edit
  const handleEdit = () => {
    setIsEditing(true);
    setEditedText(text);
  };

  // Handle saving text
  const handleSave = () => {
    // In a real app, we would call an API to save the edited text
    // For now, we'll just end editing mode
    setIsEditing(false);
    // Here we would call the API to save editedText
  };

  // Handle text changes in the editor
  const handleTextChange = (e) => {
    setEditedText(e.target.value);
  };

  // Determine content based on edit mode
  const renderContent = () => {
    if (loading) {
      return (
        <Typography variant="body1" color="textSecondary">
          Loading text...
        </Typography>
      );
    }

    if (!text || text.trim() === '') {
      return (
        <Typography variant="body1" color="textSecondary">
          No extracted text available for this page.
        </Typography>
      );
    }

    if (isEditing) {
      return (
        <>
          {formattingEnabled && (
            <Toolbar variant="dense" disableGutters sx={{ mb: 1 }}>
              <Tooltip title="Bold">
                <IconButton size="small">
                  <FormatBoldIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Italic">
                <IconButton size="small">
                  <FormatItalicIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Underline">
                <IconButton size="small">
                  <FormatUnderlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Bullet List">
                <IconButton size="small">
                  <FormatListBulletedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Numbered List">
                <IconButton size="small">
                  <FormatListNumberedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Toolbar>
          )}
          <TextField
            multiline
            fullWidth
            value={editedText}
            onChange={handleTextChange}
            variant="outlined"
            minRows={20}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
                fontFamily: 'monospace'
              },
              '& .MuiOutlinedInput-input': { 
                whiteSpace: 'pre-wrap'
              }
            }}
          />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
            >
              Save
            </Button>
          </Box>
        </>
      );
    }

    // Display mode with formatted text using unified renderer
    return (
      <FormattedTextRenderer 
        rawText={text}
        formattedTextJson={formattedText}
        searchTerm={searchQuery}
      />
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Extracted Text - Page {pageNumber}
        </Typography>
        
        {!isEditing && editModeEnabled && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            size="small"
          >
            Edit
          </Button>
        )}
      </Box>
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {renderContent()}
      </Box>
    </Box>
  );
};

export default TextDisplay; 