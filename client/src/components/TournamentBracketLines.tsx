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
  // Líneas gruesas y oscuras, estilo llaves de torneo
  const lineColor = theme.palette.mode === 'dark'
    ? '#e0e0e0'
    : '#2c1810';
  const strokeWidth = 10;

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
      {/* eslint-disable react/no-array-index-key -- lines array is stable, index is appropriate */}
      {lines.map((line, index) => {
        if (line.intermediate) {
          // Forma de llave: vertical -> horizontal -> vertical
          const path = `M ${line.from.x} ${line.from.y}
                       L ${line.from.x} ${line.intermediate.y}
                       L ${line.to.x} ${line.intermediate.y}
                       L ${line.to.x} ${line.to.y}`;
          return (
            <path
              key={`path-${index}`}
              d={path}
              fill="none"
              stroke={lineColor}
              strokeWidth={strokeWidth}
              strokeLinecap="square"
              strokeLinejoin="miter"
              vectorEffect="non-scaling-stroke"
            />
          );
        }
        return (
          <line
            key={`line-${index}`}
            x1={line.from.x}
            y1={line.from.y}
            x2={line.to.x}
            y2={line.to.y}
            stroke={lineColor}
            strokeWidth={strokeWidth}
            strokeLinecap="square"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </Box>
  );
};

export default TournamentBracketLines;
