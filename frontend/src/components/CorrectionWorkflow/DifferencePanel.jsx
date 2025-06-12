import React, { forwardRef } from 'react';
import { Box, Typography, Button, Paper, IconButton, Tooltip } from '@mui/material';
import { 
  DoneAll as ApplyAllIcon,
  Block as IgnoreAllIcon,
  RestartAlt as ResetIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import DiffCard from './DiffCard';

const DifferencePanel = forwardRef(({ 
  differences, 
  appliedDifferences, 
  ignoredDifferences,
  onHighlight, 
  onApply, 
  onIgnore,
  onApplyAll,
  onIgnoreAll,
  onReset,
  onClearHighlights
}, ref) => {
  const theme = useTheme();
  
  // Filter out 'equal' type differences - only show actual differences
  const filteredDifferences = differences?.filter(diff => diff.type !== 'equal') || [];
  const totalChanges = filteredDifferences.length;
  const appliedCount = appliedDifferences?.length || 0;
  const ignoredCount = ignoredDifferences?.length || 0;
  const pendingCount = totalChanges - appliedCount - ignoredCount;

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
        p: 1.5,
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.default'
      }}>
        <Typography variant="h6" component="h3" sx={{ mb: 1, fontSize: '1rem' }}>
          Differences ({totalChanges})
        </Typography>

        {/* Stats */}
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
          <span style={{ color: '#4caf50' }}>Applied: {appliedCount}</span> • 
          <span style={{ color: '#9e9e9e' }}> Ignored: {ignoredCount}</span> • 
          <span style={{ color: '#2196f3' }}> Pending: {pendingCount}</span>
        </Typography>

        {/* Compact Action Buttons */}
        <Box display="flex" gap={0.5} justifyContent="space-between">
          <Tooltip title={pendingCount === 0 ? "No differences to ignore" : `Ignore ${pendingCount} pending differences`}>
            <span>
              <IconButton 
                size="small"
                onClick={onIgnoreAll}
                disabled={pendingCount === 0}
                sx={{ 
                  bgcolor: pendingCount === 0 ? 'grey.300' : 'grey.100',
                  '&:hover': { bgcolor: pendingCount === 0 ? 'grey.300' : 'grey.200' },
                  minWidth: 32,
                  height: 32,
                  opacity: pendingCount === 0 ? 0.6 : 1
                }}
              >
                <IgnoreAllIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title={pendingCount === 0 ? "No differences to apply" : `Apply ${pendingCount} pending differences`}>
            <span>
              <IconButton 
                size="small"
                onClick={onApplyAll}
                disabled={pendingCount === 0}
                sx={{ 
                  bgcolor: pendingCount === 0 ? 'grey.300' : 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: pendingCount === 0 ? 'grey.300' : 'primary.dark' },
                  minWidth: 32,
                  height: 32,
                  opacity: pendingCount === 0 ? 0.6 : 1
                }}
              >
                <ApplyAllIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title={appliedCount === 0 && ignoredCount === 0 ? "No changes to reset" : `Reset ${appliedCount + ignoredCount} changes`}>
            <span>
              <IconButton 
                size="small"
                onClick={onReset}
                disabled={appliedCount === 0 && ignoredCount === 0}
                sx={{ 
                  bgcolor: (appliedCount === 0 && ignoredCount === 0) ? 'grey.300' : 'warning.light',
                  '&:hover': { bgcolor: (appliedCount === 0 && ignoredCount === 0) ? 'grey.300' : 'warning.main' },
                  minWidth: 32,
                  height: 32,
                  opacity: (appliedCount === 0 && ignoredCount === 0) ? 0.6 : 1
                }}
              >
                <ResetIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Differences List */}
      <Box sx={{ 
        flex: 1,
        overflow: 'auto',
        p: 1
      }}>
        {totalChanges === 0 ? (
          <Typography color="textSecondary" textAlign="center" sx={{ mt: 2 }}>
            No differences found
          </Typography>
        ) : (
          filteredDifferences.map((diff, index) => {
            const isApplied = appliedDifferences.includes(diff.index);
            const isIgnored = ignoredDifferences.includes(diff.index);

            return (
              <DiffCard
                key={diff.index || `${diff.a_start_index}-${diff.a_end_index}-${index}`}
                diff={diff}
                index={index}
                onHighlight={onHighlight}
                onApply={() => onApply(diff.index)}
                onIgnore={() => onIgnore(diff.index)}
                isApplied={isApplied}
                isIgnored={isIgnored}
              />
            );
          })
        )}
      </Box>
    </Paper>
  );
});

DifferencePanel.displayName = 'DifferencePanel';

export default DifferencePanel; 