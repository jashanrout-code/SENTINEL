import { describe, it, expect } from 'vitest';
import {
  calculateFramingDistance,
  DEFAULT_FACILITY_FRAMING,
  ISO_DIR,
} from '../components/facility/cameraFraming';
import * as THREE from 'three';

describe('Facility Camera Framing & Zoom Calculations', () => {
  const points = [
    new THREE.Vector3(11.7, -0.5, 10.7),
    new THREE.Vector3(-11.7, -0.5, -10.7),
    new THREE.Vector3(11.7, -0.5, -10.7),
    new THREE.Vector3(-11.7, -0.5, 10.7),
    new THREE.Vector3(11.7, 0, 10.7),
    new THREE.Vector3(-11.7, 0, -10.7),
    new THREE.Vector3(11.7, 0, -10.7),
    new THREE.Vector3(-11.7, 0, 10.7),
    new THREE.Vector3(-10.0, 1.5, -7.8),
    new THREE.Vector3(7.7, 1.5, 7.2),
    new THREE.Vector3(-5.8, 2.5, -4.5), // RESEARCH_LAB
    new THREE.Vector3(4.6, 2.5, -3.2),  // CHEMICAL_LAB
    new THREE.Vector3(-5.8, 2.5, 3.8),  // RESTRICTED_STORAGE
    new THREE.Vector3(4.6, 2.5, 4.6),   // CONTROL_ROOM
  ];

  it('correctly calculates framing distance for wide desktop aspect ratios', () => {
    const aspect = 16 / 9;
    const distance = calculateFramingDistance(aspect, DEFAULT_FACILITY_FRAMING);
    expect(distance).toBe(DEFAULT_FACILITY_FRAMING.baseDistance);

    const target = new THREE.Vector3(...DEFAULT_FACILITY_FRAMING.center);
    const cam = new THREE.PerspectiveCamera(30, aspect, 0.1, 1000);
    cam.position.copy(target).addScaledVector(ISO_DIR, distance);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();

    for (const pt of points) {
      const p = pt.clone().project(cam);
      // All points must be within comfortable margins (NDC [-0.85, 0.85])
      expect(p.x).toBeGreaterThanOrEqual(-0.85);
      expect(p.x).toBeLessThanOrEqual(0.85);
      expect(p.y).toBeGreaterThanOrEqual(-0.85);
      expect(p.y).toBeLessThanOrEqual(0.85);
    }
  });

  it('correctly adapts framing distance for narrower viewports without cropping', () => {
    const aspect = 1.0;
    const distanceNarrow = calculateFramingDistance(aspect, DEFAULT_FACILITY_FRAMING);
    const distanceWide = calculateFramingDistance(16 / 9, DEFAULT_FACILITY_FRAMING);

    expect(distanceNarrow).toBeGreaterThan(distanceWide);

    const target = new THREE.Vector3(...DEFAULT_FACILITY_FRAMING.center);
    const cam = new THREE.PerspectiveCamera(30, aspect, 0.1, 1000);
    cam.position.copy(target).addScaledVector(ISO_DIR, distanceNarrow);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();

    for (const pt of points) {
      const p = pt.clone().project(cam);
      expect(p.x).toBeGreaterThanOrEqual(-0.85);
      expect(p.x).toBeLessThanOrEqual(0.85);
      expect(p.y).toBeGreaterThanOrEqual(-0.85);
      expect(p.y).toBeLessThanOrEqual(0.85);
    }
  });

  it('positions isometric camera vector oriented to visual facility center', () => {
    const center = new THREE.Vector3(...DEFAULT_FACILITY_FRAMING.center);
    expect(center.x).toBe(1.4);
    expect(center.y).toBe(0);
    expect(center.z).toBe(1.4);

    expect(ISO_DIR.x).toBeGreaterThan(0);
    expect(ISO_DIR.y).toBeGreaterThan(0);
    expect(ISO_DIR.z).toBeGreaterThan(0);
  });
});
