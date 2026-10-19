import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSentinelStore } from '../../store/useSentinelStore';
import { ZONES } from '../../types';
import type { ZoneId } from '../../types';

const ZONE_LABEL_ANCHORS: Record<ZoneId, [number, number, number]> = {
  RESEARCH_LAB: [-5.8, 2.1, -4.5],
  CHEMICAL_LAB: [4.6, 2.1, -3.2],
  RESTRICTED_STORAGE: [-5.8, 2.1, 3.8],
  CONTROL_ROOM: [4.6, 2.1, 4.6],
};

const ALL_ZONES: ZoneId[] = [
  'RESEARCH_LAB',
  'CHEMICAL_LAB',
  'RESTRICTED_STORAGE',
  'CONTROL_ROOM',
];

interface TrackerProps {
  labelRefs: Record<ZoneId, React.RefObject<HTMLDivElement | null>>;
}

/**
 * Inside-Canvas tracker that projects 3D zone coordinates to 2D screen coordinates
 * and directly updates DOM transforms on HTML overlay elements.
 * This completely avoids Drei's <Html> nested ReactDOM.createRoot lifecycle in React 19.
 */
export const FloatingZoneLabelsTracker: React.FC<TrackerProps> = ({ labelRefs }) => {
  const tempVec = useRef(new THREE.Vector3());
  const refsHolder = useRef(labelRefs);

  useEffect(() => {
    refsHolder.current = labelRefs;
  }, [labelRefs]);

  useFrame(({ camera, size }) => {
    const currentRefs = refsHolder.current;
    for (const zoneId of ALL_ZONES) {
      const el = currentRefs[zoneId]?.current;
      if (!el) continue;

      const anchor = ZONE_LABEL_ANCHORS[zoneId];
      const vec = tempVec.current.set(anchor[0], anchor[1], anchor[2]);
      vec.project(camera);

      // Check if anchor is behind camera
      if (vec.z > 1.0) {
        // oxlint-disable-next-line react/immutability
        el.style.display = 'none';
        continue;
      }

      const x = (vec.x * 0.5 + 0.5) * size.width;
      const y = (-(vec.y * 0.5) + 0.5) * size.height;

      // Subtle perspective distance factor scaling
      const dist = camera.position.distanceTo(tempVec.current.set(anchor[0], anchor[1], anchor[2]));
      const vFOV = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
      const scaleFOV = 2 * Math.tan(vFOV / 2) * dist;
      const scale = Math.max(0.70, Math.min(1.25, (1 / scaleFOV) * 26));

      el.style.display = 'flex';
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
    }
  });

  return null;
};

interface LabelItemProps {
  id: ZoneId;
}

