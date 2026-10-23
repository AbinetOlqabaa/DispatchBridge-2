import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Truck,
  Warehouse,
  Store,
  Navigation,
  Compass,
  Gauge,
  Clock,
  Radio,
  Copy,
  CheckCircle,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Route,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Dispatch } from '../../types/dispatch.js';
import { api } from '../../services/api.js';

interface DispatchTrackingMapProps {
  dispatch: Dispatch;
  onTelemetryUpdate?: (updated: Dispatch) => void;
}

// Haversine distance calculator in kilometers
function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Convert heading degrees to cardinal direction
function headingToCardinal(deg?: number): string {
  if (deg === undefined) return 'N/A';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((deg % 360) / 45)) % 8;
  return `${deg}° ${directions[index]}`;
}

export const DispatchTrackingMap: React.FC<DispatchTrackingMapProps> = ({
  dispatch,
  onTelemetryUpdate,
}) => {
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeTooltip, setActiveTooltip] = useState<'ORIGIN' | 'VEHICLE' | 'DESTINATION' | null>(null);
  const [isSimulatingPing, setIsSimulatingPing] = useState(false);
  const [pingSuccessMsg, setPingSuccessMsg] = useState<string | null>(null);

  // 1. Resolve Origin Coordinates
  const originCoords = useMemo(() => {
    if (dispatch.originLocationSnapshot?.latitude && dispatch.originLocationSnapshot?.longitude) {
      return {
        lat: dispatch.originLocationSnapshot.latitude,
        lng: dispatch.originLocationSnapshot.longitude,
      };
    }
    // Default fallback to Chicago
    return { lat: 41.8781, lng: -87.6298 };
  }, [dispatch]);

  // 2. Resolve Destination Coordinates
  const destCoords = useMemo(() => {
    if (dispatch.destinationSnapshot?.latitude && dispatch.destinationSnapshot?.longitude) {
      return {
        lat: dispatch.destinationSnapshot.latitude,
        lng: dispatch.destinationSnapshot.longitude,
      };
    }
    // Default fallback to Minneapolis
    return { lat: 44.9866, lng: -93.2581 };
  }, [dispatch]);

  // 3. Resolve Current Coordinates
  const currentCoords = useMemo(() => {
    if (dispatch.currentCoordinates?.latitude && dispatch.currentCoordinates?.longitude) {
      return {
        lat: dispatch.currentCoordinates.latitude,
        lng: dispatch.currentCoordinates.longitude,
        updatedAt: dispatch.currentCoordinates.updatedAt || dispatch.updatedAt,
        speedKmh: dispatch.currentCoordinates.speedKmh ?? (dispatch.status === 'IN_TRANSIT' ? 84 : 0),
        heading: dispatch.currentCoordinates.heading ?? 315,
        checkpointName: dispatch.currentCoordinates.checkpointName || 'Active Transit Corridor',
        source: dispatch.currentCoordinates.source || 'GPS',
      };
    }
    // If delivery is already received/reconciled, vehicle is at destination
    if (['RECEIVED', 'PARTIALLY_RECEIVED', 'RECONCILED'].includes(dispatch.status)) {
      return {
        lat: destCoords.lat,
        lng: destCoords.lng,
        updatedAt: dispatch.receivedAt || dispatch.updatedAt,
        speedKmh: 0,
        heading: 0,
        checkpointName: `${dispatch.partnerName} Receiving Dock`,
        source: 'CHECKPOINT' as const,
      };
    }
    // If not started, vehicle is at origin
    return {
      lat: originCoords.lat,
      lng: originCoords.lng,
      updatedAt: dispatch.dispatchedAt,
      speedKmh: 0,
      heading: 0,
      checkpointName: dispatch.originLocationSnapshot?.label || 'Dispatch Dock',
      source: 'CHECKPOINT' as const,
    };
  }, [dispatch, originCoords, destCoords]);

  // 4. Distances & Progress Metrics
  const totalTripDistanceKm = useMemo(() => {
    return calculateHaversineDistanceKm(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
  }, [originCoords, destCoords]);

  const coveredDistanceKm = useMemo(() => {
    return calculateHaversineDistanceKm(originCoords.lat, originCoords.lng, currentCoords.lat, currentCoords.lng);
  }, [originCoords, currentCoords]);

  const remainingDistanceKm = useMemo(() => {
    return calculateHaversineDistanceKm(currentCoords.lat, currentCoords.lng, destCoords.lat, destCoords.lng);
  }, [currentCoords, destCoords]);

  const progressPercentage = useMemo(() => {
    if (['RECEIVED', 'PARTIALLY_RECEIVED', 'RECONCILED'].includes(dispatch.status)) return 100;
    if (totalTripDistanceKm <= 0) return 0;
    const pct = Math.round((coveredDistanceKm / totalTripDistanceKm) * 100);
    return Math.min(100, Math.max(0, pct));
  }, [coveredDistanceKm, totalTripDistanceKm, dispatch.status]);

  // 5. SVG Projection Mapping
  // Compute lat/lng bounds with safety margin
  const projection = useMemo(() => {
    const lats = [originCoords.lat, destCoords.lat, currentCoords.lat];
    const lngs = [originCoords.lng, destCoords.lng, currentCoords.lng];

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = Math.max(maxLat - minLat, 1.2);
    const lngSpan = Math.max(maxLng - minLng, 1.5);

    // SVG coordinate space
    const width = 800;
    const height = 360;
    const paddingX = 80;
    const paddingY = 60;

    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY * 2;

    const project = (lat: number, lng: number) => {
      // Latitude: higher is further North (top of map, so smaller Y)
      const yNorm = (maxLat - lat) / latSpan;
      // Longitude: higher is further East (right of map, larger X)
      const xNorm = (lng - minLng) / lngSpan;

      const baseCenterX = width / 2;
      const baseCenterY = height / 2;

      const rawX = paddingX + xNorm * usableWidth;
      const rawY = paddingY + yNorm * usableHeight;

      // Apply zoom centering around current vehicle
      const currentRawX = paddingX + ((currentCoords.lng - minLng) / lngSpan) * usableWidth;
      const currentRawY = paddingY + ((maxLat - currentCoords.lat) / latSpan) * usableHeight;

      const zoomOriginX = zoomLevel > 1 ? currentRawX : baseCenterX;
      const zoomOriginY = zoomLevel > 1 ? currentRawY : baseCenterY;

      const x = zoomOriginX + (rawX - zoomOriginX) * zoomLevel;
      const y = zoomOriginY + (rawY - zoomOriginY) * zoomLevel;

      return { x, y };
    };

    return {
      width,
      height,
      origin: project(originCoords.lat, originCoords.lng),
      destination: project(destCoords.lat, destCoords.lng),
      vehicle: project(currentCoords.lat, currentCoords.lng),
    };
  }, [originCoords, destCoords, currentCoords, zoomLevel]);

  const handleCopyCoordinates = () => {
    const text = `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2200);
  };

  // Live GPS Telemetry Simulation Action
  const handleSimulateGpsPing = async () => {
    setIsSimulatingPing(true);
    setPingSuccessMsg(null);
    try {
      // Advance coordinates along the vector towards destination
      const advanceFraction = 0.25; // advance 25% further towards destination
      const nextLat = currentCoords.lat + (destCoords.lat - currentCoords.lat) * advanceFraction;
      const nextLng = currentCoords.lng + (destCoords.lng - currentCoords.lng) * advanceFraction;

      const updated = await api.updateDispatchTelemetry(dispatch.id, {
        latitude: parseFloat(nextLat.toFixed(5)),
        longitude: parseFloat(nextLng.toFixed(5)),
        speedKmh: Math.floor(75 + Math.random() * 20),
        heading: 310,
        checkpointName: `En Route Waypoint Mile ${(coveredDistanceKm + 45).toFixed(0)}`,
        source: 'GPS',
      });

      if (onTelemetryUpdate) {
        onTelemetryUpdate(updated);
      }
      setPingSuccessMsg(`Telemetry GPS ping recorded: ${nextLat.toFixed(4)}° N, ${Math.abs(nextLng).toFixed(4)}° W`);
      setTimeout(() => setPingSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Failed to simulate GPS ping:', err);
    } finally {
      setIsSimulatingPing(false);
    }
  };

  const isDelivered = ['RECEIVED', 'PARTIALLY_RECEIVED', 'RECONCILED'].includes(dispatch.status);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg space-y-0">
      {/* 1. Telemetry Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800/80">
              <Radio className="w-3 h-3 text-sky-400 animate-pulse" />
              Live Telemetry & Geo-Coordinates
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Source: {currentCoords.source}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Navigation className="w-4 h-4 text-sky-400" />
              {currentCoords.checkpointName}
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ({currentCoords.lat.toFixed(5)}° N, {Math.abs(currentCoords.lng).toFixed(5)}° W)
            </span>
          </div>
        </div>

        {/* Action Buttons: Copy Coords, Simulate Ping, External Maps */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Simulate Ping Button */}
          {!isDelivered && (
            <button
              onClick={handleSimulateGpsPing}
              disabled={isSimulatingPing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/70 hover:bg-sky-900 text-sky-300 border border-sky-800/60 text-xs font-semibold cursor-pointer transition-colors"
              title="Record next live GPS telemetry waypoint"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingPing ? 'animate-spin' : ''}`} />
              <span>{isSimulatingPing ? 'Pinging...' : 'Simulate GPS Ping'}</span>
            </button>
          )}

          {/* Copy Coordinates */}
          <button
            onClick={handleCopyCoordinates}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            title="Copy latitude and longitude coordinates"
          >
            {copiedCoords ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Lat/Lng</span>
              </>
            )}
          </button>

          {/* External Map Link */}
          <a
            href={`https://www.google.com/maps?q=${currentCoords.lat},${currentCoords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            title="View exact geo-coordinates on Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            <span>Open in Maps</span>
          </a>
        </div>
      </div>

      {/* Ping Success Banner */}
      {pingSuccessMsg && (
        <div className="bg-sky-950/80 border-b border-sky-800/80 px-5 py-2 text-xs text-sky-200 flex items-center gap-2 animate-fade-in">
          <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse shrink-0" />
          <span>{pingSuccessMsg}</span>
        </div>
      )}

      {/* 2. Interactive SVG Map Canvas */}
      <div className="relative w-full h-80 sm:h-96 bg-slate-950 overflow-hidden select-none">
        {/* Map Grid Background Pattern */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <defs>
            <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>

        {/* Vector SVG Map Layer */}
        <svg
          viewBox={`0 0 ${projection.width} ${projection.height}`}
          className="w-full h-full transition-transform duration-300"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Subtle Radar/Compass rings in background */}
          <circle
            cx={projection.vehicle.x}
            cy={projection.vehicle.y}
            r="90"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="0.5"
            strokeDasharray="4,4"
            className="opacity-30"
          />
          <circle
            cx={projection.vehicle.x}
            cy={projection.vehicle.y}
            r="160"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="0.5"
            strokeDasharray="6,6"
            className="opacity-15"
          />

          {/* 1. Full Planned Corridor Path (Dashed background vector) */}
          <line
            x1={projection.origin.x}
            y1={projection.origin.y}
            x2={projection.destination.x}
            y2={projection.destination.y}
            stroke="#334155"
            strokeWidth="4"
            strokeDasharray="6,6"
          />

          {/* 2. Covered Route Segment (Solid Sky Glow Vector) */}
          <line
            x1={projection.origin.x}
            y1={projection.origin.y}
            x2={projection.vehicle.x}
            y2={projection.vehicle.y}
            stroke="#0ea5e9"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* 3. Remaining Vector Path (Amber dashed line to destination) */}
          {!isDelivered && (
            <line
              x1={projection.vehicle.x}
              y1={projection.vehicle.y}
              x2={projection.destination.x}
              y2={projection.destination.y}
              stroke="#f59e0b"
              strokeWidth="3"
              strokeDasharray="5,5"
              strokeOpacity="0.8"
            />
          )}

          {/* 4. Origin Dock Pin */}
          <g
            transform={`translate(${projection.origin.x}, ${projection.origin.y})`}
            className="cursor-pointer"
            onClick={() => setActiveTooltip('ORIGIN')}
          >
            <circle r="18" fill="#1e293b" stroke="#3b82f6" strokeWidth="2.5" />
            <Warehouse x="-9" y="-9" width="18" height="18" className="text-blue-400" />
            <text
              y="32"
              textAnchor="middle"
              className="fill-slate-300 font-sans font-semibold text-[11px] drop-shadow"
            >
              {dispatch.originLocationSnapshot?.label || 'Origin Dock'}
            </text>
          </g>

          {/* 5. Destination Partner Dock Pin */}
          <g
            transform={`translate(${projection.destination.x}, ${projection.destination.y})`}
            className="cursor-pointer"
            onClick={() => setActiveTooltip('DESTINATION')}
          >
            <circle r="18" fill="#064e3b" stroke="#10b981" strokeWidth="2.5" />
            <Store x="-9" y="-9" width="18" height="18" className="text-emerald-400" />
            <text
              y="32"
              textAnchor="middle"
              className="fill-emerald-300 font-sans font-semibold text-[11px] drop-shadow"
            >
              {dispatch.partnerName}
            </text>
          </g>

          {/* 6. Active Delivery Vehicle Pin (With Animated Pulse Radar Rings) */}
          <g
            transform={`translate(${projection.vehicle.x}, ${projection.vehicle.y})`}
            className="cursor-pointer"
            onClick={() => setActiveTooltip('VEHICLE')}
          >
            {/* Animated Radar Pulse Rings */}
            {!isDelivered && (
              <>
                <circle r="26" fill="#38bdf8" opacity="0.25">
                  <animate
                    attributeName="r"
                    values="16;42"
                    dur="2.2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.5;0"
                    dur="2.2s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle r="18" fill="#0284c7" opacity="0.4" />
              </>
            )}

            {/* Vehicle Icon Badge */}
            <circle
              r="17"
              fill={isDelivered ? '#059669' : '#0284c7'}
              stroke="#ffffff"
              strokeWidth="2.5"
              className="shadow-lg"
            />
            <Truck
              x="-8"
              y="-8"
              width="16"
              height="16"
              className="text-white"
            />

            {/* Vehicle Code Label */}
            <text
              y="-24"
              textAnchor="middle"
              className="fill-sky-300 font-mono font-bold text-[10px] bg-slate-900 px-1 py-0.5 rounded shadow"
            >
              {dispatch.vehicleReg || 'TRK-LIVE'}
            </text>
          </g>
        </svg>

        {/* Map Control Overlays: Zoom & Fit */}
        <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-10">
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.35))}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-md cursor-pointer transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.35))}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-md cursor-pointer transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-md cursor-pointer transition-colors"
            title="Reset to Fit Route Bounds"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Live Vehicle Floating HUD */}
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 shadow-2xl z-10 space-y-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isDelivered ? 'bg-emerald-400' : 'bg-sky-400 animate-pulse'}`} />
              <span className="text-xs font-bold text-white font-mono">
                {dispatch.dispatchNumber} • {dispatch.vehicleReg || 'TRK-CORRIDOR'}
              </span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400 bg-sky-950 px-2 py-0.5 rounded-full border border-sky-800">
              {progressPercentage}% Completed
            </span>
          </div>

          {/* Telemetry Stats Grid: Coordinates, Speed, Heading, Last Ping */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400" /> Latitude
              </div>
              <div className="font-mono font-semibold text-slate-200">
                {currentCoords.lat.toFixed(5)}° N
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400" /> Longitude
              </div>
              <div className="font-mono font-semibold text-slate-200">
                {Math.abs(currentCoords.lng).toFixed(5)}° W
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-amber-400" /> Speed
              </div>
              <div className="font-mono font-semibold text-slate-200">
                {currentCoords.speedKmh} km/h
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Compass className="w-3 h-3 text-indigo-400" /> Heading
              </div>
              <div className="font-mono font-semibold text-slate-200">
                {headingToCardinal(currentCoords.heading)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Progress Metric Footbar */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="space-y-2">
          {/* Progress Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Warehouse className="w-3.5 h-3.5 text-blue-400" />
              <span>{originCoords.lat.toFixed(4)}°, {originCoords.lng.toFixed(4)}°</span>
            </span>
            <span className="font-medium text-slate-300">
              {coveredDistanceKm.toFixed(0)} km covered • {remainingDistanceKm.toFixed(0)} km remaining
            </span>
            <span className="flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span>{destCoords.lat.toFixed(4)}°, {destCoords.lng.toFixed(4)}°</span>
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-500 h-full rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Last GPS Ping: {new Date(currentCoords.updatedAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Carrier:</span>
              <span className="text-slate-300 font-medium">{dispatch.driverName || 'Designated Driver'} ({dispatch.driverPhone || 'Radio dispatched'})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
