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
  isLoading?: boolean; // External prop (React warning fix is below)
  loadingText?: string;
  $variant?: 'primary' | 'danger' | 'neutral';
}

// Note: We use $isLoading here (Transient Prop) so it doesn't pass to DOM
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

  /* --- NORMAL STATE COLORS --- */
  background: ${({ $variant }) => 
    $variant === 'danger' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
    $variant === 'neutral' ? '#334155' :
    'linear-gradient(135deg, #10b981 0%, #059669 100%)' // Green Default
  };

  /* --- LOADING STATE (The NotebookLM Effect) --- */
  ${({ $isLoading }) => $isLoading && css`
    cursor: wait; /* distinct from not-allowed */
    
    /* THE FIX: Green Shimmer, not Grey */
    background: linear-gradient(
      45deg,
      #059669 25%,   /* Darker Green */
      #34d399 50%,   /* Bright Emerald Light */
      #059669 75%    /* Darker Green */
    );
    
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s infinite linear;
    
    /* Ensure text stays bright white */
    color: #ffffff;
    text-shadow: 0 1px 2px rgba(0,0,0,0.1);
  `}

  &:active {
    transform: ${({ $isLoading }) => $isLoading ? 'none' : 'scale(0.98)'};
  }

  &:disabled {
    /* Ensure opacity stays 100% when loading so it looks 'Alive' */
    opacity: ${({ $isLoading }) => $isLoading ? 1 : 0.7};
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
      $isLoading={isLoading} // Pass with $ so React doesn't warn
      disabled={isLoading || props.disabled} 
      {...props}
    >
      {isLoading ? loadingText : children}
    </StyledButton>
  );
}