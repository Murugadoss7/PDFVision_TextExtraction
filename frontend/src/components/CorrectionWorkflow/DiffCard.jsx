import React, { useState } from 'react';
import { Card, CardContent, Typography, Button, Box, Chip, Collapse, IconButton, Tooltip } from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon, 
  BugReport as BugReportIcon,
  Check as ApplyIcon,
  Clear as IgnoreIcon,
  Undo as RevertIcon
} from '@mui/icons-material';

const DiffCard = ({ 
  diff, 
  index, 
  onHighlight, 
  onApply, 
  onIgnore, 
  isApplied, 
  isIgnored 
}) => {
  const [showDebug, setShowDebug] = useState(false);

  const stripHtmlTags = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
  };

  const originalText = stripHtmlTags(diff.word_a || diff.original_text_a_segment || '');
  const suggestedText = stripHtmlTags(diff.word_b || diff.suggested_text_b_segment || '');

  // Debug function to show character-by-character analysis
  const getCharacterAnalysis = (text) => {
    if (!text) return { chars: [], length: 0, ascii: [] };
    return {
      chars: text.split(''),
      length: text.length,
      ascii: text.split('').map(char => char.charCodeAt(0)),
      hex: text.split('').map(char => char.charCodeAt(0).toString(16).padStart(2, '0')),
      escaped: JSON.stringify(text)
    };
  };

  const originalAnalysis = getCharacterAnalysis(originalText);
  const suggestedAnalysis = getCharacterAnalysis(suggestedText);

  // Categorize the type of difference
  const categorizeError = (original, suggested, type) => {
    if (!original && !suggested) return { category: 'unknown', description: 'Unknown Error' };
    
    const orig = original.toLowerCase().trim();
    const sugg = suggested.toLowerCase().trim();
    
    // Check for exact match (this should help debug why they're flagged as different)
    if (orig === sugg) {
      return { category: 'false-positive', description: 'False Positive (Identical Text)' };
    }
    
    if (type === 'insert') {
      return { category: 'missing-text', description: 'Missing Text' };
    }
    
    if (type === 'delete') {
      return { category: 'extra-text', description: 'Extra Text' };
    }
    
    if (type === 'replace') {
      // Character-level similarity
      const similarity = getStringSimilarity(orig, sugg);
      
      if (similarity > 0.8) {
        return { category: 'spelling', description: 'Spelling Error' };
      } else if (orig.length === 1 && sugg.length === 1) {
        return { category: 'character', description: 'Character Error' };
      } else if (orig.includes(sugg) || sugg.includes(orig)) {
        return { category: 'partial-match', description: 'Partial Match' };
      } else if (/[^\w\s]/.test(orig) || /[^\w\s]/.test(sugg)) {
        return { category: 'punctuation', description: 'Punctuation Error' };
      } else if (orig.split('').sort().join('') === sugg.split('').sort().join('')) {
        return { category: 'transposition', description: 'Letter Transposition' };
      } else {
        return { category: 'word-substitution', description: 'Word Substitution' };
      }
    }
    
    return { category: 'text-error', description: 'Text Error' };
  };

  // Simple string similarity function
  const getStringSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  // Levenshtein distance calculation
  const getEditDistance = (str1, str2) => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const errorInfo = categorizeError(originalText, suggestedText, diff.type);
  const similarity = getStringSimilarity(originalText.toLowerCase(), suggestedText.toLowerCase());

  const getCardStyle = () => {
    if (isApplied) return { backgroundColor: '#e8f5e8', borderLeft: '4px solid #4caf50' };
    if (isIgnored) return { backgroundColor: '#f5f5f5', borderLeft: '4px solid #9e9e9e', opacity: 0.7 };
    return { backgroundColor: '#fff', borderLeft: '4px solid #2196f3' };
  };

  const getTypeChipColor = () => {
    switch (errorInfo.category) {
      case 'false-positive': return 'default';
      case 'spelling': return 'warning';
      case 'missing-text': return 'success';
      case 'extra-text': return 'error';
      case 'character': return 'info';
      case 'punctuation': return 'secondary';
      case 'transposition': return 'warning';
      case 'word-substitution': return 'error';
      case 'partial-match': return 'info';
      default: return 'default';
    }
  };

  const getConfidenceLevel = () => {
    if (similarity > 0.9) return 'High';
    if (similarity > 0.7) return 'Medium';
    return 'Low';
  };

  const getConfidenceExplanation = () => {
    const percentage = Math.round(similarity * 100);
    return `${percentage}% similar - Based on character-level comparison using edit distance algorithm`;
  };

  // Handle revert action (remove from both applied and ignored)
  const handleRevert = () => {
    onIgnore(); // This will trigger the logic to remove from ignored/applied states
  };

  return (
    <Card 
      sx={{ 
        mb: 1, 
        ...getCardStyle(),
        cursor: 'pointer',
        '&:hover': { 
          backgroundColor: isApplied ? '#e8f5e8' : isIgnored ? '#eeeeee' : '#f0f7ff',
          opacity: isIgnored ? 0.8 : 1
        }
      }}
      onClick={() => onHighlight(diff)}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Header with error type and actions */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box display="flex" gap={0.5} alignItems="center" flex={1}>
            <Chip 
              label={isIgnored ? "IGNORED" : errorInfo.description} 
              color={isIgnored ? "default" : getTypeChipColor()}
              size="small"
              variant={isIgnored ? "filled" : "outlined"}
              sx={{ 
                fontSize: '0.65rem', 
                height: '20px',
                backgroundColor: isIgnored ? '#9e9e9e' : undefined,
                color: isIgnored ? 'white' : undefined
              }}
            />
            {!isIgnored && (
              <Chip 
                label={`${getConfidenceLevel()} Confidence`}
                size="small"
                variant="filled"
                title={getConfidenceExplanation()}
                sx={{ 
                  fontSize: '0.6rem',
                  height: '18px',
                  backgroundColor: getConfidenceLevel() === 'High' ? '#4caf50' : 
                                 getConfidenceLevel() === 'Medium' ? '#ff9800' : '#f44336',
                  color: 'white'
                }}
              />
            )}
            <IconButton 
              size="small" 
              onClick={(e) => { e.stopPropagation(); setShowDebug(!showDebug); }}
              title="Show debug information"
              sx={{ minWidth: 24, height: 24 }}
            >
              <BugReportIcon fontSize="small" />
            </IconButton>
          </Box>
          
          {/* Action Buttons - Different for ignored vs normal state */}
          <Box display="flex" gap={0.5}>
            {isIgnored ? (
              // Show only revert button for ignored cards
              <Tooltip title="Revert ignore (make available again)">
                <IconButton 
                  size="small" 
                  onClick={(e) => { e.stopPropagation(); handleRevert(); }}
                  sx={{ 
                    minWidth: 28,
                    height: 28,
                    bgcolor: 'warning.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'warning.dark' }
                  }}
                >
                  <RevertIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              // Show apply and ignore buttons for normal cards
              <>
                <Tooltip title={isApplied ? "Already Applied" : "Apply this change"}>
                  <span>
                    <IconButton 
                      size="small" 
                      onClick={(e) => { e.stopPropagation(); onApply(); }}
                      disabled={isApplied}
                      sx={{ 
                        minWidth: 28,
                        height: 28,
                        bgcolor: isApplied ? 'success.light' : 'primary.main',
                        color: 'white',
                        '&:hover': { 
                          bgcolor: isApplied ? 'success.light' : 'primary.dark' 
                        },
                        '&:disabled': {
                          bgcolor: 'success.light',
                          color: 'white'
                        }
                      }}
                    >
                      <ApplyIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Ignore this change">
                  <IconButton 
                    size="small" 
                    onClick={(e) => { e.stopPropagation(); onIgnore(); }}
                    sx={{ 
                      minWidth: 28,
                      height: 28,
                      bgcolor: 'grey.300',
                      '&:hover': { bgcolor: 'grey.500' }
                    }}
                  >
                    <IgnoreIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>

        {/* Show text content for all cards (including ignored) */}
        {/* Original text */}
        {originalText && (
          <Box mb={1}>
            <Typography variant="caption" color="textSecondary">
              Original:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                backgroundColor: isIgnored ? '#f0f0f0' : '#ffebee', 
                p: 0.5, 
                borderRadius: 1,
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                textDecoration: diff.type === 'delete' ? 'line-through' : 'none',
                border: isIgnored ? '1px solid #bdbdbd' : '1px solid #ffcdd2',
                opacity: isIgnored ? 0.8 : 1
              }}
            >
              "{originalText}"
            </Typography>
          </Box>
        )}

        {/* Suggested text */}
        {suggestedText && (
          <Box mb={1}>
            <Typography variant="caption" color="textSecondary">
              Suggested:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                backgroundColor: isIgnored ? '#f0f0f0' : '#e8f5e8', 
                p: 0.5, 
                borderRadius: 1,
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                border: isIgnored ? '1px solid #bdbdbd' : '1px solid #c8e6c9',
                opacity: isIgnored ? 0.8 : 1
              }}
            >
              "{suggestedText}"
            </Typography>
          </Box>
        )}

        {/* Debug Information */}
        <Collapse in={showDebug}>
          <Box sx={{ mt: 2, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
              Debug Information:
            </Typography>
            
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
              <strong>Similarity:</strong> {Math.round(similarity * 100)}% ({getConfidenceLevel()})
            </Typography>
            
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
              <strong>Original:</strong> Length: {originalAnalysis.length}, 
              ASCII: [{originalAnalysis.ascii.join(', ')}]
            </Typography>
            
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
              <strong>Suggested:</strong> Length: {suggestedAnalysis.length}, 
              ASCII: [{suggestedAnalysis.ascii.join(', ')}]
            </Typography>
            
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
              <strong>Original Escaped:</strong> {originalAnalysis.escaped}
            </Typography>
            
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
              <strong>Suggested Escaped:</strong> {suggestedAnalysis.escaped}
            </Typography>
            
            {originalText === suggestedText && (
              <Typography variant="caption" sx={{ display: 'block', color: 'red', fontWeight: 'bold' }}>
                ⚠️ Texts are identical - this might be a false positive!
              </Typography>
            )}
          </Box>
        </Collapse>

        {/* Additional context */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
          <Typography variant="caption" color="textSecondary">
            Position: {diff.a_start_index || 0}-{diff.a_end_index || 0}
          </Typography>
          <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>
            {diff.type?.toUpperCase()} operation
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DiffCard; 