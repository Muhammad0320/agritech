'use client';

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { X } from 'lucide-react';

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  background: #1e293b;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  animation: ${fadeIn} 0.3s ease-out;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0f172a;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  gap: 10px;
  
  &::before {
    content: '🤖';
    font-size: 1.5rem;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;

const Content = styled.div`
  padding: 32px;
  overflow-y: auto;
  color: #e2e8f0;
  font-family: 'Courier New', monospace; // Typewriter feel
  line-height: 1.6;
  white-space: pre-wrap;

  h1 {
    font-size: 1.8rem;
    color: #10b981;
    margin-bottom: 16px;
    border-bottom: 2px solid #10b981;
    padding-bottom: 8px;
  }

  h2 {
    font-size: 1.4rem;
    color: #38bdf8;
    margin-top: 24px;
    margin-bottom: 12px;
  }

  strong {
    color: white;
    font-weight: 700;
  }

  ul {
    margin-left: 20px;
    margin-bottom: 16px;
  }

  li {
    margin-bottom: 8px;
  }
`;

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: string;
}

export default function ReportModal({ isOpen, onClose, report }: ReportModalProps) {
  if (!isOpen) return null;

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={e => e.stopPropagation()}>
        <Header>
          <Title>AI Intelligence Report</Title>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </Header>
        <Content>
           {/* Simple markdown rendering replacement since we don't have react-markdown yet */}
           {report.split('\n').map((line, i) => {
             if (line.startsWith('# ')) return <h1 key={i}>{line.replace('# ', '')}</h1>;
             if (line.startsWith('## ')) return <h2 key={i}>{line.replace('## ', '')}</h2>;
             if (line.startsWith('* ')) return <li key={i}>{line.replace('* ', '')}</li>;
             return <div key={i}>{line}</div>;
           })}
        </Content>
      </ModalContainer>
    </Overlay>
  );
}
