import React from 'react';
import {
  ShieldAlert,
  LayoutDashboard,
  AlertTriangle,
  Sliders,
  Volume2,
  VolumeX,
  Radio
} from 'lucide-react';
import { useSentinelStore } from '../../store/useSentinelStore';
import type { OperationalView } from '../../types';


export const Header: React.FC = () => {
  const currentView = useSentinelStore(state => state.currentView);
  const setView = useSentinelStore(state => state.setView);
  const activeIncidents = useSentinelStore(state => state.activeIncidents);
  const isAudioMuted = useSentinelStore(state => state.isAudioMuted);
  const toggleAudio = useSentinelStore(state => state.toggleAudio);

  const activeCount = activeIncidents.length;
  const hasEmergency = activeCount > 0;

  const navItems: { view: OperationalView; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      view: 'command-centre',
      label: 'Command Centre',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      view: 'incident-management',
      label: 'Incident Management',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: activeCount > 0 ? activeCount : undefined,
    },
    {
      view: 'operations',
      label: 'Operations',
      icon: <Sliders className="w-4 h-4" />,
    },
  ];

  return (
    <header className="w-full bg-[#090d14] border-b border-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 z-30 select-none">
      {/* Brand & System Identity */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded bg-slate-900 border border-cyan-500/40 text-cyan-400 shadow-md shadow-cyan-500/10">
          <ShieldAlert className="w-5 h-5" />
          {hasEmergency && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold tracking-widest text-slate-100">SENTINEL</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium tracking-wide bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
              v1.0.0
            </span>
          </div>
          <p className="text-[11px] font-mono tracking-tight text-slate-400 hidden sm:block">
            Intelligent Emergency Detection & Response System
          </p>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <nav className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-lg border border-slate-800/80">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                isActive
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {typeof item.badge === 'number' && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Operational Telemetry Status & Audio Controls */}
      <div className="flex items-center gap-3">
        {/* Real-time System Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono ${
          hasEmergency
            ? 'bg-red-950/80 border-red-500/60 text-red-300 animate-pulse'
            : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
        }`}>
          <Radio className={`w-3.5 h-3.5 ${hasEmergency ? 'text-red-400' : 'text-emerald-400'}`} />
          <span className="font-bold tracking-wider">
            {hasEmergency
              ? `${activeCount} INCIDENT${activeCount > 1 ? 'S' : ''} ACTIVE`
              : 'SYSTEM NOMINAL'}
          </span>
        </div>

        {/* Audio Alert Bell / Siren Toggle */}
        <button
          onClick={toggleAudio}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-mono transition-colors ${
            isAudioMuted
              ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-200'
              : 'bg-cyan-950/80 hover:bg-cyan-900/80 border-cyan-500/60 text-cyan-300'
          }`}
          title={isAudioMuted ? 'Unmute Audio Alarms' : 'Mute Audio Alarms'}
        >
          {isAudioMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">AUDIO MUTED</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden md:inline font-semibold">AUDIO ARMED</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
