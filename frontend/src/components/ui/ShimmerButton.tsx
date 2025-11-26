'use client';

import styled, { keyframes, css } from 'styled-components';

const spin = keyframes`
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
  $variant?: 'primary' | 'danger' | 'neutral';
}

const StyledButton = styled.button<ButtonProps & { $isLoading?: boolean }>`
  position: relative;
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  background: transparent; /* We use ::after for the background */
  overflow: hidden;
  z-index: 0;
  transition: transform 0.2s;
  height: 56px; /* Fixed height to match inputs */
  display: flex;
  align-items: center;
  justify-content: center;

  /* --- THE TRAVELING BORDER (Loading State) --- */
  ${({ $isLoading }) => $isLoading && css`
    cursor: not-allowed;
    
    /* The Spinning Light */
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 400%; /* Large enough to cover corners */
      height: 400%;
      background: conic-gradient(
        from 0deg, 
        transparent 0%, 
        transparent 20%, 
        #10b981 50%, 
        transparent 80%
      );
      animation: ${spin} 2s linear infinite;
      z-index: -2;
    }
  `}

  /* --- THE INNER BACKGROUND (Solid Slate) --- */
  &::after {
    content: '';
    position: absolute;
    inset: 2px; /* Creates the border width */
    background: ${({ $variant }) => 
      $variant === 'danger' ? '#dc2626' :
      $variant === 'neutral' ? '#334155' :
      '#0f172a' /* Dark Slate for Primary */
    };
    
    /* If NOT loading, we might want a solid gradient or color. 
       But the user specifically asked for this effect for ShimmerButton.
       Let's make the non-loading state look good too. */
    background: ${({ $isLoading, $variant }) => 
      $isLoading ? '#0f172a' : /* Dark center when loading to show border */
      $variant === 'danger' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
      $variant === 'neutral' ? '#334155' :
      'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    };

    border-radius: 10px; /* slightly less than parent */
    z-index: -1;
    transition: background 0.3s;
  }

  /* Text Layer */
  span {
    position: relative;
    z-index: 1;
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: ${({ $isLoading }) => $isLoading ? 1 : 0.7};
    cursor: ${({ $isLoading }) => $isLoading ? 'not-allowed' : 'not-allowed'};
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
      <span>{isLoading ? loadingText : children}</span>
    </StyledButton>
  );
}