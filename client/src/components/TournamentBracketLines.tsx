import { Box, useTheme } from '@mui/material';
import React from 'react';

export interface BracketLine {
  from: { x: number; y: number };
  to: { x: number; y: number };
  intermediate?: { x: number; y: number };
}

interface TournamentBracketLinesProps {
  lines: BracketLine[];
  containerWidth: number;
  containerHeight: number;
}

const TournamentBracketLines: React.FC<TournamentBracketLinesProps> = ({
  lines,
  containerWidth,
  containerHeight,
}) => {
  const theme = useTheme();
  const lineColor = theme.palette.mode === 'dark'
    ? theme.palette.border.shadow || 'rgba(255, 255, 255, 0.3)'
    : 'rgba(0, 0, 0, 0.4)';
  const strokeWidth = 2;

  if (lines.length === 0 || containerWidth === 0 || containerHeight === 0) {
    return null;
  }

  return (
    <Box
      component="svg"
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      viewBox={`0 0 ${containerWidth} ${containerHeight}`}
      preserveAspectRatio="none"
    >
      {lines.map((line, index) => {
        if (line.intermediate) {
          // Draw bracket shape: vertical from source, horizontal connection, vertical to destination
          const path = `M ${line.from.x} ${line.from.y} 
                       L ${line.from.x} ${line.intermediate.y} 
                       L ${line.to.x} ${line.intermediate.y} 
                       L ${line.to.x} ${line.to.y}`;
          
          return (
            <path
              key={index}
              d={path}
              fill="none"
              stroke={lineColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        } else {
          // Simple straight line
          return (
            <line
              key={index}
              x1={line.from.x}
              y1={line.from.y}
              x2={line.to.x}
              y2={line.to.y}
              stroke={lineColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          );
        }
      })}
    </Box>
  );
};

export default TournamentBracketLines;
