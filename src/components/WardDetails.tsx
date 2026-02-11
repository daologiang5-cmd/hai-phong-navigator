import { Ward, WardItem } from '@/types/ward';
import { MapPin, Users, Ruler, GitMerge, Landmark, UtensilsCrossed, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

function WardItemImage({ url }: { url: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <p className="text-xs text-muted-foreground italic mt-1">Không tải được hình ảnh.</p>
    );
  }

  return (
    <img
      src={url}
      alt=""
      className="mt-2 w-full max-w-md rounded-md border border-border object-cover"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

function WardItemList({ items, bulletColor }: { items: WardItem[]; bulletColor: string }) {
  return (
    <ul className="space-y-6 pl-1">
      {items.map((item, index) => {
        // Split "name -- description" format
        const separatorIndex = item.text.indexOf(' -- ');
        const title = separatorIndex >= 0 ? item.text.slice(0, separatorIndex) : item.text;
        const description = separatorIndex >= 0 ? item.text.slice(separatorIndex + 4) : '';

        return (
          <li key={index} className="text-foreground/90">
            <div className="flex items-start gap-3">
              <span className={`${bulletColor} font-bold shrink-0`}>•</span>
              <div>
                <span className="font-semibold leading-relaxed">{title}</span>
                {description && (
                  <p className="mt-1 leading-relaxed text-foreground/80">{description}</p>
                )}
              </div>
            </div>
            {item.images.length > 0 && (
              <div className="ml-6 space-y-2">
                {item.images.map((url, imgIdx) => (
                  <WardItemImage key={imgIdx} url={url} />
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

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

        {/* Landmarks */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Landmark className="h-5 w-5 text-primary" />
            Địa điểm nổi bật {ward.landmarks.length > 0 && `(${ward.landmarks.length})`}
          </h2>
          {ward.landmarks.length > 0 ? (
            <WardItemList items={ward.landmarks} bulletColor="text-primary" />
          ) : (
            <p className="text-muted-foreground italic">Chưa có dữ liệu chi tiết.</p>
          )}
        </section>

        {/* Specialties */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <UtensilsCrossed className="h-5 w-5 text-accent" />
            Đặc sản {ward.specialties.length > 0 && `(${ward.specialties.length})`}
          </h2>
          {ward.specialties.length > 0 ? (
            <WardItemList items={ward.specialties} bulletColor="text-accent" />
          ) : (
            <p className="text-muted-foreground italic">Chưa có dữ liệu chi tiết.</p>
          )}
        </section>

        {/* Description */}
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
