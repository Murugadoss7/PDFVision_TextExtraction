import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'; // Default to localhost:8000

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// --- Document Upload and Management --- (Existing or to be enhanced)
export const uploadPdf = (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
};

export const getDocuments = () => {
  return apiClient.get('/api/documents/');
};

export const getDocumentDetails = (docId) => {
  return apiClient.get(`/api/documents/${docId}`);
};

export const deleteDocument = (docId) => {
  return apiClient.delete(`/api/documents/${docId}`);
};

export const extractText = (docId) => {
  return apiClient.post(`/api/extract/${docId}`);
};

export const getExtractedText = (docId, pageNumber) => {
  return apiClient.get(`/api/documents/${docId}/pages/${pageNumber}/text`);
};

export const getDocumentPageImage = (docId, pageNumber) => {
  // This might be a direct URL if static files are served, or an API endpoint returning image data
  // Assuming direct URL structure based on typical static file serving with FastAPI
  return `${API_BASE_URL}/extracted/doc_${docId}_page_${pageNumber}.png`; 
};

export const downloadDocumentAsWord = (docId) => {
  return apiClient.get(`/api/documents/${docId}/export/word`, {
    responseType: 'blob', // Important for file downloads
  });
};


// --- Interactive OCR Correction Endpoints --- //

/**
 * Uploads an editable PDF (Document B) for a given primary document (Document A).
 * @param {number} documentId - The ID of the primary document (Document A).
 * @param {File} editablePdfFile - The editable PDF file (Document B).
 * @param {function} onUploadProgress - Optional progress callback.
 * @returns {Promise<AxiosResponse<any>>}
 */
export const uploadEditablePdfForCorrection = (documentId, editablePdfFile, onUploadProgress) => {
  const formData = new FormData();
  formData.append('editable_pdf_file', editablePdfFile);
  return apiClient.post(`/api/correction/documents/${documentId}/editable-pdf`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
};

/**
 * Fetches comparison data (Text A OCR, Text B Editable PDF, and differences) for a specific page.
 * @param {number} documentId - The ID of the document.
 * @param {number} pageNumber - The page number to compare.
 * @returns {Promise<AxiosResponse<any>>}
 */
export const getPageComparisonData = (documentId, pageNumber) => {
  return apiClient.get(`/api/correction/documents/${documentId}/compare/page/${pageNumber}`);
};

/**
 * Submits user corrections for a specific page.
 * @param {number} documentId - The ID of the document.
 * @param {number} pageNumber - The page number for which corrections are submitted.
 * @param {string} correctedTextForPage - The full, user-corrected text for the page.
 * @returns {Promise<AxiosResponse<any>>}
 */
export const submitPageCorrections = (documentId, pageNumber, correctedTextForPage) => {
  const payload = { corrected_text_for_page: correctedTextForPage };
  return apiClient.post(`/api/correction/documents/${documentId}/corrections/page/${pageNumber}`, payload);
};

/**
 * Retrieves the final, fully corrected text for a document.
 * @param {number} documentId - The ID of the document.
 * @returns {Promise<AxiosResponse<any>>}
 */
export const getFinalCorrectedText = (documentId) => {
  return apiClient.get(`/api/correction/documents/${documentId}/corrected-text`);
};

/**
 * Marks the document correction process as finalized on the backend.
 * @param {number} documentId - The ID of the document.
 * @returns {Promise<AxiosResponse<any>>}
 */
export const finalizeDocumentCorrection = (documentId) => {
  return apiClient.post(`/api/correction/documents/${documentId}/finalize`);
};

// Potentially, the download endpoint needs to be aware of corrected text.
// If the existing downloadDocumentAsWord is modified on backend to serve corrected text if available,
// no change is needed here. Otherwise, a new specific download function might be required.
// For now, assuming backend handles it.

export default apiClient; 