import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  TextField, 
  InputAdornment,
  useTheme,
  Box
} from '@mui/material';
import { 
  Search as SearchIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Upload as UploadIcon,
  Article as ArticleIcon,
  CompareArrows as CompareArrowsIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

const Header = ({ 
  onSearchChange, 
  searchQuery = '', 
  onToggleTheme = () => {}, 
  isDarkMode = false,
  documentId = null 
}) => {
  const theme = useTheme();

  return (
    <AppBar position="static" color="primary" elevation={4}>
      <Toolbar>
        {/* App Logo and Title */}
        <IconButton 
          edge="start" 
          component={RouterLink}
          to="/"
          color="inherit"
          sx={{ mr: 1 }}
        >
          <ArticleIcon />
        </IconButton>
        <Typography 
          variant="h6" 
          component={RouterLink} 
          to="/" 
          sx={{ 
            flexGrow: 0, 
            textDecoration: 'none', 
            color: 'inherit',
            mr: 4
          }}
        >
          PDF Text Extractor
        </Typography>

        {/* Search Bar */}
        {onSearchChange && (
          <TextField
            placeholder="Search text..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            size="small"
            variant="outlined"
            sx={{
              flexGrow: 1,
              mr: 2,
              backgroundColor: theme.palette.background.paper,
              borderRadius: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Theme Toggle */}
          <IconButton 
            color="inherit" 
            onClick={onToggleTheme}
            sx={{ ml: 1 }}
          >
            {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          {/* OCR Correction Button - only show when viewing a document */}
          {documentId && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<CompareArrowsIcon />}
              component={RouterLink}
              to={`/correction/${documentId}/upload`}
              sx={{ ml: 2 }}
            >
              OCR Correction
            </Button>
          )}

          {/* Upload Button */}
          <Button
            variant="contained"
            color="secondary"
            startIcon={<UploadIcon />}
            component={RouterLink}
            to="/"
            sx={{ ml: 2 }}
          >
            Upload New
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 