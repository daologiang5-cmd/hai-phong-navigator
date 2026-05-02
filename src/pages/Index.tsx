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
import { Map, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleSelectWard = useCallback((ward: Ward) => {
    setSelectedWard(ward);
    setSidebarOpen(false);
  }, []);

  const handleWardFound = useCallback((wardName: string) => {
    const ward = getWardByName(wardName);
    if (ward) {
      setSelectedWard(ward);
    }
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Left Sidebar - desktop only */}
      {!isMobile && (
        <aside className="w-80 flex-shrink-0 h-full border-r border-border">
          <WardSidebar
            wards={wards}
            selectedWard={selectedWard}
            onSelectWard={handleSelectWard}
          />
        </aside>
      )}

      {/* Mobile sidebar (Sheet) */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[85vw] max-w-sm">
            <WardSidebar
              wards={wards}
              selectedWard={selectedWard}
              onSelectWard={handleSelectWard}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Right Main Panel */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-border bg-card/80 backdrop-blur px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 pr-12">
            {isMobile && (
              <SheetTriggerButton onClick={() => setSidebarOpen(true)} />
            )}
            <Map className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-bold text-foreground leading-tight truncate">
                Bản đồ Hành chính Hải Phòng
              </h1>
              <p className="hidden sm:block text-sm text-muted-foreground">
                Tra cứu thông tin phường/xã sau sáp nhập
              </p>
            </div>
          </div>
        </header>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-auto">
          <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
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

function SheetTriggerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Mở danh sách phường/xã"
      className="h-9 w-9 rounded-md border border-border bg-card flex items-center justify-center text-foreground hover:bg-accent flex-shrink-0"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}

export default Index;
