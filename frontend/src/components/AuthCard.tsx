'use client';

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { loginAction, registerAction } from '@/actions/auth';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Card = styled.div`
  background: #1e293b;
  padding: 40px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  animation: ${fadeIn} 0.5s ease-out;
`;

const TabGroup = styled.div`
  display: flex;
  background: #0f172a;
  padding: 4px;
  border-radius: 12px;
  margin-bottom: 10px;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: ${props => props.$active ? '#334155' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#94a3b8'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: white;
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 0.9rem;
  color: #94a3b8;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
  color: white;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #10b981;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 14px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
  color: white;
  font-size: 1rem;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: #10b981;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
  margin-top: 10px;

  &:active {
    transform: scale(0.98);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

export default function AuthCard() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('DEPOT_MANAGER');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set('role', role); // Ensure role is passed

    try {
      if (isLogin) {
        const result = await loginAction(formData);
        if (result.success) {
          toast.success('Welcome back!');
          // Redirect handled by action or we do it here?
          // Action can't redirect easily if we want to check role here, 
          // but action has the logic. Let's let action handle it or return url.
          // For now, let's assume action sets cookies and we redirect based on role.
          if (result.role === 'DRIVER') router.push('/driver');
          else router.push('/dashboard');
        } else {
          toast.error(result.error || 'Login Failed');
        }
      } else {
        const result = await registerAction(formData);
        if (result.success) {
          toast.success('Account Created! Please Login.');
          setIsLogin(true);
        } else {
          toast.error(result.error || 'Registration Failed');
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <TabGroup>
        <Tab $active={isLogin} onClick={() => setIsLogin(true)}>Login</Tab>
        <Tab $active={!isLogin} onClick={() => setIsLogin(false)}>Sign Up</Tab>
      </TabGroup>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {!isLogin && (
          <InputGroup>
            <Label>Full Name</Label>
            <Input name="name" type="text" placeholder="John Doe" required />
          </InputGroup>
        )}

        <InputGroup>
          <Label>Email Address</Label>
          <Input name="email" type="email" placeholder="john@agritrack.com" required />
        </InputGroup>

        <InputGroup>
          <Label>Password</Label>
          <Input name="password" type="password" placeholder="••••••••" required />
        </InputGroup>

        <InputGroup>
          <Label>I am a...</Label>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="DEPOT_MANAGER">Depot Manager</option>
            <option value="DRIVER">Driver</option>
          </Select>
        </InputGroup>

        <Button type="submit" disabled={loading}>
          {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
        </Button>
      </form>
    </Card>
  );
}
