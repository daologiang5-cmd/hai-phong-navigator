import { Ward } from '@/types/ward';
import { MapPin, Users, Ruler, GitMerge, Landmark, UtensilsCrossed, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WardDetailsProps {
  ward: Ward | null;
}

export function WardDetails({ ward }: WardDetailsProps) {
  if (!ward) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-8">
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Chọn một phường/xã để xem thông tin chi tiết</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Ward Header */}
        <div className="map-header rounded-lg p-6">
          <h1 className="text-3xl font-bold mb-2">{ward.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              <span>{ward.area}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{ward.population} người</span>
            </div>
          </div>
        </div>

        {/* Merged From */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <GitMerge className="h-5 w-5 text-primary" />
            Sáp nhập từ
          </h2>
          {ward.mergedFrom.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {ward.mergedFrom.map((name, index) => (
                <Badge key={index} variant="secondary" className="text-sm">
                  {name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic">Chưa có dữ liệu chi tiết.</p>
          )}
        </section>

        {/* Landmarks - FULL LIST, NO TRUNCATION */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Landmark className="h-5 w-5 text-primary" />
            Địa điểm nổi bật {ward.landmarks.length > 0 && `(${ward.landmarks.length})`}
          </h2>
          {ward.landmarks.length > 0 ? (
            <ul className="space-y-2 pl-1">
              {ward.landmarks.map((landmark, index) => (
                <li key={index} className="flex items-start gap-3 text-foreground/90">
                  <span className="text-primary font-bold shrink-0">•</span>
                  <span className="leading-relaxed">{landmark}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground italic">Chưa có dữ liệu chi tiết.</p>
          )}
        </section>

        {/* Specialties - FULL LIST, NO TRUNCATION */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <UtensilsCrossed className="h-5 w-5 text-accent" />
            Đặc sản {ward.specialties.length > 0 && `(${ward.specialties.length})`}
          </h2>
          {ward.specialties.length > 0 ? (
            <ul className="space-y-2 pl-1">
              {ward.specialties.map((specialty, index) => (
                <li key={index} className="flex items-start gap-3 text-foreground/90">
                  <span className="text-accent font-bold shrink-0">•</span>
                  <span className="leading-relaxed">{specialty}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground italic">Chưa có dữ liệu chi tiết.</p>
          )}
        </section>

        {/* Description - FULL TEXT, NO TRUNCATION */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Mô tả
          </h2>
          {ward.description ? (
            <p className="leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {ward.description}
            </p>
          ) : (
            <p className="text-muted-foreground italic">Chưa có dữ liệu chi tiết.</p>
          )}
        </section>
      </div>
    </ScrollArea>
  );
}
