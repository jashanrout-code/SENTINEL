import * as THREE from 'three';

export interface FacilityFramingBounds {
  center: [number, number, number];
  baseDistance: number;
  minAspect: number;
  marginFactor: number;
}

export const DEFAULT_FACILITY_FRAMING: FacilityFramingBounds = {
  // Visual center accounting for isometric perspective foreshortening
  center: [1.4, 0, 1.4],
  baseDistance: 52,
  minAspect: 1.45,
  marginFactor: 1.15,
};

// Normalized isometric viewing direction vector [1, 0.85, 1]
export const ISO_DIR = Object.freeze(new THREE.Vector3(1, 0.85, 1).normalize());

export function calculateFramingDistance(
  aspect: number,
  bounds: FacilityFramingBounds = DEFAULT_FACILITY_FRAMING
): number {
  if (aspect < bounds.minAspect) {
    return bounds.baseDistance * (bounds.minAspect / Math.max(0.2, aspect));
  }
  return bounds.baseDistance;
}
