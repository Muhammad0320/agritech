'use client';

import { verifyShipmentAction, startDemoSimulationAction } from "@/actions/logistics";
import { useState } from "react";
import styled from "styled-components";
import ShimmerButton from "@/components/ui/ShimmerButton";
import { generateReportAction } from "@/actions/ai";
import ReportModal from "@/components/ReportModal";
import toast from "react-hot-toast";
import { Sparkles, CheckCircle, Play } from "lucide-react";
import SignOutButton from "@/components/SignOutButton";
import LiveStats from "@/components/LiveStats";
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/components/LiveMap'), { 
  ssr: false,
  loading: () => <div style={{height: '100%', width: '100%', minHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b', color: '#94a3b8', borderRadius: '16px'}}>Loading Map...</div>
});

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  background: #0f172a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(to right, #ffffff 20%, #94a3b8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  display: inline-block;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;

  @media (max-width: 768px) {
    width: 100%;
    flex-wrap: wrap;
    
    & > * {
      flex: 1;
    }
  }
`;

const DemoButton = styled.button`
  height: 48px;
  padding: 0 24px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid #3b82f6;
  color: #3b82f6;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  transition: all 0.2s;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const VerifySection = styled.div`
  padding: 20px 32px;
  background: #1e293b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 20px;
`;

const Input = styled.input`
  padding: 12px 20px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  width: 300px;
  outline: none;
  &:focus {
    border-color: #10b981;
  }
`;

const AIReportButton = styled(ShimmerButton)`
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  padding: 0 24px;
  font-weight: 600;
`;

// --- Bento Grid Layout ---
const BentoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: auto 1fr;
  gap: 24px;
  padding: 24px;
  height: calc(100vh - 140px); /* Fill remaining screen */

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    height: auto;
  }
`;

const MapContainerWrapper = styled.div`
  grid-column: 1 / -1;
  width: 100%;
  height: 100%;
  min-height: 500px;
`;

export default function DashboardPage() {
  const [loadingReport, setLoadingReport] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Verify State
  const [verifyId, setVerifyId] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const result = await generateReportAction();
      if (result.success && result.report) {
        setReport(result.report);
        setIsModalOpen(true);
        toast.success("Report Generated!");
      } else {
        toast.error("Failed to generate report");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoadingReport(false);
    }
  };

  const [startingDemo, setStartingDemo] = useState(false);

  const handleStartDemo = async () => {
    setStartingDemo(true);
    try {
        const result = await startDemoSimulationAction();
        if (result.success) {
            toast.success("Demo Simulation Started!");
        } else {
            toast.error(result.error || "Failed to start demo");
        }
    } catch (error) {
        toast.error("Error starting demo");
    } finally {
        setStartingDemo(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyId) {
        toast.error("Enter Shipment ID");
        return;
    }
    setVerifying(true);
    try {
        const result = await verifyShipmentAction(verifyId);
        if (result.success) {
            toast.success("Shipment Verified & Completed!");
            setVerifyId("");
        } else {
            toast.error(result.error || "Verification Failed");
        }
    } catch (error) {
        toast.error("Error verifying shipment");
    } finally {
        setVerifying(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#0f172a' }}>
      <HeaderContainer>
        <Title>Logistics Command Center</Title>
        <ButtonGroup>
            <DemoButton onClick={handleStartDemo} disabled={startingDemo}>
                <Play size={18} fill="currentColor" />
                {startingDemo ? "Starting..." : "Start Demo"}
            </DemoButton>

            <div style={{ height: '48px' }}>
                <AIReportButton 
                    onClick={handleGenerateReport} 
                    isLoading={loadingReport}
                    loadingText="Analyzing..."
                    $variant="glass"
                    style={{ height: '100%' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <Sparkles size={18} />
                        <span>Generate AI Report</span>
                    </div>
                </AIReportButton>
            </div>
            
            <SignOutButton />
        </ButtonGroup>
      </HeaderContainer>

      <VerifySection>
        <div style={{ color: '#94a3b8', fontWeight: 600 }}>Verify Shipment:</div>
        <Input 
            placeholder="Enter Shipment ID (e.g. from QR Code)" 
            value={verifyId}
            onChange={(e) => setVerifyId(e.target.value)}
        />
        <button 
            onClick={handleVerify}
            disabled={verifying}
            style={{
                padding: '12px 24px',
                background: '#10b981',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontWeight: 700,
                cursor: verifying ? 'not-allowed' : 'pointer',
                opacity: verifying ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}
        >
            {verifying ? 'Verifying...' : <><CheckCircle size={18} /> Verify Arrival</>}
        </button>
      </VerifySection>
      
      <BentoGrid>
        <LiveStats />
        <MapContainerWrapper>
          <LiveMap />
        </MapContainerWrapper>
      </BentoGrid>

      <ReportModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        report={report || ""} 
      />
    </main>
  );
}
