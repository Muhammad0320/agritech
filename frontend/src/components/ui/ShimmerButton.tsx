'use client';

import React from 'react';
import styled, { keyframes, css } from 'styled-components';

const rotate = keyframes`
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
`;

interface ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
  $variant?: 'primary' | 'danger' | 'neutral' | 'glass';
}

const StyledButton = styled.button<ButtonProps & { $isLoading?: boolean }>`
  position: relative;
  width: 100%;
  height: 56px;
  border: none;
  border-radius: 12px;
  padding: 0;
  cursor: pointer;
  isolation: isolate;
  overflow: hidden;
  z-index: 0;
  transition: transform 0.2s;

  /* Normal State Colors (when not loading) */
  background: ${({ $variant, $isLoading }) => {
    if ($isLoading) return '#1e293b';
    switch ($variant) {
      case 'danger': return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      case 'neutral': return '#334155';
      case 'glass': return 'rgba(16, 185, 129, 0.1)';
      default: return '#10b981'; // Primary Green
    }
  }};

  color: ${({ $variant }) => $variant === 'glass' ? '#10b981' : 'white'};
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;

  /* Glass specific border */
  ${({ $variant }) => $variant === 'glass' && css`
    border: 1px solid #10b981;
  `}

  &:hover {
    transform: translateY(-2px);
    filter: brightness(1.1);
    box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* 2. The Spinner Layer (::before) */
  ${({ $isLoading }) => $isLoading && css`
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 200%;
      height: 200%;
      background: conic-gradient(from 0deg, transparent 0 340deg, #10b981 360deg);
      animation: ${rotate} 2s linear infinite;
      z-index: -2;
    }
  `}

  /* 3. The Mask Layer (::after) */
  ${({ $isLoading }) => $isLoading && css`
    &::after {
      content: '';
      position: absolute;
      inset: 3px;
      background: #1e293b;
      border-radius: 8px; /* slightly less than button radius */
      z-index: -1;
    }
  `}
`;

const ContentSpan = styled.span`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

export default function ShimmerButton({ 
  children, 
  isLoading, 
  loadingText = 'Processing...', 
  $variant,
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonProps) {
  return (
    <StyledButton 
      $isLoading={isLoading} 
      $variant={$variant}
      disabled={isLoading || props.disabled} 
      {...props}
    >
      <ContentSpan>
        {isLoading ? loadingText : children}
      </ContentSpan>
    </StyledButton>
  );
}