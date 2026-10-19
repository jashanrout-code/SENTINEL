import React from 'react';
import {
  Flame,
  Wind,
  ShieldAlert,
  Hand,
  ArrowRight
} from 'lucide-react';
import { useSentinelStore } from '../../store/useSentinelStore';
import { ZONES } from '../../types';
import type { EmergencyCategory } from '../../types';

export const GuidedWorkflowBanner: React.FC = () => {
  const getPendingOperatorActions = useSentinelStore(state => state.getPendingOperatorActions);
  const navigateToGuidedAction = useSentinelStore(state => state.navigateToGuidedAction);

  const actions = getPendingOperatorActions();
  if (actions.length === 0) return null;

  const currentAction = actions[0];
  const zoneConfig = ZONES[currentAction.zoneId];

  const getCategoryIcon = (category: EmergencyCategory) => {
    switch (category) {
      case 'FIRE':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'GAS_LEAKAGE':
        return <Wind className="w-4 h-4 text-yellow-400" />;
      case 'INTRUSION':
        return <ShieldAlert className="w-4 h-4 text-purple-400" />;
      case 'MANUAL_EMERGENCY':
        return <Hand className="w-4 h-4 text-red-400" />;
    }
  };

  const getBadgeStyle = (badgeType: string) => {
    switch (badgeType) {
      case 'critical':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'action_required':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'info':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
    }
  };

  const getButtonStyle = (badgeType: string) => {
    switch (badgeType) {
      case 'critical':
        return 'bg-red-600 hover:bg-red-500 text-white shadow-red-700/40';
      case 'action_required':
        return 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-700/40';
      case 'info':
        return 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-700/40';
      default:
        return 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-700/40';
    }
  };

  return (
    <aside
      aria-label="Guided Operator Navigation"
      className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-amber-500/40 shadow-xl px-4 py-2 z-30 transition-all select-none"
    >
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Indicator & Description */}
        <div className="flex items-center gap-3 min-w-[280px]">
          <div className="flex items-center justify-center p-1.5 rounded-lg bg-black/50 border border-amber-500/40 shadow-inner">
            {getCategoryIcon(currentAction.category)}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider border ${getBadgeStyle(currentAction.badgeType)}`}>
                GUIDED STEP: {currentAction.stage.replace(/_/g, ' ')}
              </span>
              <span className="font-mono text-xs font-bold text-slate-100 tracking-wide">
                {currentAction.title}
              </span>
              <span className="text-[11px] font-mono text-cyan-300">
                — {zoneConfig?.name || currentAction.zoneId} ({zoneConfig?.code || ''})
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-300 mt-0.5 leading-snug">
              {currentAction.description}
            </p>
          </div>
        </div>

        {/* Right: Working Action Button & Queue Indicator */}
        <div className="flex items-center gap-3">
          {actions.length > 1 && (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
              +{actions.length - 1} NEXT STEP{actions.length > 2 ? 'S' : ''} QUEUED
            </span>
          )}

          <button
            onClick={() => navigateToGuidedAction(currentAction)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${getButtonStyle(currentAction.badgeType)}`}
          >
            <span>{currentAction.actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