export const FloatingZoneLabelItem = React.forwardRef<HTMLDivElement, LabelItemProps>(
  ({ id }, ref) => {
    const selectedZoneId = useSentinelStore(state => state.selectedZoneId);
    const selectZone = useSentinelStore(state => state.selectZone);
    const getZoneOperationalState = useSentinelStore(state => state.getZoneOperationalState);
    const getZoneStatus = useSentinelStore(state => state.getZoneStatus);
    const activeIncidents = useSentinelStore(state => state.activeIncidents);

    const isSelected = selectedZoneId === id;
    const opState = getZoneOperationalState(id);
    const status = getZoneStatus(id);
    const zoneInfo = ZONES[id];
    const zoneIncident = activeIncidents.find(inc => inc.zoneId === id);

    let statusText = opState.label;
    let statusBadgeClass = 'border-emerald-500/40 text-emerald-400 bg-emerald-950/80';

    if (opState.status === 'ACTIVE_HAZARD') {
      statusText = 'CRITICAL EMERGENCY';
      statusBadgeClass = 'border-red-500 text-red-400 bg-red-950/90 shadow-lg shadow-red-900/50 animate-pulse';
    } else if (opState.status === 'RESPONSE_IN_PROGRESS') {
      statusText = 'RESPONSE IN PROGRESS';
      statusBadgeClass = 'border-amber-500 text-amber-300 bg-amber-950/90 animate-pulse';
    } else if (opState.status === 'HAZARD_CONTAINED' || opState.status === 'AWAITING_SAFETY_VERIFICATION') {
      statusText = 'CONTAINED (VERIF PENDING)';
      statusBadgeClass = 'border-amber-500 text-amber-300 bg-amber-950/90';
    } else if (opState.status === 'VERIFIED_SAFE_AWAITING_CLOSURE') {
      statusText = 'VERIFIED SAFE (AWAITING CLOSURE)';
      statusBadgeClass = 'border-cyan-500 text-cyan-300 bg-cyan-950/90';
    } else if (opState.status === 'INCIDENT_RESOLVED_RECOVERY_PENDING') {
      statusText = 'RESOLVED (RECOVERY PENDING)';
      statusBadgeClass = 'border-purple-500 text-purple-300 bg-purple-950/90';
    } else if (opState.status === 'RESET_REQUIRED') {
      statusText = 'RESET REQUIRED';
      statusBadgeClass = 'border-blue-500 text-blue-300 bg-blue-950/90';
    } else if (opState.status === 'ALARM_RETAINED') {
      statusText = 'ALARM RETAINED';
      statusBadgeClass = 'border-purple-500 text-purple-300 bg-purple-950/90';
    } else if (opState.status === 'EQUIPMENT_RECOVERY_REQUIRED') {
      statusText = 'RECOVERY REQUIRED';
      statusBadgeClass = 'border-purple-500 text-purple-300 bg-purple-950/90';
    } else if (opState.status === 'DIAGNOSTIC_FAULT') {
      statusText = 'DIAGNOSTIC FAULT';
      statusBadgeClass = 'border-yellow-500 text-yellow-300 bg-yellow-950/90';
    } else {
      statusText = 'NOMINAL';
      statusBadgeClass = 'border-emerald-500/40 text-emerald-400 bg-emerald-950/80';
    }

    return (
      <div
        ref={ref}
        data-zone-id={id}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'none',
          willChange: 'transform',
        }}
        className="pointer-events-none select-none transition-opacity duration-150"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            selectZone(id);
          }}
          className={`pointer-events-auto px-2.5 py-1.5 rounded border backdrop-blur-md flex flex-col items-center gap-0.5 shadow-xl transition-all cursor-pointer hover:brightness-125 focus:outline-none ${isSelected ? 'ring-2 ring-cyan-400 scale-105' : ''
            } ${statusBadgeClass}`}
          title={`Click to inspect ${zoneInfo.name} (${zoneInfo.code})`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-wider font-semibold uppercase whitespace-nowrap">
            <span
              className={`w-2 h-2 rounded-full ${status === 'critical'
                  ? 'bg-red-400 animate-ping'
                  : status === 'acknowledged'
                    ? 'bg-purple-400'
                    : status === 'warning'
                      ? 'bg-amber-400 animate-pulse'
                      : status === 'fault'
                        ? 'bg-orange-400'
                        : 'bg-emerald-400'
                }`}
            />
            <span>
              {zoneInfo.code} • {zoneInfo.name}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[9px] font-mono tracking-wide opacity-90 whitespace-nowrap">
            {statusText}
            {zoneIncident && (
              <span className="font-bold text-red-300 ml-1">
                [{zoneIncident.category.replace('_', ' ')}]
              </span>
            )}
          </div>
        </button>
      </div>
    );
  }
);

FloatingZoneLabelItem.displayName = 'FloatingZoneLabelItem';

interface OverlayProps {
  labelRefs: Record<ZoneId, React.RefObject<HTMLDivElement | null>>;
}

export const FloatingZoneLabelsOverlay: React.FC<OverlayProps> = ({ labelRefs }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {ALL_ZONES.map(zoneId => (
        <FloatingZoneLabelItem
          key={zoneId}
          id={zoneId}
          ref={labelRefs[zoneId]}
        />
      ))}
    </div>
  );
};
