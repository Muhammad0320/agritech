import React from 'react';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const SkeletonBase = styled.div`
  background: #1e293b;
  background-image: linear-gradient(to right, #1e293b 0%, #334155 20%, #1e293b 40%, #1e293b 100%);
  background-repeat: no-repeat;
  background-size: 1000px 100%; 
  animation: ${shimmer} 2s infinite linear;
  border-radius: 16px;
`;

const Container = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
`;

const StatCard = styled(SkeletonBase)`
  height: 140px;
`;

const MapSkeleton = styled(SkeletonBase)`
  width: 100%;
  height: 500px;
`;

export default function DashboardSkeleton() {
  return (
    <Container>
      <StatsGrid>
        <StatCard />
        <StatCard />
        <StatCard />
        <StatCard />
      </StatsGrid>
      <MapSkeleton />
    </Container>
  );
}
