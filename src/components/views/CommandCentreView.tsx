import React from 'react';
import { EmergencyBanner } from '../commandCentre/EmergencyBanner';
import { ZoneStatusStrip } from '../commandCentre/ZoneStatusStrip';
import { ContextualPanel } from '../commandCentre/ContextualPanel';
import { ActiveIncidentsQueue } from '../commandCentre/ActiveIncidentsQueue';
import { RecentActivityFeed } from '../commandCentre/RecentActivityFeed';
import { Facility3D } from '../facility/Facility3D';

export const CommandCentreView: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col w-full overflow-y-auto">
      {/* High-Priority Persistent Emergency Notification Banner */}
      <EmergencyBanner />

      {/* Main Command-Centre Operational Canvas */}
      <div className="flex-1 p-4 flex flex-col gap-3.5 max-w-[1720px] mx-auto w-full">
        {/* Compact Zone Status Strip */}
        <ZoneStatusStrip />

        {/* Central Dominant 3D Workspace + Contextual Side Panel */}
        <div className="flex-1 flex flex-col lg:flex-row gap-3.5 min-h-[500px] xl:min-h-[560px]">
          {/* Dominant 3D Isometric Digital Twin Canvas */}
          <div className="flex-1 rounded-xl border border-slate-800/90 shadow-2xl overflow-hidden relative flex flex-col bg-[#070a0e]">
            <Facility3D />
          </div>

          {/* Contextual Zone / Incident Information Panel */}
          <ContextualPanel />
        </div>

        {/* Lower Operational Strip: Active Incidents Queue & Recent Activity Feed */}
        <div className="flex flex-col xl:flex-row gap-3.5 pb-2">
          <div className="flex-1">
            <ActiveIncidentsQueue />
          </div>
          <div className="xl:w-96">
            <RecentActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
};
