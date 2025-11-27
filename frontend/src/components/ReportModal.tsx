'use client';

import { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { X, Sparkles, Copy, Check } from 'lucide-react';

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.8); /* Darker, more serious backdrop */
  backdrop-filter: blur(8px); /* Stronger blur */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContainer = styled.div`
  background: rgba(30, 41, 59, 0.95);
  width: 100%;
  max-width: 800px;
  max-height: 85vh;
  border-radius: 20px;
  /* The "AI Glow" Border */
  border: 1px solid rgba(16, 185, 129, 0.3);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 30px rgba(16, 185, 129, 0.1); /* Subtle Green Glow */
  animation: ${fadeIn} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to right, rgba(16, 185, 129, 0.1), transparent);
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 12px;
  letter-spacing: -0.02em;

  svg {
    color: #10b981; /* Agri-Green Icon */
  }
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const IconButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border-color: rgba(16, 185, 129, 0.3);
  }
`;

const Content = styled.div`
  padding: 32px;
  overflow-y: auto;
  color: #cbd5e1;
  font-family: 'Inter', system-ui, sans-serif; /* Clean, modern font */
  line-height: 1.7;
  font-size: 1rem;

  /* Custom Scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 3px;
  }

  /* Typography Styling */
  h1 {
    font-size: 1.5rem;
    color: #fff;
    font-weight: 700;
    margin-bottom: 24px;
    letter-spacing: -0.02em;
  }

  h2 {
    font-size: 1.1rem;
    color: #10b981; /* Green Subheaders */
    font-weight: 600;
    margin-top: 32px;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 8px;

    &::before {
      content: '';
      display: block;
      width: 4px;
      height: 16px;
      background: #10b981;
      border-radius: 2px;
    }
  }

  strong {
    color: #fff;
    font-weight: 600;
  }

  p {
    margin-bottom: 12px;
  }

  ul {
    margin-bottom: 20px;
  }

  li {
    margin-bottom: 8px;
    padding-left: 12px;
    border-left: 2px solid #334155;
    margin-left: 4px;
  }
`;

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: string;
}

export default function ReportModal({ isOpen, onClose, report }: ReportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Improved parser to handle bold text (**text**)
  const parseLine = (line: string, index: number) => {
    // Helper to replace **text** with <strong>text</strong>
    const renderText = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    if (line.startsWith('# ')) return <h1 key={index}>{renderText(line.replace('# ', ''))}</h1>;
    if (line.startsWith('## ')) return <h2 key={index}>{renderText(line.replace('## ', ''))}</h2>;
    if (line.startsWith('* ') || line.startsWith('- ')) {
      return <li key={index}>{renderText(line.replace(/^[\*\-] /, ''))}</li>;
    }
    if (line.trim() === '') return <br key={index} />;
    
    return <p key={index}>{renderText(line)}</p>;
  };

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={e => e.stopPropagation()}>
        <Header>
          <Title>
            <Sparkles size={20} />
            Logistics Intelligence Briefing
          </Title>
          <ActionGroup>
            <IconButton onClick={handleCopy} title="Copy Report">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </IconButton>
            <IconButton onClick={onClose} title="Close">
              <X size={18} />
            </IconButton>
          </ActionGroup>
        </Header>
        <Content>
           {report.split('\n').map((line, i) => parseLine(line, i))}
        </Content>
      </ModalContainer>
    </Overlay>
  );
}