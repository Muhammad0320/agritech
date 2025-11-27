'use client';

import styled, { keyframes, css } from 'styled-components';

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

interface ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
  $variant?: 'primary' | 'danger' | 'neutral';
}

const ButtonContainer = styled.button<ButtonProps & { $isLoading?: boolean }>`
  position: relative;
  width: 100%;
  height: 56px;
  border: none;
  border-radius: 12px;
  padding: 0;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.2s;

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const TravelingLight = styled.div`
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    from 0deg, 
    transparent 0%, 
    transparent 20%, 
    #10b981 50%, 
    transparent 80%
  );
  animation: ${rotate} 2s linear infinite;
  z-index: 1;
`;

const ContentLayer = styled.div<{ $isLoading?: boolean }>`
  position: absolute;
  inset: 2px; /* Creates the border width */
  background: #1e293b; /* Dark Slate */
  border-radius: 10px; /* Slightly less than container to match curve */
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
`;

export default function ShimmerButton({ 
  children, 
  isLoading, 
  loadingText = 'Processing...', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonProps) {
  return (
    <ButtonContainer 
      $isLoading={isLoading} 
      disabled={isLoading || props.disabled} 
      {...props}
    >
      {/* The spinning light layer */}
      <TravelingLight />
      
      {/* The content layer sitting on top */}
      <ContentLayer $isLoading={isLoading}>
        {isLoading ? loadingText : children}
      </ContentLayer>
    </ButtonContainer>
  );
}