'use client';

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { getDashboardSummaryAction } from '@/actions/logistics';

// --- Styled Components (Reused from Dashboard.tsx for consistency) ---

const StatsGrid = styled.div`
  display: contents; /* Allows children to sit directly in the parent grid */
`;

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

interface SummaryData {
  total_active_trucks: number;
  total_completed_today: number;
  alerts_count: number;
  avg_speed: number;
}

export default function LiveStats() {
  const [summary, setSummary] = useState<SummaryData>({
    total_active_trucks: 0,
    total_completed_today: 0,
    alerts_count: 0,
    avg_speed: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const data = await getDashboardSummaryAction();
      if (data && !data.error) {
        setSummary(data);
      }
    };

    // Initial fetch
    fetchStats();

    // Poll every 3 seconds
    const interval = setInterval(fetchStats, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <StatsGrid>
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
        value={`${summary.avg_speed} km/h`} 
        icon="⚡" 
        color="amber"
      />
    </StatsGrid>
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
