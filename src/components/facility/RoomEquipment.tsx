import React from 'react';
import { useSentinelStore } from '../../store/useSentinelStore';

interface EquipmentProps {
  zoneId: string;
}

/**
 * Procedural low-poly industrial props for facility realism
 * Reactively reflects active closed-loop countermeasures (suppression, ventilation, isolation)
 */
export const RoomEquipment: React.FC<EquipmentProps> = ({ zoneId }) => {
  const protectionEquipment = useSentinelStore(state => state.protectionEquipment);

  if (zoneId === 'RESEARCH_LAB') {
    const isSuppressionOperating = protectionEquipment.fireSuppression.state === 'OPERATING';
    const isSuppressionFailed = protectionEquipment.fireSuppression.state === 'FAILED';

    return (
      <group>
        {/* Main Workbenches */}
        <mesh position={[-1.8, 0.45, -1.2]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.9, 1.2]} />
          <meshStandardMaterial color="#2d3748" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[-1.8, 0.95, -1.2]}>
          <boxGeometry args={[3.3, 0.1, 1.3]} />
          <meshStandardMaterial color="#4a5568" metalness={0.3} roughness={0.5} />
        </mesh>

        {/* Benchtop Testing Apparatus */}
        <mesh position={[-2.4, 1.2, -1.2]}>
          <boxGeometry args={[0.7, 0.4, 0.5]} />
          <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.2} metalness={0.8} />
        </mesh>
        <mesh position={[-1.2, 1.15, -1.2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.35, 12]} />
          <meshStandardMaterial color="#718096" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Equipment Cabinet & Server Racks */}
        <mesh position={[2.2, 0.9, -1.8]} castShadow>
          <boxGeometry args={[1.2, 1.8, 0.8]} />
          <meshStandardMaterial color="#1a202c" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Server status LED strips */}
        <mesh position={[2.2, 1.2, -1.38]}>
          <boxGeometry args={[0.9, 0.08, 0.02]} />
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[2.2, 0.8, -1.38]}>
          <boxGeometry args={[0.9, 0.08, 0.02]} />
          <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.7} />
        </mesh>

        {/* Secondary Workbench */}
        <mesh position={[0.5, 0.45, 1.4]}>
          <boxGeometry args={[2.5, 0.9, 1.0]} />
          <meshStandardMaterial color="#2d3748" metalness={0.5} roughness={0.4} />
        </mesh>

        {/* Active Foam/Mist Fire Suppression Visual Countermeasure */}
        {isSuppressionOperating && (
          <group position={[-1.8, 1.4, -1.2]}>
            {/* Ceiling Mist Nozzles */}
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.15, 0.08, 0.2, 12]} />
              <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} />
            </mesh>
            {/* Translucent Mist Envelope */}
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[1.8, 2.2, 1.2, 16]} />
              <meshStandardMaterial
                color="#67e8f9"
                emissive="#06b6d4"
                emissiveIntensity={0.6}
                transparent
                opacity={0.35}
                wireframe={false}
              />
            </mesh>
          </group>
        )}

        {/* Suppression Failed Indicator */}
        {isSuppressionFailed && (
          <group position={[-1.8, 1.8, -1.2]}>
            <mesh>
              <sphereGeometry args={[0.16, 12, 12]} />
              <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.2} />
            </mesh>
          </group>
        )}
      </group>
    );
  }

  if (zoneId === 'CHEMICAL_LAB') {
    const isVentOperating = protectionEquipment.emergencyVentilation.state === 'OPERATING';
    const isValveIsolated = protectionEquipment.gasIsolationValve.state === 'ISOLATED';
    const isValveFailed = protectionEquipment.gasIsolationValve.state === 'FAILED';

    return (
      <group>
        {/* Flammable Reagent Safety Storage Cabinets */}
        <mesh position={[-1.6, 1.0, -3.0]} castShadow>
          <boxGeometry args={[0.9, 2.0, 1.4]} />
          <meshStandardMaterial color="#d97706" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[-1.6, 1.0, -1.2]} castShadow>
          <boxGeometry args={[0.9, 2.0, 1.4]} />
          <meshStandardMaterial color="#b45309" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Chemical Synthesis Bench */}
        <mesh position={[1.2, 0.45, 0.5]}>
          <boxGeometry args={[1.2, 0.9, 4.0]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Stainless Steel Overhead Extraction Ducting */}
        <mesh position={[0, 1.8, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 4.5, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Ducting Vertical Drop */}
        <mesh position={[0.8, 1.4, 0.5]}>
          <cylinderGeometry args={[0.15, 0.15, 0.8, 12]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Active Emergency Extraction Scrubber Visual Countermeasure */}
        {isVentOperating && (
          <group position={[0, 1.8, 0.5]}>
            <mesh position={[0, 0.4, 0]}>
              <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
              <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.8} />
            </mesh>
          </group>
        )}

        {/* High-Pressure Gas Cylinder Bank */}
        <group position={[-1.6, 0.75, 2.8]}>
          <mesh position={[-0.2, 0, -0.3]}>
            <cylinderGeometry args={[0.18, 0.18, 1.5, 12]} />
            <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[-0.2, 0, 0.3]}>
            <cylinderGeometry args={[0.18, 0.18, 1.5, 12]} />
            <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0.2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 1.5, 12]} />
            <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
          </mesh>

          {/* Gas Isolation Valve Indicator */}
          <group position={[0.2, 0.9, 0]}>
            <mesh>
              <cylinderGeometry args={[0.08, 0.08, 0.3, 10]} />
              <meshStandardMaterial color={isValveIsolated ? '#eab308' : isValveFailed ? '#ef4444' : '#10b981'} />
            </mesh>
            <mesh position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.12, 0.12, 0.04, 12]} />
              <meshStandardMaterial
                color={isValveIsolated ? '#eab308' : isValveFailed ? '#ef4444' : '#10b981'}
                emissive={isValveIsolated ? '#eab308' : isValveFailed ? '#ef4444' : '#10b981'}
                emissiveIntensity={0.6}
              />
            </mesh>
          </group>
        </group>
      </group>
    );
  }

  if (zoneId === 'RESTRICTED_STORAGE') {
    const isLockdown = protectionEquipment.accessPointLockdown.state === 'OPERATING';

    return (
      <group>
        {/* Heavy Steel Industrial Storage Racks */}
        <group position={[-1.2, 0.9, -0.6]}>
          <mesh castShadow>
            <boxGeometry args={[1.0, 1.8, 2.4]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.4} />
          </mesh>
          {/* Storage Crates on shelves */}
          <mesh position={[0, 0.4, -0.5]}>
            <boxGeometry args={[0.8, 0.35, 0.7]} />
            <meshStandardMaterial color="#475569" metalness={0.4} roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.2, 0.5]}>
            <boxGeometry args={[0.8, 0.4, 0.8]} />
            <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
          </mesh>
        </group>

        {/* Secure Material Vault Safe */}
        <mesh position={[1.2, 0.7, -0.8]}>
          <boxGeometry args={[0.9, 1.4, 0.9]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Vault Electronic Lock Panel */}
        <mesh position={[0.74, 0.8, -0.8]}>
          <boxGeometry args={[0.04, 0.3, 0.2]} />
          <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.6} />
        </mesh>

        {/* Optical Intrusion Barrier Pillars at doorway */}
        <mesh position={[1.6, 0.6, 1.6]}>
          <cylinderGeometry args={[0.08, 0.08, 1.2, 10]} />
          <meshStandardMaterial color="#ef4444" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Energized Security Lockdown Barrier Beam */}
        {isLockdown && (
          <mesh position={[1.6, 0.6, 1.0]}>
            <boxGeometry args={[0.05, 1.2, 1.4]} />
            <meshStandardMaterial
              color="#a855f7"
              emissive="#a855f7"
              emissiveIntensity={0.7}
              transparent
              opacity={0.5}
            />
          </mesh>
        )}
      </group>
    );
  }

  if (zoneId === 'CONTROL_ROOM') {
    return (
      <group>
        {/* Ergonomic Curved Operator Console */}
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[3.2, 0.85, 1.2]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Command Display Terminal Screens */}
        <group position={[0, 1.15, -0.2]}>
          {/* Center Screen */}
          <mesh position={[0, 0, 0]} rotation={[-0.1, 0, 0]}>
            <boxGeometry args={[1.2, 0.65, 0.06]} />
            <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.4} metalness={0.2} />
          </mesh>
          {/* Left Angled Screen */}
          <mesh position={[-1.15, 0, 0.1]} rotation={[-0.1, 0.35, 0]}>
            <boxGeometry args={[0.9, 0.6, 0.06]} />
            <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.35} metalness={0.2} />
          </mesh>
          {/* Right Angled Screen */}
          <mesh position={[1.15, 0, 0.1]} rotation={[-0.1, -0.35, 0]}>
            <boxGeometry args={[0.9, 0.6, 0.06]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.35} metalness={0.2} />
          </mesh>
        </group>

        {/* Master Emergency Activation Pedestal M-01 */}
        <group position={[1.8, 0, 1.4]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.2, 0.25, 1.0, 16]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Red Emergency Palm Button */}
          <mesh position={[0, 1.05, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} />
          </mesh>
        </group>

        {/* Operator Chairs */}
        <mesh position={[-0.6, 0.35, 1.1]}>
          <cylinderGeometry args={[0.28, 0.28, 0.6, 12]} />
          <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.6} />
        </mesh>
        <mesh position={[0.6, 0.35, 1.1]}>
          <cylinderGeometry args={[0.28, 0.28, 0.6, 12]} />
          <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.6} />
        </mesh>
      </group>
    );
  }

  return null;
};
