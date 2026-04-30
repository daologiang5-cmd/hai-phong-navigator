import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WardSidebar } from '@/components/WardSidebar';
import { WardDetails } from '@/components/WardDetails';
import { MapDisplay } from '@/components/MapDisplay';
import { OldNameLookup } from '@/components/OldNameLookup';
import { Chatbot } from '@/components/Chatbot';
import { ThemeToggle } from '@/components/ThemeToggle';
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
        <header className="flex-shrink-0 border-b border-border bg-card/80 backdrop-blur px-6 py-4">
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
            {/* OLD NAME LOOKUP - TOP (above the map) */}
            <OldNameLookup onWardFound={handleWardFound} />

            {/* Map Display */}
            <MapDisplay
              selectedWard={selectedWard}
              onSelectWard={(w) => setSelectedWard(w)}
            />

            {/* Ward Details with glassmorphism + entrance animation */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedWard?.name ?? 'empty'}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="bg-card/70 backdrop-blur-xl rounded-xl border border-border min-h-[400px] shadow-xl"
              >
                <WardDetails ward={selectedWard} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Floating theme toggle */}
      <ThemeToggle />

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
};

export default Index;
