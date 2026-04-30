import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';
import haiPhongMap from '@/assets/hai-phong-map.png';
import { wards, getWardByName } from '@/data/wardsData';
import { Ward } from '@/types/ward';

/**
 * Hotspots are positioned as percentages over the PNG map.
 * Each hotspot maps to a ward name from the parsed markdown data.
 * Shapes are approximate clickable regions, not exact district boundaries.
 */
type Hotspot = {
  id: string;
  label: string;
  wardName: string; // must match a ward name in wardsData
  // ellipse hotspot (percent of image)
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

const HOTSPOTS: Hotspot[] = [
  { id: 'bach-long-vi', label: 'Đặc khu Bạch Long Vĩ', wardName: 'Bạch Long Vĩ', cx: 84, cy: 39, rx: 4, ry: 4 },
  { id: 'cat-hai', label: 'Đặc khu Cát Hải', wardName: 'Cát Hải', cx: 73, cy: 56, rx: 8, ry: 7 },
  { id: 'hong-bang', label: 'Phường Hồng Bàng', wardName: 'Hồng Bàng', cx: 55, cy: 60, rx: 4, ry: 3.5 },
  { id: 'le-chan', label: 'Phường Lê Chân', wardName: 'Lê Chân', cx: 51, cy: 61, rx: 3.5, ry: 3 },
  { id: 'ngo-quyen', label: 'Phường Ngô Quyền', wardName: 'Ngô Quyền', cx: 58, cy: 58, rx: 3.5, ry: 3 },
  { id: 'hai-an', label: 'Phường Hải An', wardName: 'Hải An', cx: 62, cy: 60, rx: 3.5, ry: 3 },
  { id: 'duong-kinh', label: 'Phường Dương Kinh', wardName: 'Dương Kinh', cx: 60, cy: 67, rx: 3.5, ry: 3 },
  { id: 'do-son', label: 'Phường Đồ Sơn', wardName: 'Đồ Sơn', cx: 64, cy: 70, rx: 3.5, ry: 3 },
  { id: 'kien-an', label: 'Phường Kiến An', wardName: 'Kiến An', cx: 50, cy: 65, rx: 3.5, ry: 3 },
  { id: 'an-duong', label: 'Phường An Dương', wardName: 'An Dương', cx: 47, cy: 60, rx: 3.5, ry: 3 },
  { id: 'thuy-nguyen', label: 'Phường Thủy Nguyên', wardName: 'Thủy Nguyên', cx: 55, cy: 50, rx: 4, ry: 3.5 },
  { id: 'vinh-bao', label: 'Xã Vĩnh Bảo', wardName: 'Vĩnh Bảo', cx: 38, cy: 78, rx: 4, ry: 3.5 },
  { id: 'tien-lang', label: 'Xã Tiên Lãng', wardName: 'Tiên Lãng', cx: 48, cy: 75, rx: 4, ry: 3.5 },
  { id: 'cam-giang', label: 'Xã Cẩm Giàng', wardName: 'Cẩm Giàng', cx: 17, cy: 41, rx: 3.5, ry: 3 },
  { id: 'kinh-mon', label: 'Phường Kinh Môn', wardName: 'Kinh Môn', cx: 35, cy: 35, rx: 4, ry: 3.5 },
];

interface MapDisplayProps {
  selectedWard: Ward | null;
  onSelectWard: (ward: Ward) => void;
}

export function MapDisplay({ selectedWard, onSelectWard }: MapDisplayProps) {
  const [hovered, setHovered] = useState<Hotspot | null>(null);

  // Filter hotspots to only those that resolve to an actual parsed ward
  const validHotspots = useMemo(
    () => HOTSPOTS.filter((h) => !!getWardByName(h.wardName)),
    []
  );

  const handleClick = (h: Hotspot) => {
    const ward = getWardByName(h.wardName);
    if (ward) onSelectWard(ward);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative w-full overflow-hidden rounded-xl border border-border bg-card/70 backdrop-blur-md shadow-lg"
    >
      <div className="map-header px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Bản đồ Hành chính Hải Phòng</h2>
        <span className="text-xs opacity-80 hidden sm:inline">
          Di chuột / chạm vào điểm để xem · cuộn để phóng to
        </span>
      </div>

      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={5}
        wheel={{ step: 0.15 }}
        doubleClick={{ mode: 'toggle' }}
        pinch={{ step: 5 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom controls */}
            <div className="absolute top-16 right-3 z-20 flex flex-col gap-2">
              <button
                onClick={() => zoomIn()}
                aria-label="Zoom in"
                className="h-9 w-9 rounded-full bg-card/80 backdrop-blur border border-border shadow flex items-center justify-center hover:bg-card transition"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => zoomOut()}
                aria-label="Zoom out"
                className="h-9 w-9 rounded-full bg-card/80 backdrop-blur border border-border shadow flex items-center justify-center hover:bg-card transition"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => resetTransform()}
                aria-label="Reset view"
                className="h-9 w-9 rounded-full bg-card/80 backdrop-blur border border-border shadow flex items-center justify-center hover:bg-card transition"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            <TransformComponent
              wrapperClass="!w-full"
              contentClass="!w-full"
            >
              <div className="relative w-full select-none">
                <img
                  src={haiPhongMap}
                  alt="Bản đồ hành chính Hải Phòng"
                  className="w-full h-auto block dark:brightness-90 dark:contrast-110"
                  draggable={false}
                />

                {/* SVG overlay with interactive hotspots */}
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full"
                >
                  {validHotspots.map((h) => {
                    const isActive = selectedWard?.name === h.wardName;
                    const isHover = hovered?.id === h.id;
                    return (
                      <g key={h.id}>
                        {/* Glow ring on hover/active */}
                        {(isHover || isActive) && (
                          <ellipse
                            cx={h.cx}
                            cy={h.cy}
                            rx={h.rx + 1.2}
                            ry={h.ry + 1.2}
                            className="fill-primary/20"
                          >
                            <animate
                              attributeName="opacity"
                              values="0.4;0.9;0.4"
                              dur="1.6s"
                              repeatCount="indefinite"
                            />
                          </ellipse>
                        )}
                        <ellipse
                          cx={h.cx}
                          cy={h.cy}
                          rx={h.rx}
                          ry={h.ry}
                          className={[
                            'cursor-pointer transition-all duration-200',
                            isActive
                              ? 'fill-primary/40 stroke-primary'
                              : isHover
                              ? 'fill-primary/25 stroke-primary'
                              : 'fill-primary/0 stroke-primary/0 hover:fill-primary/15 hover:stroke-primary',
                          ].join(' ')}
                          strokeWidth={0.4}
                          vectorEffect="non-scaling-stroke"
                          onMouseEnter={() => setHovered(h)}
                          onMouseLeave={() => setHovered((cur) => (cur?.id === h.id ? null : cur))}
                          onClick={() => handleClick(h)}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Tooltip */}
                <AnimatePresence>
                  {hovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        left: `${hovered.cx}%`,
                        top: `${hovered.cy - hovered.ry - 1}%`,
                      }}
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-full px-3 py-1.5 rounded-md bg-popover/90 backdrop-blur-md border border-border text-popover-foreground text-xs font-medium shadow-lg whitespace-nowrap z-10"
                    >
                      {hovered.label}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Selected ward badge */}
      <AnimatePresence>
        {selectedWard && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute bottom-3 left-3 z-20 px-3 py-2 rounded-lg bg-card/80 backdrop-blur-md border border-border shadow flex items-center gap-2"
          >
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium">{selectedWard.name}</span>
            <button
              aria-label="Close"
              onClick={() => onSelectWard(null as unknown as Ward)}
              className="ml-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}