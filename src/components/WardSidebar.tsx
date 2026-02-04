import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Ward } from '@/types/ward';

interface WardSidebarProps {
  wards: Ward[];
  selectedWard: Ward | null;
  onSelectWard: (ward: Ward) => void;
}

export function WardSidebar({ wards, selectedWard, onSelectWard }: WardSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWards = useMemo(() => {
    if (!searchQuery.trim()) return wards;
    
    const query = searchQuery.toLowerCase().trim();
    
    return wards.filter(ward => {
      // Check ward name
      if (ward.name.toLowerCase().includes(query)) return true;
      
      // Check merged from names (old names)
      for (const oldName of ward.mergedFrom) {
        if (oldName.toLowerCase().includes(query)) return true;
      }
      
      return false;
    });
  }, [wards, searchQuery]);

  // Get the original index of a ward in the full wards list (for numbering)
  const getWardIndex = (wardName: string): number => {
    return wards.findIndex(w => w.name === wardName) + 1;
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold text-sidebar-foreground mb-3">
          Danh sách Phường/Xã
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-sidebar-foreground/60" />
          <Input
            type="text"
            placeholder="Tìm kiếm phường/xã..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus:ring-sidebar-ring"
          />
        </div>
        <p className="text-xs text-sidebar-foreground/60 mt-2">
          Có thể tìm theo tên mới hoặc tên cũ
        </p>
      </div>

      {/* Ward List */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="divide-y divide-sidebar-border">
          {filteredWards.length === 0 ? (
            <div className="p-4 text-center text-sidebar-foreground/60">
              Không tìm thấy kết quả
            </div>
          ) : (
            filteredWards.map((ward) => {
              const index = getWardIndex(ward.name);
              const paddedIndex = String(index).padStart(3, '0');
              
              return (
                <button
                  key={ward.name}
                  onClick={() => onSelectWard(ward)}
                  className={`ward-item w-full text-left ${
                    selectedWard?.name === ward.name ? 'active' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sidebar-primary font-mono text-sm font-bold shrink-0">
                      {paddedIndex}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sidebar-foreground">
                        {ward.name}
                      </div>
                      {ward.mergedFrom.length > 0 && (
                        <div className="text-xs text-sidebar-foreground/60 mt-1 truncate">
                          ← {ward.mergedFrom.slice(0, 2).join(', ')}
                          {ward.mergedFrom.length > 2 && ` (+${ward.mergedFrom.length - 2})`}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border text-center">
        <p className="text-xs text-sidebar-foreground/60">
          Hiển thị: {filteredWards.length} / {wards.length} phường/xã
        </p>
      </div>
    </div>
  );
}
