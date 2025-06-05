import { createContext, useState, useContext, useCallback, useRef, useEffect } from 'react';
import {
  uploadPdf as apiUploadPdf, // Renamed to avoid conflict
  getDocuments as apiGetDocuments, // Assuming you might want this later
  getDocumentDetails as apiGetDocumentDetails,
  getExtractedText as apiGetExtractedText,
  // checkExtractionStatus as apiCheckExtractionStatus, // If you have this in api.js
  downloadDocumentAsWord as apiDownloadDocumentAsWord
  // Import correction API functions if they need to be called from context, though often called from components directly
} from '../services/api'; // Assuming api.js is in services directory

// Create context
const PDFContext = createContext();

// Custom hook for using the context
export const usePDFContext = () => useContext(PDFContext);

// Provider component
export const PDFContextProvider = ({ children }) => {
  const [currentDocument, setCurrentDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [extractedText, setExtractedText] = useState({});
  const [formattedText, setFormattedText] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // --- State for Interactive OCR Correction ---
  const [documentBId, setDocumentBId] = useState(null); // Stores internal ID or reference for Document B data
  const [documentBCorrectionData, setDocumentBCorrectionData] = useState(null); // { pageNum: text_from_doc_b }
  const [correctedTextPerPage, setCorrectedTextPerPage] = useState({}); // { pageNum: corrected_text_for_doc_a }
  const [comparisonDataCache, setComparisonDataCache] = useState({}); // Cache for { pageNum: {text_a_ocr, text_b_editable_pdf, differences}}
  // --- End State for Interactive OCR Correction ---
  
  // Use ref to access latest state without adding to dependency arrays
  const extractedTextRef = useRef(extractedText);
  
  // Update ref when state changes
  useEffect(() => {
    extractedTextRef.current = extractedText;
  }, [extractedText]);

  // Fetch document details - memoize with useCallback
  const fetchDocumentDetails = useCallback(async (documentId) => {
    setLoading(true);
    setError(null);
    setExtractedText({});
    setFormattedText({});
    try {
      const response = await apiGetDocumentDetails(documentId);
      setCurrentDocument(response.data);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      console.error('Error fetching document details:', error);
      setError(`Failed to load document details: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch page text - memoize with useCallback and use ref instead of state in dependencies
  const fetchPageText = useCallback(async (documentId, pageNumber, forceRefresh = false) => {
    if (!forceRefresh && extractedTextRef.current[pageNumber]) return;
    setLoading(true);
    try {
      const response = await apiGetExtractedText(documentId, pageNumber);
      setExtractedText(prev => ({
        ...prev,
        [pageNumber]: response.data.text || '' // Raw text content
      }));
      setFormattedText(prev => ({
        ...prev,
        [pageNumber]: response.data.formatted_text || null // Formatted text JSON
      }));
    } catch (error) {
      console.error('Error fetching page text:', error);
      setError(`Failed to load page text: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check extraction status - memoize with useCallback
  const checkExtractionStatus = useCallback(async (documentId) => {
    setLoading(true);
    setError(null);
    try {
      // Assuming you have an endpoint like /documents/{documentId}/extraction-status
      // const response = await apiClient.get(`/documents/${documentId}/extraction-status`);
      // For now, this is a placeholder as it was not fully defined in api.js or task plan for direct context use.
      // This might be handled within component logic or specific flows.
      // const response = await apiCheckExtractionStatus(documentId); // if defined in api.js
      // return response.data;
      console.warn("checkExtractionStatus in PDFContext is a placeholder and needs an API endpoint.")
      return { status: 'unknown' }; // Placeholder response
    } catch (error) {
      console.error('Error checking extraction status:', error);
      setError('Failed to check extraction status');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload PDF document - memoize with useCallback
  const uploadDocument = useCallback(async (file, onProgress) => {
    // This now directly calls the service from api.js
    // The onProgress callback for axios is slightly different if directly using apiClient.post
    // The apiUploadPdf in api.js already handles FormData and onUploadProgress for axios
    setLoading(true);
    setError(null);
    try {
      const response = await apiUploadPdf(file, (progressEvent) => {
        if (progressEvent.lengthComputable && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      });
      // Assuming the response from apiUploadPdf is the { document_id, ... } object
      // If it's wrapped in `data` by axios, it would be response.data
      // The api.js uses apiClient which returns response.data directly for typical operations.
      // Let's assume apiUploadPdf returns response.data directly for the main content.
      // If apiUploadPdf returns the full axios response, you would access response.data.document_id
      // Based on current api.js, it returns the full response, so response.data is correct.
      setCurrentDocument({ id: response.data.document_id, filename: file.name, total_pages: response.data.total_pages });
      setTotalPages(response.data.total_pages);
      return response.data; // Return the data part of the response for the caller
    } catch (error) {
      console.error('Error uploading document via context:', error);
      setError(`Upload failed: ${error.response?.data?.detail || error.message}`);
      throw error; // Re-throw for component to handle
    } finally {
      setLoading(false);
    }
  }, [setCurrentDocument, setTotalPages, setLoading, setError]); // Added dependencies

  // Export document to Word - memoize with useCallback
  const exportDocumentToWord = useCallback(async (documentId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiDownloadDocumentAsWord(documentId);
      // Trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // Extract filename from content-disposition header if available, otherwise use a default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `document_${documentId}.docx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"])(.*?)\2|[^;\n]*)/i);
        if (filenameMatch && filenameMatch[3]) {
          filename = filenameMatch[3];
        }
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Error exporting document to Word:', error);
      setError(`Failed to export document: ${error.response?.data?.detail || error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Functions for Interactive OCR Correction ---
  const loadComparisonDataForPage = useCallback(async (docId, pageNum, apiGetPageComparisonData) => {
    if (comparisonDataCache[`${docId}-${pageNum}`]) {
      return comparisonDataCache[`${docId}-${pageNum}`];
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiGetPageComparisonData(docId, pageNum);
      setComparisonDataCache(prev => ({...prev, [`${docId}-${pageNum}`]: response.data }));
      // Update correctedTextPerPage with OCR text if not already set for this page
      setCorrectedTextPerPage(prev => ({
        ...prev,
        [pageNum]: prev[pageNum] === undefined ? (response.data.text_a_ocr || '') : prev[pageNum]
      }));
      return response.data;
    } catch (err) {
      console.error('Error fetching comparison data:', err);
      setError(`Failed to load comparison data for page ${pageNum}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [comparisonDataCache]); // dependency on comparisonDataCache to avoid stale closures

  const updateCorrectedTextForPage = useCallback((pageNum, text) => {
    setCorrectedTextPerPage(prev => ({ ...prev, [pageNum]: text }));
  }, []);
  
  const clearCorrectionState = useCallback(() => {
    setDocumentBId(null);
    setDocumentBCorrectionData(null);
    setCorrectedTextPerPage({});
    setComparisonDataCache({});
    // Keep currentDocument (Doc A) as it might still be relevant
  }, []);

  // Invalidate cached text for a specific page (useful after corrections)
  const invalidatePageTextCache = useCallback((pageNumber) => {
    setExtractedText(prev => {
      const updated = { ...prev };
      delete updated[pageNumber];
      return updated;
    });
    setFormattedText(prev => {
      const updated = { ...prev };
      delete updated[pageNumber];
      return updated;
    });
  }, []);

  // Force refresh page text (bypasses cache)
  const refreshPageText = useCallback(async (documentId, pageNumber) => {
    return fetchPageText(documentId, pageNumber, true);
  }, [fetchPageText]);
  // --- End Functions for Interactive OCR Correction ---

  const contextValue = {
    currentDocument,
    currentPage,
    totalPages,
    extractedText,
    formattedText,
    loading,
    error,
    setCurrentPage,
    setTotalPages,
    fetchDocumentDetails,
    fetchPageText,
    checkExtractionStatus,
    uploadDocument,
    exportDocumentToWord,
    // Correction workflow state and functions
    documentBId,
    setDocumentBId, 
    documentBCorrectionData, 
    setDocumentBCorrectionData,
    correctedTextPerPage, 
    updateCorrectedTextForPage,
    loadComparisonDataForPage, // Expose the new function
    comparisonDataCache, // Might be useful for advanced components
    clearCorrectionState, // To reset when starting a new correction task
    setCurrentDocument, // Already exists, but ensure it's used for Doc A
    invalidatePageTextCache, // Added new function
    refreshPageText, // Added new function
  };

  return (
    <PDFContext.Provider value={contextValue}>
      {children}
    </PDFContext.Provider>
  );
}; 