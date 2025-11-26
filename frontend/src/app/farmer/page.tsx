'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { fetchClient } from '@/lib/fetchClient';
import toast from 'react-hot-toast';
import ShimmerButton from '@/components/ui/ShimmerButton';
import SignOutButton from '@/components/SignOutButton';
import { createShipmentAction } from '@/actions/logistics';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #0f172a;
  color: white;
  padding: 20px;
  position: relative;
`;

const Header = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 40px;
  color: #10b981;
`;

const CodeDisplay = styled.div`
  margin-top: 40px;
  padding: 40px;
  background: #1e293b;
  border-radius: 24px;
  border: 2px solid #334155;
  text-align: center;
  animation: fadeIn 0.5s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const CodeLabel = styled.p`
  font-size: 1.2rem;
  color: #94a3b8;
  margin-bottom: 10px;
`;

const CodeValue = styled.h2`
  font-size: 4rem;
  font-weight: 900;
  letter-spacing: 5px;
  color: white;
  margin: 0;
  font-family: monospace;
`;

export default function FarmerPage() {
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateShipment = async () => {
    setLoading(true);
    try {
      // Use the server action instead of direct fetch
      const result = await createShipmentAction();
      if (result.success) {
        setPickupCode(result.pickupCode);
        toast.success("Shipment Created!");
      }
    } catch (error) {
      console.error("Failed to create shipment:", error);
      toast.error("Failed to create shipment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Header>
        <SignOutButton />
      </Header>
      <Title>Farmer Dashboard</Title>
      
      {!pickupCode ? (
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <ShimmerButton onClick={handleCreateShipment} isLoading={loading} loadingText="Generating...">
            Create New Shipment
          </ShimmerButton>
        </div>
      ) : (
        <CodeDisplay>
          <CodeLabel>Show this code to the Driver</CodeLabel>
          <CodeValue>{pickupCode}</CodeValue>
          <button 
            onClick={() => setPickupCode(null)}
            style={{ 
              marginTop: '20px', 
              background: 'transparent', 
              border: '1px solid #475569', 
              color: '#94a3b8',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Create Another
          </button>
        </CodeDisplay>
      )}
    </Container>
  );
}
