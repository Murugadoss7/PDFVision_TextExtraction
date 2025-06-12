/**
 * Utility functions for string manipulation.
 */

/**
 * Strips HTML tags from a string and decodes common HTML entities.
 * @param {string} htmlString The HTML string to clean.
 * @returns {string} The cleaned text string.
 */
export const stripHtmlTags = (htmlString) => {
  if (!htmlString) return '';
  
  // A DOM-based approach is more robust for parsing HTML
  const doc = new DOMParser().parseFromString(htmlString, 'text/html');
  const textContent = doc.body.textContent || "";
  
  // Normalize whitespace: replace multiple spaces/newlines with single spaces
  // and trim leading/trailing whitespace
  return textContent
    .replace(/\s+/g, ' ')  // Replace multiple whitespace chars with single space
    .trim();               // Remove leading/trailing whitespace
}; 