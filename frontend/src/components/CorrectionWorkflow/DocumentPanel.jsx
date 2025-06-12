import React, { useState, forwardRef } from 'react';
import { 
  Paper, 
  Typography, 
  TextField, 
  Box, 
  InputAdornment,
  IconButton,
  Chip,
  Button
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Clear as ClearIcon,
  Save as SaveIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import FormattedTextRenderer from '../UI/FormattedTextRenderer';

const DocumentPanel = forwardRef(({
  title,
  content = '',
  formattedContent = null,
  searchTerm = '',
  onSearchChange,
  onContentChange,
  readOnly = false,
  position = 'left',
  hasUnsavedChanges = false,
  saving = false
}, ref) => {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);

  // Utility function to strip HTML tags
  const stripHtmlTags = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
  };

  // Get clean content for editing
  const getCleanContent = () => {
    return stripHtmlTags(content);
  };

  const handleContentChange = (event) => {
    if (onContentChange && !readOnly) {
      onContentChange(event.target.value);
    }
  };

  const handleSearchChange = (event) => {
    if (onSearchChange) {
      onSearchChange(event.target.value);
    }
  };

  const clearSearch = () => {
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  const toggleEdit = () => {
    if (!readOnly) {
      setIsEditing(!isEditing);
    }
  };

  return (
    <Paper 
      elevation={1} 
      ref={ref}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.default',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" component="h3">
            {title}
          </Typography>
          {hasUnsavedChanges && (
            <Chip 
              label={saving ? "Saving..." : "Unsaved"} 
              size="small" 
              color={saving ? "info" : "warning"}
              variant="outlined"
            />
          )}
        </Box>
        
        {!readOnly && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant={isEditing ? "contained" : "outlined"}
              startIcon={<EditIcon />}
              onClick={toggleEdit}
              disabled={saving}
            >
              {isEditing ? 'Editing' : 'Edit'}
            </Button>
          </Box>
        )}
      </Box>

      {/* Search Bar */}
      <Box sx={{ p: 2, pb: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search in text..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={clearSearch}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Content Area */}
      <Box sx={{ 
        flex: 1, 
        p: 2, 
        pt: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {!readOnly && isEditing ? (
          // Editable text area - with clean content
          <TextField
            fullWidth
            multiline
            variant="outlined"
            value={getCleanContent()}
            onChange={handleContentChange}
            placeholder="Enter text here..."
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                height: '100%',
                alignItems: 'flex-start',
              },
              '& .MuiOutlinedInput-input': {
                height: '100% !important',
                overflow: 'auto !important',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                padding: '12px',
              },
            }}
            disabled={saving}
          />
        ) : (
          // Read-only formatted text display (default view) - already cleaned by FormattedTextRenderer
          <Box sx={{ 
            flex: 1,
            overflow: 'auto',
            p: 1,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            bgcolor: readOnly ? 'background.paper' : 'grey.50',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap'
          }}>
            <FormattedTextRenderer 
              rawText={content} 
              formattedTextJson={formattedContent}
              searchTerm={searchTerm}
            />
          </Box>
        )}
      </Box>

      {/* Footer with text info */}
      <Box sx={{ 
        p: 1, 
        px: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.default'
      }}>
        <Typography variant="caption" color="textSecondary">
          {content ? `${getCleanContent().length} characters (${content.length} raw)` : 'No content'}
          {!readOnly && hasUnsavedChanges && (
            <span style={{ color: theme.palette.warning.main, marginLeft: 8 }}>
              • {saving ? 'Saving changes...' : 'Has unsaved changes'}
            </span>
          )}
          {!readOnly && !isEditing && (
            <span style={{ color: theme.palette.info.main, marginLeft: 8 }}>
              • Click "Edit" to modify text
            </span>
          )}
        </Typography>
      </Box>
    </Paper>
  );
});

DocumentPanel.displayName = 'DocumentPanel';

export default DocumentPanel; 