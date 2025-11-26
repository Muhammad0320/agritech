'use client';

import styled from 'styled-components';
import { LogOut } from 'lucide-react';
import { logoutAction } from '@/actions/auth';

const Button = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #94a3b8;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border-color: rgba(255, 255, 255, 0.4);
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
