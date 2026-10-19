import React from 'react';
import { ZoneRoom } from './ZoneRoom';

export const FacilityScene: React.FC = () => {
  return (
    <group position={[0, -0.5, 0]}>
      {/* Heavy Concrete Foundation Plinth */}
      <mesh position={[0, -0.2, 0]} receiveShadow>
        <boxGeometry args={[23, 0.4, 21]} />
        <meshStandardMaterial color="#0b1018" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Outer Foundation Bevel Edge */}
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[23.4, 0.1, 21.4]} />
        <meshStandardMaterial color="#1a2332" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Central Interconnecting Corridor */}
      <group position={[-0.2, 0, 0.2]}>
        {/* Corridor Floor */}
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[2.8, 0.1, 16.5]} />
          <meshStandardMaterial color="#141c28" roughness={0.5} metalness={0.3} />
        </mesh>

        {/* Hazard Safety Yellow/Black Stripe Edge Markings */}
        <mesh position={[-1.35, 0.11, 0]}>
          <boxGeometry args={[0.1, 0.01, 16.4]} />
          <meshStandardMaterial color="#eab308" roughness={0.3} />
        </mesh>
        <mesh position={[1.35, 0.11, 0]}>
          <boxGeometry args={[0.1, 0.01, 16.4]} />
          <meshStandardMaterial color="#eab308" roughness={0.3} />
        </mesh>

        {/* Corridor Wayfinding Directional Walkway Light Accents */}
        {[-6, -3, 0, 3, 6].map((z, idx) => (
          <group key={idx} position={[0, 0.12, z]}>
            <mesh>
              <boxGeometry args={[1.2, 0.01, 0.15]} />
              <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.6} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Room 1: Research Laboratory */}
      <ZoneRoom
        key="RESEARCH_LAB"
        id="RESEARCH_LAB"
        position={[-5.8, 0, -4.5]}
        size={[8.4, 6.6]}
        wallHeight={1.5}
        doorwaySide="east"
      />

      {/* Room 2: Chemical Laboratory */}
      <ZoneRoom
        key="CHEMICAL_LAB"
        id="CHEMICAL_LAB"
        position={[4.6, 0, -3.2]}
        size={[5.8, 9.2]}
        wallHeight={1.5}
        doorwaySide="west"
      />

      {/* Room 3: Restricted Storage */}
      <ZoneRoom
        key="RESTRICTED_STORAGE"
        id="RESTRICTED_STORAGE"
        position={[-5.8, 0, 3.8]}
        size={[5.4, 5.4]}
        wallHeight={1.5}
        doorwaySide="east"
      />

      {/* Room 4: Control Room */}
      <ZoneRoom
        key="CONTROL_ROOM"
        id="CONTROL_ROOM"
        position={[4.6, 0, 4.6]}
        size={[6.2, 5.2]}
        wallHeight={1.5}
        doorwaySide="west"
      />
    </group>
  );
};
