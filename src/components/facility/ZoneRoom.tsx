import React, { useState } from 'react';
import * as THREE from 'three';
import type { ZoneId } from '../../types';
import { useSentinelStore } from '../../store/useSentinelStore';
import type { ZoneHealthStatus } from '../../store/useSentinelStore';
import { RoomEquipment } from './RoomEquipment';


interface ZoneRoomProps {
  id: ZoneId;
  position: [number, number, number];
  size: [number, number]; // width (x), depth (z)
  wallHeight?: number;
  doorwaySide?: 'north' | 'south' | 'east' | 'west';
}

export const ZoneRoom: React.FC<ZoneRoomProps> = ({
  id,
  position,
  size,
  wallHeight = 1.6,
  doorwaySide = 'east',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const selectedZoneId = useSentinelStore(state => state.selectedZoneId);
  const selectZone = useSentinelStore(state => state.selectZone);
  const getZoneStatus = useSentinelStore(state => state.getZoneStatus);

  const isSelected = selectedZoneId === id;
  const status: ZoneHealthStatus = getZoneStatus(id);

  const [width, depth] = size;
  const halfW = width / 2;
  const halfD = depth / 2;
  const wallThick = 0.2;

  // Determine status color scheme
  let borderColor = '#2a3b50';
  let floorColor = '#101722';
  let beaconColor = '#10b981';

  if (status === 'critical') {
    borderColor = '#ef4444';
    floorColor = '#241014';
    beaconColor = '#ef4444';
  } else if (status === 'acknowledged') {
    borderColor = '#a855f7';
    floorColor = '#1a1329';
    beaconColor = '#a855f7';
  } else if (status === 'warning') {
    borderColor = '#f59e0b';
    floorColor = '#22190d';
    beaconColor = '#f59e0b';
  } else if (status === 'fault') {
    borderColor = '#f97316';
    floorColor = '#1e1410';
    beaconColor = '#f97316';
  }

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        selectZone(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setIsHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setIsHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      {/* Room Floor Mesh */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[width, 0.1, depth]} />
        <meshStandardMaterial
          color={isHovered ? '#1a2436' : floorColor}
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>

      {/* Floor Grid Lines Pattern Accent */}
      <gridHelper
        args={[Math.max(width, depth), Math.round(Math.max(width, depth)), '#233246', '#172230']}
        position={[0, 0.11, 0]}
      />

      {/* Perimeter Glow / Selection Border Highlight */}
      <group position={[0, 0.12, 0]}>
        {/* Base Perimeter Border */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(width + 0.05, 0.08, depth + 0.05)]} />
          <lineBasicMaterial
            color={isSelected ? '#00e5ff' : borderColor}
            linewidth={isSelected ? 3 : 1}
          />
        </lineSegments>

        {/* Selected Zone Corner Brackets */}
        {isSelected && (
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[width + 0.15, 0.04, depth + 0.15]} />
            <meshStandardMaterial
              color="#00e5ff"
              wireframe
              transparent
              opacity={0.8}
            />
          </mesh>
        )}
      </group>

      {/* Low Cutaway Outer Walls (Architectural model style for unobstructed isometric view) */}
      <group position={[0, wallHeight / 2, 0]}>
        {/* North Wall */}
        {doorwaySide !== 'north' ? (
          <mesh position={[0, 0, -halfD + wallThick / 2]}>
            <boxGeometry args={[width, wallHeight, wallThick]} />
            <meshStandardMaterial color="#1a2536" metalness={0.6} roughness={0.4} />
          </mesh>
        ) : (
          <>
            <mesh position={[-halfW * 0.6, 0, -halfD + wallThick / 2]}>
              <boxGeometry args={[width * 0.35, wallHeight, wallThick]} />
              <meshStandardMaterial color="#1a2536" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[halfW * 0.6, 0, -halfD + wallThick / 2]}>
              <boxGeometry args={[width * 0.35, wallHeight, wallThick]} />
              <meshStandardMaterial color="#1a2536" metalness={0.6} roughness={0.4} />
            </mesh>
          </>
        )}

        {/* South Wall (kept very low or omitted on viewing side so room interior is clearly seen) */}
        {doorwaySide !== 'south' ? (
          <mesh position={[0, -wallHeight * 0.3, halfD - wallThick / 2]}>
            <boxGeometry args={[width, wallHeight * 0.4, wallThick]} />
            <meshStandardMaterial color="#141c2b" metalness={0.6} roughness={0.4} />
          </mesh>
        ) : null}

        {/* West Wall */}
        {doorwaySide !== 'west' ? (
          <mesh position={[-halfW + wallThick / 2, 0, 0]}>
            <boxGeometry args={[wallThick, wallHeight, depth]} />
            <meshStandardMaterial color="#172130" metalness={0.6} roughness={0.4} />
          </mesh>
        ) : (
          <>
            <mesh position={[-halfW + wallThick / 2, 0, -halfD * 0.6]}>
              <boxGeometry args={[wallThick, wallHeight, depth * 0.35]} />
              <meshStandardMaterial color="#172130" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[-halfW + wallThick / 2, 0, halfD * 0.6]}>
              <boxGeometry args={[wallThick, wallHeight, depth * 0.35]} />
              <meshStandardMaterial color="#172130" metalness={0.6} roughness={0.4} />
            </mesh>
          </>
        )}

        {/* East Wall */}
        {doorwaySide !== 'east' ? (
          <mesh position={[halfW - wallThick / 2, 0, 0]}>
            <boxGeometry args={[wallThick, wallHeight, depth]} />
            <meshStandardMaterial color="#172130" metalness={0.6} roughness={0.4} />
          </mesh>
        ) : (
          <>
            <mesh position={[halfW - wallThick / 2, 0, -halfD * 0.6]}>
              <boxGeometry args={[wallThick, wallHeight, depth * 0.35]} />
              <meshStandardMaterial color="#172130" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[halfW - wallThick / 2, 0, halfD * 0.6]}>
              <boxGeometry args={[wallThick, wallHeight, depth * 0.35]} />
              <meshStandardMaterial color="#172130" metalness={0.6} roughness={0.4} />
            </mesh>
          </>
        )}
      </group>

      {/* Procedural Industrial Equipment Props */}
      <RoomEquipment zoneId={id} />

      {/* Ceiling Sensor Beacon & Status Strobe */}
      <group position={[0, 2.2, 0]}>
        {/* Beacon Mount Column */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.4, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>
        {/* Glowing Beacon Head */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial
            color={beaconColor}
            emissive={beaconColor}
            emissiveIntensity={status === 'critical' ? 1.5 : 0.8}
          />
        </mesh>
        {/* Status Point Light */}
        <pointLight
          color={beaconColor}
          intensity={status === 'critical' ? 2.5 : 0.8}
          distance={4}
        />
      </group>
    </group>
  );
};
