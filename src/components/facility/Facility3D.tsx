import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { FacilityScene } from './FacilityScene';
import { FloatingZoneLabelsTracker, FloatingZoneLabelsOverlay } from './FloatingZoneLabels';
import { FacilityCameraController } from './FacilityCameraController';
import { RotateCcw, Eye, Layers } from 'lucide-react';
import { useSentinelStore } from '../../store/useSentinelStore';
import { ZONES } from '../../types';
import type { ZoneId } from '../../types';

export const Facility3D: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const selectedZoneId = useSentinelStore(state => state.selectedZoneId);
  const selectZone = useSentinelStore(state => state.selectZone);

  // Stable references for all 4 zone floating label DOM elements
  const refResearchLab = useRef<HTMLDivElement>(null);
  const refChemicalLab = useRef<HTMLDivElement>(null);
  const refRestrictedStorage = useRef<HTMLDivElement>(null);
  const refControlRoom = useRef<HTMLDivElement>(null);

  const labelRefs = React.useMemo(() => ({
    RESEARCH_LAB: refResearchLab,
    CHEMICAL_LAB: refChemicalLab,
    RESTRICTED_STORAGE: refRestrictedStorage,
    CONTROL_ROOM: refControlRoom,
  }), []);

  const handleResetCamera = () => {
    setResetTrigger(prev => prev + 1);
  };

  const zonesList: ZoneId[] = ['RESEARCH_LAB', 'CHEMICAL_LAB', 'RESTRICTED_STORAGE', 'CONTROL_ROOM'];

  return (
    <div className="relative w-full h-full min-h-[420px] bg-gradient-to-b from-[#06090e] via-[#090d14] to-[#0d131c] overflow-hidden select-none">
      {/* 3D WebGL Canvas */}
      <Canvas
        shadows={false}
        camera={{ position: [32.9, 26.8, 32.9], fov: 30 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#070a0e']} />

        {/* Soft Industrial Lighting */}
        <ambientLight intensity={0.9} color="#94a3b8" />
        <directionalLight
          position={[18, 28, 14]}
          intensity={1.4}
          color="#f8fafc"
        />
        <directionalLight
          position={[-14, 18, -14]}
          intensity={0.5}
          color="#38bdf8"
        />

        {/* Facility Isometric Model */}
        <FacilityScene />

        {/* Authoritative Responsive Full-Facility Camera Framing Controller */}
        <FacilityCameraController
          controlsRef={controlsRef}
          resetTrigger={resetTrigger}
        />

        {/* Synchronized 3D to Screen Projection Tracker */}
        <FloatingZoneLabelsTracker labelRefs={labelRefs} />

        {/* Constrained Orbit Controls with Centred Target */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.06}
          target={[1.4, 0, 1.4]}
          minDistance={14}
          maxDistance={140}
          maxPolarAngle={Math.PI / 2.15} // Prevents looking up from below ground
          minPolarAngle={Math.PI / 7}
        />
      </Canvas>

      {/* Floating 3D Zone Identification Labels Overlay */}
      <FloatingZoneLabelsOverlay labelRefs={labelRefs} />

      {/* 3D Facility Floating HUD Header Overlay */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 pointer-events-auto z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-900/85 border border-slate-700/60 backdrop-blur-md shadow-md text-xs font-mono text-slate-300">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-100">FACILITY 3D TWIN</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">ISOMETRIC LEVEL 01</span>
        </div>

        {/* Quick Room Selector in 3D View */}
        <div className="flex items-center gap-1 p-1 rounded bg-slate-900/85 border border-slate-700/60 backdrop-blur-md shadow-md text-xs font-mono">
          {zonesList.map((zid) => {
            const z = ZONES[zid];
            const isSel = selectedZoneId === zid;
            return (
              <button
                key={zid}
                onClick={() => selectZone(zid)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${isSel
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                title={z.name}
              >
                {z.code}
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Camera Controls (Bottom-Right) */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 pointer-events-auto z-10">
        <button
          onClick={handleResetCamera}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900/85 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-cyan-400 text-xs font-mono transition-colors shadow-md backdrop-blur-md"
          title="Reset Camera View to Default Isometric Perspective"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Reset Isometric View</span>
        </button>
      </div>

      {/* Helpful Subtle Interaction Hint (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-950/75 border border-slate-800/80 text-[10px] font-mono text-slate-400 pointer-events-none backdrop-blur-sm">
        <Eye className="w-3 h-3 text-cyan-500" />
        <span>Rotate: Left Click + Drag | Pan: Right Click + Drag | Zoom: Scroll</span>
      </div>
    </div>
  );
};
