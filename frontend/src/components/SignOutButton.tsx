'use client';

import styled from 'styled-components';
import { LogOut } from 'lucide-react';
import { logoutAction } from '@/actions/auth';

const Button = styled.button`
  height: 48px;
  min-width: 110px;
  padding: 0 20px;
  background: transparent;
  border: 1px solid #334155;
  color: #94a3b8;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    border-color: #ef4444;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }
`;

export default function SignOutButton() {
  return (
    <Button onClick={() => logoutAction()}>
      <LogOut size={16} />
      Sign Out
    </Button>
  );
}
