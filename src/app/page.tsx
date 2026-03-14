'use client';

import { useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  TrendingUp,
  Calculator,
  Settings,
  Menu,
  X,
  BookOpen
} from 'lucide-react';
import MarketHoursBanner from "@/components/MarketHoursBanner";
import GapScannerCard from "@/components/GapScannerCard";
import MarketCard from "@/components/MarketCard";
import NewsScreenerCard from "@/components/NewsScreenerCard";
import TradeEntryModal from "@/components/trading/TradeEntryModal";
import CombinedCalendarView from "@/components/trading/CombinedCalendarView";
import ProfitProjectionView from "@/components/trading/ProfitProjectionView";
import TradeManagementView from "@/components/trading/TradeManagementView";

type TabId = 'overview' | 'market' | 'trade-management' | 'projection';

// Inner component that uses searchParams
function TradingTerminalContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get tab from URL query param, default to 'overview'
  const getTabFromUrl = useCallback((): TabId => {
    const tab = searchParams.get('tab');
    if (tab === 'market' || tab === 'trade-management' || tab === 'projection') return tab;
    return 'overview';
  }, [searchParams]);
  
  const [activeTab, setActiveTabState] = useState<TabId>(getTabFromUrl);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Update URL when tab changes (using replace to avoid bloating history)
  const setActiveTab = (tab: TabId) => {
    setActiveTabState(tab);
    setMobileMenuOpen(false);
    const params = new URLSearchParams(searchParams);
    if (tab === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'market' as const, label: 'Market', icon: TrendingUp },
    { id: 'trade-management' as const, label: 'Trade Management', icon: Settings },
    { id: 'projection' as const, label: 'Profit Projection', icon: Calculator },
  ];

  const activeTabLabel = tabs.find(t => t.id === activeTab)?.label || 'Overview';
  const ActiveIcon = tabs.find(t => t.id === activeTab)?.icon || LayoutDashboard;

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      {/* Header */}
      <header className="border-b border-[#30363d] bg-[#161b22]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-[#ff6b35] to-[#ff8c5a] flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg">
                J
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-white">Juno Trading Terminal</h1>
                <p className="hidden sm:block text-xs md:text-sm text-[#8b949e]">Professional trading journal & portfolio management</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Desktop Tab Navigation */}
              <div className="hidden md:flex items-center gap-1 bg-[#0d1117] rounded-lg p-1 border border-[#30363d]">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                        activeTab === tab.id
                          ? 'bg-[#ff6b35] text-white'
                          : 'text-[#8b949e] hover:text-white hover:bg-[#30363d]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-[#30363d] rounded-lg"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-white" />
                ) : (
                  <Menu className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-[#30363d]">
              <div className="flex flex-col gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-[#ff6b35] text-white'
                          : 'text-[#8b949e] hover:text-white hover:bg-[#30363d]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {activeTab === 'overview' && (
          <CombinedCalendarView />
        )}

        {activeTab === 'trade-management' && (
          <TradeManagementView />
        )}

        {activeTab === 'market' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
              <div className="lg:col-span-2 space-y-4">
                <MarketHoursBanner compact />
                <GapScannerCard />
              </div>
              <div className="lg:col-span-3">
                <MarketCard />
              </div>
            </div>
            <NewsScreenerCard />
          </div>
        )}

        {activeTab === 'projection' && (
          <ProfitProjectionView />
        )}
      </main>

      {/* Trade Entry Modal */}
      <TradeEntryModal
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
      />

      {/* Footer */}
      <footer className="border-t border-[#30363d] bg-[#161b22] mt-8 md:mt-12">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-center md:text-left text-xs md:text-sm text-[#8b949e]">
              Juno Trading Terminal © {new Date().getFullYear()}
            </p>
            <div className="flex items-center gap-4">
              <a 
                href="https://github.com/mschiumo/juno-trading-terminal"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#8b949e] hover:text-[#ff6b35] transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Main component with Suspense boundary
export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d1117] flex items-center justify-center"><div className="text-[#8b949e]">Loading...</div></div>}>
      <TradingTerminalContent />
    </Suspense>
  );
}
