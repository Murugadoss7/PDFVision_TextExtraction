import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PDFContextProvider } from './contexts/PDFContext';
import { ThemeProvider } from './contexts/ThemeContext';
import HomePage from './components/HomePage';
import ViewerPage from './components/PDFViewer/ViewerPage';
import CorrectionDocumentUpload from './components/CorrectionWorkflow/CorrectionDocumentUpload';
import ComparisonView from './components/CorrectionWorkflow/ComparisonView';
import { Box } from '@mui/material';

function App() {
  return (
    <ThemeProvider>
      <PDFContextProvider>
        <BrowserRouter>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/viewer/:documentId" element={<ViewerPage />} />
              <Route path="/correction/:documentId/upload" element={<CorrectionDocumentUpload />} />
              <Route path="/correction/:documentId/compare" element={<ComparisonView />} />
            </Routes>
          </Box>
        </BrowserRouter>
      </PDFContextProvider>
    </ThemeProvider>
  );
}

export default App; 