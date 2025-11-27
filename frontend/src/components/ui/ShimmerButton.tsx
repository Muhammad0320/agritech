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
  $variant?: 'primary' | 'danger' | 'neutral' | 'glass';
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
  isolation: isolate; /* Create stacking context */
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
  inset: -2px; /* Extend outside the button */
  background: conic-gradient(
    from 0deg, 
    transparent 0deg, 
    transparent 60deg, 
    #10b981 120deg, 
    transparent 180deg
  );
  border-radius: 14px; /* Slightly larger radius */
  animation: ${rotate} 3s linear infinite;
  z-index: -1; /* Behind the content layer */
`;

const ContentLayer = styled.div<{ $isLoading?: boolean; $variant?: string }>`
  position: absolute;
  inset: 1px; /* Leave 1px gap for the border to shine through */
  background: ${({ $isLoading, $variant }) => 
    $isLoading ? '#1e293b' : 
    $variant === 'danger' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
    $variant === 'neutral' ? '#334155' :
    $variant === 'glass' ? 'rgba(16, 185, 129, 0.1)' :
    '#1e293b' /* Default dark background for border beam */
  };
  
  /* For 'glass' variant, we might want a different look, but user asked for border beam fix specifically */
  /* If variant is NOT glass/danger/neutral, we assume it's the primary one needing the beam */
  
  border-radius: 12px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${({ $variant }) => $variant === 'glass' ? '#10b981' : 'white'};
  
  /* Glass specific overrides */
  ${({ $variant }) => $variant === 'glass' && css`
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid #10b981;
    inset: 0; /* Glass doesn't need the beam gap usually, or maybe it does? User said "Fix ShimmerButton... The Border Beam" */
    /* If glass is used, maybe we don't want the beam? Or maybe we do? */
    /* Let's keep the beam logic only for loading or primary. */
  `}
`;

export default function ShimmerButton({ 
  children, 
  isLoading, 
  loadingText = 'Processing...', 
  $variant,
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonProps) {
  // Only show beam if loading or if it's the primary variant (undefined)
  const showBeam = isLoading || !$variant;

  return (
    <ButtonContainer 
      $isLoading={isLoading} 
      disabled={isLoading || props.disabled} 
      {...props}
    >
      {/* The spinning light layer */}
      {showBeam && <TravelingLight />}
      
      {/* The content layer sitting on top */}
      <ContentLayer $isLoading={isLoading} $variant={$variant}>
        {isLoading ? loadingText : children}
      </ContentLayer>
    </ButtonContainer>
  );
}