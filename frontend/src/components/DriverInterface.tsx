'use client';

import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { startTripAction, reportIncidentAction } from '@/actions/logistics';
import toast from 'react-hot-toast';
import { LoadingRow } from './Skeleton';

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
  const [shipmentId, setShipmentId] = useState("");

  useEffect(() => {
    setShipmentId(`ship-${Date.now()}`);
  }, []);

  const handleStartTrip = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      // Generate shipment ID here if not present, or let action handle it.
      // But action expects it.
      formData.set("shipmentId", `ship-${Date.now()}`);
      
      const result = await startTripAction(formData);
      if (result.success && result.shipmentId) {
        setShipmentId(result.shipmentId);
        // We can also use local storage if needed
        localStorage.setItem("active_shipment", result.shipmentId);
        toast.success("Trip Started!");
        // Force re-render or state update to show controls
        // The parent component might need to know, or we just use local state
        // Since isTripActive prop comes from server, we might need to refresh
        // But for "Perceived Performance", we just switch UI state locally
        // We need a way to switch the view. 
        // Let's assume we toggle a local state 'tripStarted'
        setTripStarted(true);
      }
    } catch (error) {
      toast.error("Failed to start trip");
    } finally {
      setLoading(false);
    }
  };

  const [tripStarted, setTripStarted] = useState(isTripActive);

  // Sync prop with state
  useEffect(() => {
    setTripStarted(isTripActive);
  }, [isTripActive]);

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
          throw new Error(result.error);
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

  if (!tripStarted) {
    return (
      <Container>
        <ScreenFrame />
        <Title>Ready to Roll?</Title>
        <form onSubmit={handleStartTrip}>
          <input type="hidden" name="truckId" value="TRUCK-001" />
          <RadarButton type="submit" disabled={loading}>
            {loading ? 'Starting...' : 'Start Trip'}
          </RadarButton>
        </form>
      </Container>
    );
  }

  return (
    <Container>
      <ScreenFrame />
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
    </Container>
  );
}
