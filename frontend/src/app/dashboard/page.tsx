'use client';

import { getDashboardSummaryAction } from "@/actions/logistics";
import Dashboard from "@/components/Dashboard";
import { useEffect, useState } from "react";
import styled from "styled-components";
import ShimmerButton from "@/components/ui/ShimmerButton";
import { generateReportAction } from "@/actions/ai";
import ReportModal from "@/components/ReportModal";
import toast from "react-hot-toast";
import { Sparkles } from "lucide-react";

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  background: #0f172a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Title = styled.h1`
  font-size: 1.8rem;
  font-weight: 700;
  color: white;
`;

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    getDashboardSummaryAction().then(setSummary);
  }, []);

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    try {
      // Simulate "Thinking" time
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

  return (
    <main>
      <HeaderContainer>
        <Title>Logistics Command Center</Title>
        <div style={{ width: '200px' }}>
            <ShimmerButton 
                onClick={handleGenerateReport} 
                isLoading={loadingReport}
                loadingText="Analyzing Data..."
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <Sparkles size={18} />
                    <span>Generate AI Report</span>
                </div>
            </ShimmerButton>
        </div>
      </HeaderContainer>
      
      {summary ? <Dashboard summary={summary} /> : (
        <div style={{ padding: '40px', color: 'white' }}>Loading Dashboard...</div>
      )}

      <ReportModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        report={report || ""} 
      />
    </main>
  );
}
