import { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { lookupOldWardName } from '@/data/wardsData';

interface OldNameLookupProps {
  onWardFound?: (wardName: string) => void;
}

export function OldNameLookup({ onWardFound }: OldNameLookupProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    
    const newWardName = lookupOldWardName(query);
    setResult(newWardName);
    setSearched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 map-header rounded-t-lg">
        <CardTitle className="text-lg flex items-center gap-2 text-white">
          <Search className="h-5 w-5" />
          Tra cứu phường/xã trước sáp nhập
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Nhập tên phường/xã cũ để tra cứu..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearched(false);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button onClick={handleSearch} size="icon">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        
        {searched && (
          <div className="mt-4">
            {result ? (
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Kết quả tra cứu:</p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{query}</span>
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <button
                    onClick={() => onWardFound?.(result)}
                    className="font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {result}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-destructive/10 rounded-lg text-destructive">
                <p className="text-sm">Không tìm thấy kết quả cho "{query}"</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
