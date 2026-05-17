'use client';

import { useEffect, useState } from 'react';
import { TopologyMap } from '@/components/visualization/TopologyMap';
import { ActionPanel } from '@/components/interaction/ActionPanel';
import { useSimulationEngine } from '@/simulation/useSimulationEngine';
import { ScenarioSchema, Node } from '@/schema/Scenario';
import trafficMeltdownScenario from '@/cartridges/v1.0.0-traffic-meltdown.json';

/**
 * IncidentOps Command Center
 * Main application page with read-only topology visualization
 */
export default function Home() {
  const {
    scenario,
    simulation,
    isLoaded,
    isPaused,
    error,
    loadScenario,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    resetSimulation,
    dispatcher
  } = useSimulationEngine();

  // Local state for selected node
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Load the scenario on mount
  useEffect(() => {
    try {
      const validatedScenario = ScenarioSchema.parse(trafficMeltdownScenario);
      loadScenario(validatedScenario);
    } catch (err) {
      console.error('Failed to load scenario:', err);
    }
  }, [loadScenario]);

  // Handle start simulation
  const handleStartSimulation = () => {
    dispatcher.dispatch('SIMULATION_STARTED', 'info', {
      scenarioName: scenario?.name,
      timestamp: Date.now()
    });
    startSimulation();
  };

  // Handle pause/resume
  const handleTogglePause = () => {
    if (isPaused) {
      resumeSimulation();
    } else {
      pauseSimulation();
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-500';
      case 'MELTDOWN':
        return 'text-red-400 bg-red-500/20 border-red-500';
      case 'INVESTIGATING':
        return 'text-amber-400 bg-amber-500/20 border-amber-500';
      case 'FIX_DEPLOYING':
        return 'text-blue-400 bg-blue-500/20 border-blue-500';
      case 'RECOVERED':
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-500';
      default:
        return 'text-slate-400 bg-slate-500/20 border-slate-500';
    }
  };

  // Handle node selection
  const handleSelectNode = (node: Node) => {
    setSelectedNode(node);
  };

  // Handle closing the action panel
  const handleClosePanel = () => {
    setSelectedNode(null);
  };

  if (!isLoaded || !scenario || !simulation) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-200 mb-2">
            Loading IncidentOps...
          </div>
          <div className="text-slate-500">
            Initializing simulation engine
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400 mb-2">
            Error Loading Scenario
          </div>
          <div className="text-slate-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Header Panel */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shadow-lg">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              🚨 IncidentOps Command Center
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {scenario.name} • {scenario.difficulty}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Runtime State Badge */}
          <div
            className={`
              px-4 py-2 rounded-lg border-2 font-mono font-semibold text-sm
              ${getStatusColor(simulation.runtimeState)}
            `}
          >
            {simulation.runtimeState}
          </div>

          {/* Tick Counter */}
          <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-500">Tick</div>
            <div className="text-lg font-mono font-bold text-slate-200">
              {simulation.currentTick}
            </div>
          </div>

          {/* Score */}
          <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-500">Score</div>
            <div className="text-lg font-mono font-bold text-slate-200">
              {simulation.score}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2">
            {!simulation.isRunning && !isPaused && (
              <button
                onClick={handleStartSimulation}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
              >
                ▶ Start Simulation
              </button>
            )}

            {simulation.isRunning && (
              <button
                onClick={handleTogglePause}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-amber-500/20"
              >
                {isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
            )}

            {(simulation.isRunning || isPaused) && (
              <button
                onClick={stopSimulation}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-red-500/20"
              >
                ⏹ Stop
              </button>
            )}

            <button
              onClick={resetSimulation}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              🔄 Reset
            </button>
          </div>
        </div>
      </header>

      {/* Topology Map */}
      <main className="flex-1 relative">
        <TopologyMap
          nodes={simulation.nodes}
          edges={scenario.topology.edges}
          className="absolute inset-0"
          onSelectNode={handleSelectNode}
        />

        {/* Action Panel - conditionally rendered when a node is selected */}
        {selectedNode && (
          <ActionPanel
            selectedNode={selectedNode}
            onClose={handleClosePanel}
            runtimeState={simulation.runtimeState}
            currentTick={simulation.currentTick}
          />
        )}
      </main>

      {/* Footer Info */}
      <footer className="px-6 py-3 bg-slate-900 border-t border-slate-800 text-xs text-slate-500">
        <div className="flex items-center justify-between">
          <div>
            {scenario.description}
          </div>
          <div className="flex items-center gap-4">
            <span>Tick Interval: {scenario.simulation.tickInterval}ms</span>
            <span>•</span>
            <span>Max Ticks: {scenario.simulation.maxTicks}</span>
            <span>•</span>
            <span>Version: {scenario.version}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Made with Bob
