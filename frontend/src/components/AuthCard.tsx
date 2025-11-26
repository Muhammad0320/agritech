'use client';

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { loginAction, registerAction } from '@/actions/auth';
import { Eye, EyeOff } from 'lucide-react';
import ShimmerButton from './ui/ShimmerButton';

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

const PasswordWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px;
  padding-right: ${props => props.type === 'password' || props.name?.includes('password') ? '45px' : '14px'};
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

const ToggleButton = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
  transition: color 0.2s, background 0.2s;
  
  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
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

export default function AuthCard() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('DEPOT_MANAGER');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set('role', role); // Ensure role is passed

    // Validate Confirm Password for Registration
    if (!isLogin) {
      const password = formData.get('password') as string;
      const confirmPassword = formData.get('confirmPassword') as string;

      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        setLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        const result = await loginAction(formData);
        if (result.success) {
          toast.success('Welcome back!');
          
          switch (result.role) {
            case 'DRIVER':
              router.push('/driver');
              break;
            case 'FARMER':
              router.push('/farmer');
              break;
            case 'DEPOT_MANAGER':
              router.push('/dashboard');
              break;
            default:
              toast.error('Unknown role: ' + result.role);
              // Optional: router.push('/');
          }
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
          <PasswordWrapper>
            <Input 
              name="password" 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              required 
            />
            <ToggleButton type="button" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </ToggleButton>
          </PasswordWrapper>
        </InputGroup>

        {!isLogin && (
          <InputGroup>
            <Label>Confirm Password</Label>
            <PasswordWrapper>
              <Input 
                name="confirmPassword" 
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="••••••••" 
                required 
              />
              <ToggleButton type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </ToggleButton>
            </PasswordWrapper>
          </InputGroup>
        )}

        <InputGroup>
          <Label>I am a...</Label>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="DEPOT_MANAGER">Depot Manager</option>
            <option value="DRIVER">Driver</option>
            <option value="FARMER">Farmer</option>
          </Select>
        </InputGroup>

        <ShimmerButton type="submit" isLoading={loading} loadingText="Processing...">
          {isLogin ? 'Login' : 'Create Account'}
        </ShimmerButton>
      </form>
    </Card>
  );
}
