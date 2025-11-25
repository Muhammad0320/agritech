'use client';

import React from 'react';
import styled from 'styled-components';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('./LiveMap'), { 
  ssr: false,
  loading: () => <div style={{height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b', color: '#94a3b8'}}>Loading Map...</div>
});

// --- Styled Components ---

const DashboardContainer = styled.div`
  min-height: 100vh;
  background-color: #0f172a; /* Slate 900 */
  color: white;
  padding: 24px;
  font-family: 'Inter', sans-serif;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
`;

const TitleGroup = styled.div``;

const Title = styled.h1`
  font-size: 2rem; /* 3xl */
  font-weight: 700;
  background: linear-gradient(to right, #34d399, #22d3ee); /* Emerald 400 to Cyan 400 */
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
`;

const Subtitle = styled.p`
  color: #94a3b8; /* Slate 400 */
  margin-top: 4px;
  font-size: 1rem;
`;

const NavLink = styled.a`
  padding: 10px 20px;
  background-color: #1e293b; /* Slate 800 */
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.2s;

  &:hover {
    background-color: #334155; /* Slate 700 */
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  height: calc(100vh - 140px);

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 3fr; /* 1/4 for stats, 3/4 for map */
  }
`;

const StatsColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const MapColumn = styled.div`
  background-color: #1e293b; /* Slate 800 */
  border-radius: 16px;
  padding: 4px;
  border: 1px solid #334155; /* Slate 700 */
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  position: relative;
`;

// Stat Card Styles
const Card = styled.div<{ $color: string }>`
  padding: 24px;
  border-radius: 12px;
  border: 1px solid;
  backdrop-filter: blur(4px);
  background: linear-gradient(to bottom right, 
    ${props => props.$color === 'emerald' ? 'rgba(16, 185, 129, 0.2)' : 
      props.$color === 'blue' ? 'rgba(59, 130, 246, 0.2)' : 
      props.$color === 'red' ? 'rgba(239, 68, 68, 0.2)' : 
      'rgba(245, 158, 11, 0.2)'}, 
    ${props => props.$color === 'emerald' ? 'rgba(16, 185, 129, 0.05)' : 
      props.$color === 'blue' ? 'rgba(59, 130, 246, 0.05)' : 
      props.$color === 'red' ? 'rgba(239, 68, 68, 0.05)' : 
      'rgba(245, 158, 11, 0.05)'}
  );
  border-color: ${props => props.$color === 'emerald' ? 'rgba(16, 185, 129, 0.2)' : 
      props.$color === 'blue' ? 'rgba(59, 130, 246, 0.2)' : 
      props.$color === 'red' ? 'rgba(239, 68, 68, 0.2)' : 
      'rgba(245, 158, 11, 0.2)'};
  color: ${props => props.$color === 'emerald' ? '#34d399' : 
      props.$color === 'blue' ? '#60a5fa' : 
      props.$color === 'red' ? '#f87171' : 
      '#fbbf24'};
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const CardTitle = styled.p`
  color: #94a3b8; /* Slate 400 */
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
`;

const CardValue = styled.h3`
  font-size: 1.875rem; /* 3xl */
  font-weight: 700;
  color: white;
  margin: 8px 0 0 0;
`;

const CardIcon = styled.span`
  font-size: 1.5rem;
`;

// --- Component ---

interface DashboardProps {
  summary: {
    total_active_trucks: number;
    total_completed_today: number;
    alerts_count: number;
  };
}

export default function Dashboard({ summary }: DashboardProps) {
  return (
    <DashboardContainer>
      <Header>
        <TitleGroup>
          <Title>Agri-Track Command Center</Title>
          <Subtitle>Real-time Logistics Monitoring</Subtitle>
        </TitleGroup>
        <div style={{ display: 'flex', gap: '10px' }}>
            <NavLink href="/driver">Driver View</NavLink>
        </div>
      </Header>

      <Grid>
        <StatsColumn>
          <StatCard 
            title="Active Trucks" 
            value={summary.total_active_trucks} 
            icon="🚛" 
            color="emerald"
          />
          <StatCard 
            title="Completed Today" 
            value={summary.total_completed_today} 
            icon="✅" 
            color="blue"
          />
          <StatCard 
            title="Incidents" 
            value={summary.alerts_count} 
            icon="⚠️" 
            color="red"
          />
          <StatCard 
            title="Avg Speed" 
            value="65 km/h" 
            icon="⚡" 
            color="amber"
          />
        </StatsColumn>

        <MapColumn>
          <LiveMap />
        </MapColumn>
      </Grid>
    </DashboardContainer>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: string, color: string }) {
  return (
    <Card $color={color}>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardValue>{value}</CardValue>
        </div>
        <CardIcon>{icon}</CardIcon>
      </CardHeader>
    </Card>
  );
}
