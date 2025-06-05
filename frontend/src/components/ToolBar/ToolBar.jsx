import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiHome, FiChevronLeft, FiChevronRight, FiDownload } from 'react-icons/fi';
import { usePDFContext } from '../../contexts/PDFContext';

const ToolBar = ({ currentPage, totalPages, onPageChange }) => {
  const [pageInput, setPageInput] = useState(currentPage);
  const { documentId } = useParams();
  const { exportDocumentToWord } = usePDFContext();
  const [exporting, setExporting] = useState(false);

  const handlePageInputChange = (e) => {
    setPageInput(e.target.value);
  };

  const handlePageSubmit = (e) => {
    e.preventDefault();
    const pageNumber = parseInt(pageInput, 10);
    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
      // Reset to current page if invalid
      setPageInput(currentPage);
      return;
    }
    
    onPageChange(pageNumber);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
      setPageInput(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
      setPageInput(currentPage + 1);
    }
  };

  const handleExport = async () => {
    if (!documentId || exporting) return;
    
    setExporting(true);
    try {
      await exportDocumentToWord(documentId);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b">
      <div>
        <Link 
          to="/" 
          className="flex items-center gap-1 px-3 py-1 bg-white rounded border hover:bg-gray-50"
        >
          <FiHome size={16} />
          <span>Home</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handlePreviousPage}
          disabled={currentPage <= 1}
          className="p-1 rounded border bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
          aria-label="Previous page"
        >
          <FiChevronLeft size={20} />
        </button>

        <form onSubmit={handlePageSubmit} className="flex items-center">
          <input
            type="text"
            value={pageInput}
            onChange={handlePageInputChange}
            className="w-12 py-1 px-2 border rounded text-center"
            aria-label="Page number"
          />
          <span className="mx-1">of {totalPages}</span>
        </form>

        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className="p-1 rounded border bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
          aria-label="Next page"
        >
          <FiChevronRight size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1 px-3 py-1 bg-white rounded border hover:bg-gray-50 disabled:bg-gray-200"
        >
          <FiDownload size={16} />
          <span>{exporting ? 'Exporting...' : 'Export to Word'}</span>
        </button>
      </div>
    </div>
  );
};

export default ToolBar; 