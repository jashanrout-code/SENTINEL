import { useEffect } from 'react';
import { useSentinelStore } from '../store/useSentinelStore';

/**
 * useGuidedNavigationResolver
 *
 * Robust, asynchronous navigation target resolution engine.
 * Observes DOM mutations and animation frames to detect when target controls mount
 * following view switches or zone selections.
 *
 * Ensures the target control is scrolled into view, receives focus (or moves focus
 * to its section heading if the button is disabled/inert), and never auto-activates.
 */
export function useGuidedNavigationResolver() {
  const pendingTarget = useSentinelStore(state => state.pendingNavigationTarget);
  const clearPendingNavigation = useSentinelStore(state => state.clearPendingNavigation);

  useEffect(() => {
    if (!pendingTarget?.targetControlId || typeof document === 'undefined') return;

    const controlId = pendingTarget.targetControlId;
    const sectionId = pendingTarget.sectionId;
    const zoneId = pendingTarget.zoneId;
    const incidentId = pendingTarget.incidentId;

    const attemptResolve = (): boolean => {
      const el = document.getElementById(controlId);
      if (el) {
        // 1. Scroll target control smoothly into view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // 2. Attempt keyboard focus on control
        let focused = false;
        if (typeof el.focus === 'function' && !(el as HTMLButtonElement).disabled) {
          el.focus();
          focused = document.activeElement === el;
        }

        // 3. Fallback focus to section heading or container if button is disabled
        if (!focused) {
          const fallbackCandidates = [
            sectionId ? document.getElementById(sectionId) : null,
            zoneId ? document.getElementById(`heading-recovery-${zoneId}`) : null,
            zoneId ? document.getElementById(`section-recovery-${zoneId}`) : null,
            document.getElementById('heading-security-assessment'),
            incidentId ? document.getElementById(`section-incident-${incidentId}`) : null,
            zoneId ? document.getElementById(`section-intervention-${zoneId}`) : null,
          ].filter(Boolean) as HTMLElement[];

          for (const fallback of fallbackCandidates) {
            if (fallback) {
              if (!fallback.hasAttribute('tabIndex')) {
                fallback.setAttribute('tabIndex', '-1');
              }
              fallback.focus();
              if (document.activeElement === fallback) {
                break;
              }
            }
          }
        }

        clearPendingNavigation();
        return true;
      }
      return false;
    };

    // If already mounted, resolve immediately
    if (attemptResolve()) return;

    // Asynchronous observer: listen for DOM mutations and RAF loop for up to 2500ms
    let isCancelled = false;
    const startTime = Date.now();
    const MAX_WAIT_MS = 2500;

    const observer = new MutationObserver(() => {
      if (isCancelled) return;
      if (attemptResolve()) {
        observer.disconnect();
      } else if (Date.now() - startTime > MAX_WAIT_MS) {
        observer.disconnect();
        clearPendingNavigation();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    let rafId: number;
    const checkLoop = () => {
      if (isCancelled) return;
      if (attemptResolve()) {
        observer.disconnect();
      } else if (Date.now() - startTime < MAX_WAIT_MS) {
        rafId = requestAnimationFrame(checkLoop);
      } else {
        observer.disconnect();
        clearPendingNavigation();
      }
    };
    rafId = requestAnimationFrame(checkLoop);

    return () => {
      isCancelled = true;
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [pendingTarget, clearPendingNavigation]);
}
