'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { createShipmentAction } from '@/actions/logistics';
import toast from 'react-hot-toast';
import SignOutButton from '@/components/SignOutButton';
import ShimmerButton from '@/components/ui/ShimmerButton';

// Task 1: The Coordinate Map
const DESTINATIONS = {
  'kwara': [
    { name: 'Ilorin - Mandate Market', lat: 8.4966, lng: 4.5421 },
    { name: 'Offa - Owode Market', lat: 8.1393, lng: 4.7173 },
    { name: 'Jebba - Paper Mill Depot', lat: 9.1287, lng: 4.8340 },
    { name: 'Bode Saadu - Cashew Hub', lat: 9.0167, lng: 4.7833 }
  ],
  'national': [
    { name: 'Lagos - Mile 12 Market', lat: 6.6018, lng: 3.3515 },
    { name: 'Lagos - Apapa Port (Export)', lat: 6.4433, lng: 3.3660 },
    { name: 'Kano - Dawanau Grains Market', lat: 12.0673, lng: 8.4682 },
    { name: 'Onitsha - Main Market', lat: 6.1519, lng: 6.7865 },
    { name: 'Abuja - National Grains Reserve', lat: 9.0579, lng: 7.4951 }
  ]
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #0f172a;
  color: white;
  padding: 20px;
`;

const FormCard = styled.div`
  background: rgba(30, 41, 59, 0.7);
  padding: 32px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Title = styled.h1`
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 8px;
  text-align: center;
  background: linear-gradient(to right, #10b981, #34d399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Input = styled.input`
  width: 100%;
  padding: 16px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
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
  padding: 16px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: #10b981;
  }
`;

const PickupCodeDisplay = styled.div`
  margin-top: 20px;
  padding: 20px;
  background: rgba(16, 185, 129, 0.1);
  border: 2px dashed #10b981;
  border-radius: 16px;
  text-align: center;
`;

const Code = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: #10b981;
  letter-spacing: 4px;
  margin-top: 8px;
`;

export default function FarmerPage() {
  const [loading, setLoading] = useState(false);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  
  // Form State
  const [produceType, setProduceType] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [destCoords, setDestCoords] = useState<{lat: number, lng: number} | null>(null);
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);

  // Get GPS on Load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          toast.success("Location Acquired");
        },
        (error) => {
          console.error("GPS Error:", error);
          toast.error("Could not get location. Using default.");
          // Fallback to Ilorin
          setCoords({ lat: 8.4799, lon: 4.5418 });
        }
      );
    }
  }, []);

  const handleDestinationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    setDestinationName(selectedName);

    // Find coords
    let found = DESTINATIONS.kwara.find(d => d.name === selectedName);
    if (!found) {
      found = DESTINATIONS.national.find(d => d.name === selectedName);
    }

    if (found) {
      setDestCoords({ lat: found.lat, lng: found.lng });
    }
  };

  const handleCreateShipment = async () => {
    if (!coords) {
      toast.error("Waiting for GPS...");
      return;
    }
    if (!produceType) {
      toast.error("Please enter produce type");
      return;
    }
    if (!destinationName || !destCoords) {
      toast.error("Please select a destination");
      return;
    }

    setLoading(true);
    try {
      const result = await createShipmentAction(
        produceType, 
        destinationName, 
        coords.lat, 
        coords.lon,
        destCoords.lat,
        destCoords.lng
      );
      
      if (result.success && result.pickup_code) {
        setPickupCode(result.pickup_code);
        toast.success("Shipment Created!");
      } else {
        toast.error(result.error || "Failed to create shipment");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <SignOutButton />
      </div>

      <FormCard>
        <Title>New Shipment</Title>
        
        {!pickupCode ? (
          <>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>Produce Type</label>
              <Input 
                placeholder="e.g. Tomatoes, Yams" 
                value={produceType}
                onChange={(e) => setProduceType(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>Destination</label>
              <Select value={destinationName} onChange={handleDestinationChange}>
                <option value="">Select Destination</option>
                <optgroup label="Kwara State Hubs">
                  {DESTINATIONS.kwara.map(dest => (
                    <option key={dest.name} value={dest.name}>{dest.name}</option>
                  ))}
                </optgroup>
                <optgroup label="National Hubs">
                  {DESTINATIONS.national.map(dest => (
                    <option key={dest.name} value={dest.name}>{dest.name}</option>
                  ))}
                </optgroup>
              </Select>
            </div>

            <div style={{ marginTop: '10px' }}>
              <ShimmerButton 
                onClick={handleCreateShipment} 
                isLoading={loading}
                loadingText="Creating..."
              >
                GENERATE PICKUP CODE
              </ShimmerButton>
            </div>
          </>
        ) : (
          <PickupCodeDisplay>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase' }}>
              Give this code to driver
            </div>
            <Code>{pickupCode}</Code>
            <button 
              onClick={() => {
                setPickupCode(null);
                setProduceType("");
                setDestinationName("");
                setDestCoords(null);
              }}
              style={{ 
                marginTop: '20px', 
                background: 'none', 
                border: 'none', 
                color: '#94a3b8', 
                textDecoration: 'underline', 
                cursor: 'pointer' 
              }}
            >
              Create Another
            </button>
          </PickupCodeDisplay>
        )}
      </FormCard>
    </Container>
  );
}
