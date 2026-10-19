import React, { useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import {
  type FacilityFramingBounds,
  DEFAULT_FACILITY_FRAMING,
  ISO_DIR,
  calculateFramingDistance,
} from './cameraFraming';



interface FacilityCameraControllerProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  resetTrigger?: number;
  bounds?: FacilityFramingBounds;
}

export const FacilityCameraController: React.FC<FacilityCameraControllerProps> = ({
  controlsRef,
  resetTrigger = 0,
  bounds = DEFAULT_FACILITY_FRAMING,
}) => {
  const { camera, size } = useThree();
  const hasUserInteracted = useRef(false);
  const prevTrigger = useRef(resetTrigger);
  const prevDimensions = useRef({ width: size.width, height: size.height });

  const applyFraming = useCallback((force: boolean = false) => {
    if (!force && hasUserInteracted.current) {
      return;
    }

    const persCam = camera as THREE.PerspectiveCamera;
    if (!persCam.isPerspectiveCamera) return;

    const aspect = size.width / Math.max(1, size.height);
    const distance = calculateFramingDistance(aspect, bounds);

    const target = new THREE.Vector3(...bounds.center);
    const newPos = target.clone().addScaledVector(ISO_DIR, distance);

    camera.position.copy(newPos);
    camera.lookAt(target);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
      controlsRef.current.saveState();
    }
  }, [camera, size.width, size.height, bounds, controlsRef]);

  // Initial mount framing
  useEffect(() => {
    applyFraming(true);
  }, [applyFraming]);

  // Responsive resize handler - only recalculates when canvas container dimensions change
  useEffect(() => {
    const dimChanged =
      Math.abs(prevDimensions.current.width - size.width) > 4 ||
      Math.abs(prevDimensions.current.height - size.height) > 4;

    if (dimChanged) {
      prevDimensions.current = { width: size.width, height: size.height };
      if (!hasUserInteracted.current) {
        applyFraming(false);
      }
    }
  }, [size.width, size.height, applyFraming]);

  // Detect user interaction so normal React re-renders do not overwrite user panning/zooming
  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;

    const handleStart = () => {
      hasUserInteracted.current = true;
    };

    ctrl.addEventListener('start', handleStart);
    return () => {
      ctrl.removeEventListener('start', handleStart);
    };
  }, [controlsRef]);

  // Explicit Reset View button handler
  useEffect(() => {
    if (resetTrigger !== prevTrigger.current) {
      prevTrigger.current = resetTrigger;
      hasUserInteracted.current = false;
      applyFraming(true);
    }
  }, [resetTrigger, applyFraming]);

  return null;
};
