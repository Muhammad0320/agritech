'use client';

import styled, { keyframes, css } from 'styled-components';

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

interface ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
  $variant?: 'primary' | 'danger' | 'neutral';
}

const StyledButton = styled.button<ButtonProps & { $isLoading?: boolean }>`
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  color: white;
  position: relative;
  overflow: hidden;

  /* Normal State Colors */
  background: ${({ $variant }) => 
    $variant === 'danger' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
    $variant === 'neutral' ? '#334155' :
    'linear-gradient(135deg, #10b981 0%, #059669 100%)' // Primary Default
  };

  /* Loading State */
  ${({ $isLoading }) => $isLoading && css`
    cursor: not-allowed;
    background: linear-gradient(
      45deg,
      #10b981 25%,
      #34d399 50%,
      #10b981 75%
    );
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s infinite linear;
    color: #fff;
  `}

  &:active {
    transform: ${({ $isLoading }) => $isLoading ? 'none' : 'scale(0.98)'};
  }

  &:disabled {
    opacity: ${({ $isLoading }) => $isLoading ? 1 : 0.7};
    cursor: not-allowed;
  }
`;

export default function ShimmerButton({ 
  children, 
  isLoading, 
  loadingText = 'Processing...', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonProps) {
  return (
    <StyledButton 
      $isLoading={isLoading} 
      disabled={isLoading || props.disabled} 
      {...props}
    >
      {isLoading ? loadingText : children}
    </StyledButton>
  );
}