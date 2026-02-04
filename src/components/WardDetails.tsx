import { Ward } from '@/types/ward';
import { MapPin, Users, Ruler, GitMerge, Landmark, UtensilsCrossed, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WardDetailsProps {
  ward: Ward | null;
}

export function WardDetails({ ward }: WardDetailsProps) {
  if (!ward) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Chọn một phường/xã để xem thông tin chi tiết</p>
        </div>
      </div>
    );
  }

  const hasDetails = ward.landmarks.length > 0 || ward.specialties.length > 0 || ward.description;

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
        {ward.mergedFrom.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GitMerge className="h-5 w-5 text-primary" />
                Sáp nhập từ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ward.mergedFrom.map((name, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Landmarks */}
        {ward.landmarks.length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Landmark className="h-5 w-5 text-info-badge" />
                Địa điểm nổi bật ({ward.landmarks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {ward.landmarks.map((landmark, index) => (
                  <li key={index} className="landmark-card">
                    <p className="text-sm leading-relaxed">{landmark}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Landmark className="h-5 w-5 text-info-badge" />
                Địa điểm nổi bật
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground italic">Chưa có dữ liệu chi tiết.</p>
            </CardContent>
          </Card>
        )}

        {/* Specialties */}
        {ward.specialties.length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UtensilsCrossed className="h-5 w-5 text-accent" />
                Đặc sản ({ward.specialties.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {ward.specialties.map((specialty, index) => (
                  <li key={index} className="specialty-card">
                    <p className="text-sm leading-relaxed">{specialty}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UtensilsCrossed className="h-5 w-5 text-accent" />
                Đặc sản
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground italic">Chưa có dữ liệu chi tiết.</p>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {ward.description ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Mô tả
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/90">
                {ward.description}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Mô tả
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground italic">Chưa có dữ liệu chi tiết.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
