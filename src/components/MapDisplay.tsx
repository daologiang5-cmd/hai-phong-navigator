import haiPhongMap from '@/assets/hai-phong-map.png';

export function MapDisplay() {
  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border bg-card">
      <div className="map-header px-4 py-3">
        <h2 className="text-lg font-semibold text-center">
          Bản đồ Hành chính Hải Phòng sau sáp nhập
        </h2>
      </div>
      <div className="relative w-full" style={{ maxHeight: '400px', overflow: 'auto' }}>
        <img
          src={haiPhongMap}
          alt="Bản đồ hành chính Hải Phòng"
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}
