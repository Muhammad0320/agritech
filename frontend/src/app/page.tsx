'use client';

import React from 'react';
import styled from 'styled-components';
import AuthCard from '@/components/AuthCard';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100vw;
  background-color: #0f172a;
  background-image: radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%);
  color: white;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 10px;
  background: linear-gradient(to right, #10b981, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: #94a3b8;
  margin-bottom: 40px;
  text-align: center;
`;

export default function LoginPage() {
  return (
    <Container>
      <Title>Agri-Track</Title>
      <Subtitle>Next-Gen Logistics Management</Subtitle>
      <AuthCard />
    </Container>
  );
}
