'use client';

import React, { useState, useEffect } from 'react';
import SignOutButton from './SignOutButton';
import styled, { keyframes, css } from 'styled-components';
import { reportIncidentAction, joinShipmentAction } from '@/actions/logistics';
import toast from 'react-hot-toast';
import { LoadingRow } from './Skeleton';
import ShimmerButton from './ui/ShimmerButton';

// --- Keyframes ---

const radar = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(2); opacity: 0; }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// --- Styled Components ---

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #0f172a;
  padding: 20px;
  color: white;
  position: relative;
  overflow: hidden;
`;

const ScreenFrame = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 50;
  
  &::before, &::after {
    content: '';
    position: absolute;
    width: 40px;
    height: 40px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }

  &::before {
    top: 20px;
    left: 20px;
    border-right: none;
    border-bottom: none;
  }

  &::after {
    bottom: 20px;
    right: 20px;
    border-left: none;
    border-top: none;
  }
`;

const RadarButton = styled.button`
  width: 250px;
  height: 250px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  color: white;
  font-size: 2rem;
  font-weight: 800;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 2px;
  box-shadow: 0 10px 25px rgba(16, 185, 129, 0.5);
  position: relative;
  transition: transform 0.2s;
  z-index: 10;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 50%;
    border: 2px solid #10b981;
    animation: ${radar} 2s infinite;
    z-index: -1;
  }

  &:active {
    transform: scale(0.95);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    animation: none;
  }
`;

const ControlPanel = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  width: 100%;
  max-width: 400px;
  margin-top: 20px;
`;

const ActionButton = styled.button<{ $variant: 'police' | 'breakdown' | 'accident' }>`
  padding: 25px;
  border-radius: 16px;
  border: none;
  font-size: 1.2rem;
  font-weight: 700;
  color: white;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  position: relative;
  overflow: hidden;

  background: ${({ $variant }) => 
    $variant === 'police' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' :
    $variant === 'breakdown' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
    'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
  };

  &:active {
    transform: scale(0.98);
  }
