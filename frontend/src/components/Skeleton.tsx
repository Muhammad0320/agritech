'use client';

import React from 'react';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const SkeletonBase = styled.div`
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 25%,
    rgba(255, 255, 255, 0.1) 37%,
    rgba(255, 255, 255, 0.05) 63%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite linear;
  border-radius: 4px;
`;

const RowContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 8px;
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
`;

const SkeletonLine = styled(SkeletonBase)<{ $width?: string; $height?: string }>`
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '16px'};
`;

const PulseText = styled.span`
  font-size: 0.875rem;
  color: #94a3b8;
  animation: ${keyframes`
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  `} 2s ease-in-out infinite;
`;

interface LoadingRowProps {
  text: string;
}

export const LoadingRow: React.FC<LoadingRowProps> = ({ text }) => {
  return (
    <RowContainer>
      <SkeletonBase style={{ width: 40, height: 40, borderRadius: '50%' }} />
      <TextContainer>
        <PulseText>{text}</PulseText>
        <SkeletonLine $width="60%" $height="10px" />
      </TextContainer>
    </RowContainer>
  );
};

export default SkeletonBase;
