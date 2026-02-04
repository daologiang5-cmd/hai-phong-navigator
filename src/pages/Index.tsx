import { useState, useCallback } from 'react';
import { WardSidebar } from '@/components/WardSidebar';
import { WardDetails } from '@/components/WardDetails';
import { MapDisplay } from '@/components/MapDisplay';
import { OldNameLookup } from '@/components/OldNameLookup';
import { Chatbot } from '@/components/Chatbot';
import { wards, getWardByName } from '@/data/wardsData';
import { Ward } from '@/types/ward';
import { Map } from 'lucide-react';

const Index = () => {
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);

  const handleSelectWard = useCallback((ward: Ward) => {
    setSelectedWard(ward);
  }, []);

  const handleWardFound = useCallback((wardName: string) => {
    const ward = getWardByName(wardName);
    if (ward) {
      setSelectedWard(ward);
    }
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Left Sidebar - Fixed width, independently scrollable */}
      <aside className="w-80 flex-shrink-0 h-full border-r border-border">
        <WardSidebar
          wards={wards}
          selectedWard={selectedWard}
          onSelectWard={handleSelectWard}
        />
      </aside>

      {/* Right Main Panel */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <Map className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Bản đồ Hành chính Hải Phòng
              </h1>
              <p className="text-sm text-muted-foreground">
                Tra cứu thông tin phường/xã sau sáp nhập
              </p>
            </div>
          </div>
        </header>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6 max-w-5xl mx-auto">
            {/* Map Display */}
            <MapDisplay />

            {/* Ward Details or Empty State */}
            <div className="bg-card rounded-lg border border-border min-h-[400px]">
              <WardDetails ward={selectedWard} />
            </div>

            {/* Old Name Lookup */}
            <OldNameLookup onWardFound={handleWardFound} />
          </div>
        </div>
      </main>

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
};

export default Index;