`;

const Title = styled.h1`
  margin-bottom: 40px;
  font-size: 2rem;
  text-align: center;
  background: linear-gradient(to right, #fff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const IncidentList = styled.div`
  width: 100%;
  max-width: 400px;
  margin-top: 30px;
`;

const IncidentCard = styled.div`
  padding: 16px;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  animation: ${fadeInUp} 0.4s ease-out;
  backdrop-filter: blur(8px);
`;

const IconWrapper = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
  border: 1px solid ${props => props.$color}40;
`;

// --- Types ---

interface Incident {
  id: string;
  type: string;
  timestamp: Date;
  status: 'pending' | 'confirmed';
}

// --- Component ---

export default function DriverInterface({ isTripActive }: { isTripActive: boolean }) {
  const [loading, setLoading] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [pickupCode, setPickupCode] = useState("");
  const [tripStarted, setTripStarted] = useState(isTripActive);

  // Sync prop with state
  useEffect(() => {
    setTripStarted(isTripActive);
  }, [isTripActive]);

  const handlePickup = async () => {
    if (pickupCode.length < 6) {
      toast.error("Invalid Pickup Code");
      return;
    }
    setLoading(true);

    try {
      await joinShipmentAction(pickupCode);
      toast.success("Shipment Picked Up!");
      setTripStarted(true);
      // Optional: Reload to sync server state if needed, but local state update is faster
      // window.location.reload(); 
    } catch (error) {
      toast.error("Failed to pickup shipment");
    } finally {
      setLoading(false);
    }
  };

  const handleIncident = async (type: string) => {
    // 1. Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const newIncident: Incident = {
      id: tempId,
      type,
      timestamp: new Date(),
      status: 'pending'
    };

    setIncidents(prev => [newIncident, ...prev]);

    // 2. Background Action
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      setIncidents(prev => prev.filter(i => i.id !== tempId)); // Revert
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      
      try {
        const result = await reportIncidentAction(latitude, longitude, type, `Reported ${type}`);
        
        if (result.success) {
          // 3. Confirm Update
          setIncidents(prev => prev.map(i => 
            i.id === tempId ? { ...i, status: 'confirmed' } : i
          ));
          toast.success('Incident Logged');
        } else {
          throw new Error(result.error || "Failed");
        }
      } catch (error) {
        // Revert on failure
        setIncidents(prev => prev.filter(i => i.id !== tempId));
        toast.error('Failed to report');
      }
    }, (error) => {
      setIncidents(prev => prev.filter(i => i.id !== tempId));
      toast.error('Location access denied');
    });
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'POLICE_CHECKPOINT': return '👮';
      case 'BREAKDOWN': return '🔧';
      case 'ACCIDENT': return '🚑';
      default: return '⚠️';
    }
  };

  const getColor = (type: string) => {
    switch(type) {
      case 'POLICE_CHECKPOINT': return '#3b82f6';
      case 'BREAKDOWN': return '#f59e0b';
      case 'ACCIDENT': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  // Define components here to avoid missing definitions if they were cut off
  // But they are defined above in the file (lines 23-185).
  // I am replacing from line 187 downwards.

  return (
    <Container>
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 50 }}>
        <SignOutButton />
      </div>
      <ScreenFrame />
      
      {/* Header / Status */}
      <div style={{ 
        position: 'absolute', 
        top: '30px', 
        left: '0', 
        right: '0', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        gap: '5px',
        zIndex: 20
      }}>
        <div style={{ 
          padding: '8px 16px', 
          background: tripStarted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)', 
          border: `1px solid ${tripStarted ? '#10b981' : '#94a3b8'}`,
          borderRadius: '20px',
          color: tripStarted ? '#10b981' : '#94a3b8',
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: '1px'
        }}>
          {tripStarted ? '● EN ROUTE' : '○ IDLE'}
        </div>
        <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
          TRUCK-001
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '400px', zIndex: 10, marginTop: '80px' }}>
        {!tripStarted ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '100%' }}>
             <h2 style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.2rem' }}>
               Awaiting Assignment
             </h2>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
                <input 
                    type="text" 
                    placeholder="ENTER PICKUP CODE"
                    value={pickupCode}
                    onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
                    style={{
                        width: '100%',
                        height: '56px',
                        padding: '0 20px',
                        background: 'rgba(30, 41, 59, 0.8)',
                        border: '2px solid #334155',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '1.5rem',
                        textAlign: 'center',
                        outline: 'none',
                        letterSpacing: '4px',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                    }}
                />
                <ShimmerButton 
                  onClick={handlePickup} 
                  isLoading={loading} 
                  loadingText="VERIFYING..."
                  disabled={pickupCode.length < 6}
                >
                  CONFIRM
                </ShimmerButton>
             </div>
          </div>
        ) : (
          <>
            <Title>On The Road</Title>
            <ControlPanel>
              <ActionButton $variant="police" onClick={() => handleIncident('POLICE_CHECKPOINT')}>
                👮 Police Checkpoint
              </ActionButton>
              <ActionButton $variant="breakdown" onClick={() => handleIncident('BREAKDOWN')}>
                🔧 Vehicle Breakdown
              </ActionButton>
              <ActionButton $variant="accident" onClick={() => handleIncident('ACCIDENT')}>
                🚑 Accident / Emergency
              </ActionButton>
            </ControlPanel>

            <IncidentList>
              {incidents.map(incident => (
                incident.status === 'pending' ? (
                  <LoadingRow key={incident.id} text={`Syncing ${incident.type.toLowerCase().replace('_', ' ')}...`} />
                ) : (
                  <IncidentCard key={incident.id}>
                    <IconWrapper $color={getColor(incident.type)}>
                      {getIcon(incident.type)}
                    </IconWrapper>
                    <div>
                      <div style={{ fontWeight: 600 }}>{incident.type.replace('_', ' ')}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {incident.timestamp.toLocaleTimeString()} • Synced
                      </div>
                    </div>
                  </IncidentCard>
                )
              ))}
            </IncidentList>
          </>
        )}
      </div>
    </Container>
  );
}
