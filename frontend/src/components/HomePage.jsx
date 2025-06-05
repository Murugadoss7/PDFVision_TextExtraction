import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  CompareArrows as CompareArrowsIcon
} from '@mui/icons-material';
import PDFUpload from './PDFUpload';
import Header from './UI/Header';
import { useThemeContext } from '../contexts/ThemeContext';
import { getDocuments, deleteDocument as apiDeleteDocument } from '../services/api';

const HomePage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { mode, toggleTheme } = useThemeContext();

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await getDocuments();
        setDocuments(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching documents:', error);
        setError('Failed to load documents. Please try again later.');
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const deleteDocumentHandler = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await apiDeleteDocument(documentId);
      // Remove the document from the list
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document. Please try again later.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Status color mapping
  const getStatusChipProps = (status) => {
    switch (status) {
      case 'completed':
        return { color: 'success', label: 'Completed' };
      case 'error':
        return { color: 'error', label: 'Error' };
      case 'processing':
        return { color: 'info', label: 'Processing' };
      default:
        return { color: 'default', label: status };
    }
  };

  return (
    <>
      <Header 
        isDarkMode={mode === 'dark'} 
        onToggleTheme={toggleTheme}
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          PDF Text Extractor
        </Typography>

        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Upload a New PDF
          </Typography>
          <PDFUpload />
        </Paper>

        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Your Documents
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : documents.length === 0 ? (
            <Alert severity="info">
              No documents found. Upload your first PDF above.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Upload Date</TableCell>
                    <TableCell>Pages</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.map((doc) => {
                    const { color, label } = getStatusChipProps(doc.status);
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>{doc.filename}</TableCell>
                        <TableCell>{formatDate(doc.upload_date)}</TableCell>
                        <TableCell>{doc.total_pages}</TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            color={color} 
                            label={label} 
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton 
                            component={RouterLink} 
                            to={`/viewer/${doc.id}`}
                            color="primary"
                            size="small"
                          >
                            <VisibilityIcon />
                          </IconButton>
                          <Tooltip title="OCR Correction Workflow">
                            <IconButton 
                              component={RouterLink} 
                              to={`/correction/${doc.id}/upload`}
                              color="secondary"
                              size="small"
                            >
                              <CompareArrowsIcon />
                            </IconButton>
                          </Tooltip>
                          <IconButton 
                            onClick={() => deleteDocumentHandler(doc.id)}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Container>
    </>
  );
};

export default HomePage; 