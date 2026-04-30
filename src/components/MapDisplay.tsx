import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L, { GeoJSON as LGeoJSON, Layer, LeafletMouseEvent, Map as LMap } from 'leaflet';
import { useTheme } from 'next-themes';
import { Search, X } from 'lucide-react';
import { wards, getWardByName, searchWards } from '@/data/wardsData';
import { Ward } from '@/types/ward';
import { normalizeWardName } from '@/utils/parseMarkdown';

interface MapDisplayProps {
  selectedWard: Ward | null;
  onSelectWard: (ward: Ward | null) => void;
}

const GEOJSON_URL = '/hai-phong-wards.geojson';
const HP_CENTER: [number, number] = [20.85, 106.68];
const HP_ZOOM = 10;

function stripPrefix(name: string): string {
  return name.replace(/^(Phường|Xã|Đặc khu|Thị trấn)\s+/u, '').trim();
}

function matchWardFromFeatureName(featureName: string): Ward | undefined {
  const stripped = normalizeWardName(stripPrefix(featureName));
  return (
    getWardByName(stripped) ||
    wards.find((w) => normalizeWardName(w.name).toLowerCase() === stripped.toLowerCase())
  );
}

function FlyToSelected({
  selectedWard,
  layersRef,
}: {
  selectedWard: Ward | null;
  layersRef: React.MutableRefObject<Map<string, Layer>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedWard) return;
    const key = normalizeWardName(selectedWard.name).toLowerCase();
    const layer = layersRef.current.get(key) as L.Path | undefined;
    if (layer && (layer as any).getBounds) {
      const bounds = (layer as any).getBounds();
      map.flyToBounds(bounds, { padding: [40, 40], duration: 1.1, maxZoom: 13 });
    }
  }, [selectedWard, map, layersRef]);
  return null;
}

export function MapDisplay({ selectedWard, onSelectWard }: MapDisplayProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [search, setSearch] = useState('');
  const [openSuggest, setOpenSuggest] = useState(false);
  const mapRef = useRef<LMap | null>(null);
  const geoLayerRef = useRef<LGeoJSON | null>(null);
  const layersRef = useRef<Map<string, Layer>>(new Map());

  useEffect(() => {
    let cancelled = false;
    fetch(GEOJSON_URL)
      .then((r) => r.json())
      .then((d) => !cancelled && setGeo(d))
      .catch((e) => console.error('[Map] failed to load geojson', e));
    return () => {
      cancelled = true;
    };
  }, []);

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const tileAttr =
    '&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  const baseStyle = useMemo(
    () => ({
      color: isDark ? '#f1f5f9' : '#1f2937',
      weight: 1,
      fillColor: isDark ? '#fca5a5' : '#fecaca',
      fillOpacity: 0.18,
      opacity: 0.9,
    }),
    [isDark]
  );
  const hoverStyle = {
    color: '#7f1d1d',
    weight: 2.2,
    fillColor: '#f59e0b',
    fillOpacity: 0.55,
  };
  const selectedStyle = {
    color: '#7f1d1d',
    weight: 3,
    fillColor: '#FF0000',
    fillOpacity: 0.6,
  };

  useEffect(() => {
    const gl = geoLayerRef.current;
    if (!gl) return;
    const selectedKey = selectedWard
      ? normalizeWardName(selectedWard.name).toLowerCase()
      : null;
    gl.eachLayer((layer: any) => {
      const key = layer.__wardKey as string | undefined;
      if (!key) return;
      if (key === selectedKey) layer.setStyle(selectedStyle);
      else layer.setStyle(baseStyle);
    });
  }, [selectedWard, baseStyle]);

  const onEachFeature = (feature: GeoJSON.Feature, layer: Layer) => {
    const featName = (feature.properties as any)?.name as string;
    if (!featName) return;
    const ward = matchWardFromFeatureName(featName);
    const key = ward
      ? normalizeWardName(ward.name).toLowerCase()
      : normalizeWardName(stripPrefix(featName)).toLowerCase();

    (layer as any).__wardKey = key;
    layersRef.current.set(key, layer);

    layer.bindTooltip(featName, {
      sticky: true,
      direction: 'top',
      className: 'hp-ward-tooltip',
    });

    layer.on({
      mouseover: (e: LeafletMouseEvent) => {
        const l = e.target as L.Path;
        const isSelected = selectedWard
          ? key === normalizeWardName(selectedWard.name).toLowerCase()
          : false;
        if (!isSelected) l.setStyle(hoverStyle);
        l.bringToFront();
      },
      mouseout: (e: LeafletMouseEvent) => {
        const l = e.target as L.Path;
        const isSelected = selectedWard
          ? key === normalizeWardName(selectedWard.name).toLowerCase()
          : false;
        l.setStyle(isSelected ? selectedStyle : baseStyle);
      },
      click: () => {
        if (ward) onSelectWard(ward);
      },
    });
  };

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    return searchWards(search).slice(0, 8);
  }, [search]);

  const handlePick = (w: Ward) => {
    onSelectWard(w);
    setSearch(w.name);
    setOpenSuggest(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative w-full overflow-hidden rounded-xl border border-border bg-card/70 backdrop-blur-md shadow-lg"
    >
      <div className="map-header px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold whitespace-nowrap">
          Bản đồ Hành chính Hải Phòng
        </h2>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpenSuggest(true);
            }}
            onFocus={() => setOpenSuggest(true)}
            onBlur={() => setTimeout(() => setOpenSuggest(false), 150)}
            placeholder="Tìm phường/xã..."
            className="w-full h-9 pl-9 pr-9 rounded-md bg-background/90 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              aria-label="Clear"
              onClick={() => {
                setSearch('');
                setOpenSuggest(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {openSuggest && suggestions.length > 0 && (
            <ul className="absolute z-[1100] mt-1 w-full max-h-72 overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-xl">
              {suggestions.map((w) => (
                <li
                  key={w.name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePick(w)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  {w.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="relative h-[520px] w-full">
        <MapContainer
          center={HP_CENTER}
          zoom={HP_ZOOM}
          minZoom={8}
          maxZoom={16}
          scrollWheelZoom
          className="h-full w-full"
          ref={(m) => {
            if (m) mapRef.current = m;
          }}
        >
          <TileLayer url={tileUrl} attribution={tileAttr} />
          {geo && (
            <GeoJSON
              key={isDark ? 'dark' : 'light'}
              data={geo}
              style={() => baseStyle}
              onEachFeature={onEachFeature}
              ref={(r) => {
                geoLayerRef.current = r as unknown as LGeoJSON;
              }}
            />
          )}
          <FlyToSelected selectedWard={selectedWard} layersRef={layersRef} />
        </MapContainer>
      </div>

      {selectedWard && (
        <div className="absolute bottom-3 left-3 z-[1000] px-3 py-2 rounded-lg bg-card/90 backdrop-blur-md border border-border shadow flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium">{selectedWard.name}</span>
          <button
            aria-label="Close"
            onClick={() => onSelectWard(null)}
            className="ml-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}