'use client';

import { Node as SimulationNode } from '@/schema/Scenario';
import { globalEventDispatcher } from '@/core/EventDispatcher';
import { RuntimeState } from '@/core/types';

/**
 * Props for ActionPanel component
 */
interface ActionPanelProps {
  selectedNode: SimulationNode;
  onClose: () => void;
  runtimeState?: RuntimeState;
  currentTick?: number;
  incidentTimeline?: string[];
}

/**
 * Get status color based on node status
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'text-emerald-400 bg-emerald-500/20 border-emerald-500';
    case 'degraded':
      return 'text-amber-400 bg-amber-500/20 border-amber-500';
    case 'failed':
      return 'text-red-400 bg-red-500/20 border-red-500';
    case 'recovering':
      return 'text-blue-400 bg-blue-500/20 border-blue-500';
    default:
      return 'text-slate-400 bg-slate-500/20 border-slate-500';
  }
}

/**
 * Get health color based on health percentage
 */
function getHealthColor(health: number): string {
  if (health >= 80) return 'bg-emerald-500';
  if (health >= 50) return 'bg-amber-500';
  if (health >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

/**
 * ActionPanel Component
 * Dark-themed right-side panel for node investigation and repair actions
 */
export function ActionPanel({ selectedNode, onClose, runtimeState, currentTick, incidentTimeline = [] }: ActionPanelProps) {
  /**
   * Handle action button click
   * Dispatches USER_ACTION_DISPATCHED event without mutating state
   */
  const handleActionClick = (actionId: string) => {
    globalEventDispatcher.dispatch('USER_ACTION_DISPATCHED', 'info', {
      actionId,
      targetNodeId: selectedNode.id
    });
  };

  // Check if incident is resolved
  const isResolved = runtimeState === 'RECOVERED';

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col z-10">
      {/* Incident Resolved Overlay */}
      {isResolved && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center px-8 py-12 space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-4 border-emerald-500 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-3xl font-bold text-emerald-400 mb-2">
                Incident Resolved!
              </h2>
              <p className="text-slate-400 text-sm">
                All systems have been restored to healthy state
              </p>
            </div>

            {/* Metrics */}
            <div className="space-y-3">
              <div className="bg-slate-800/50 rounded-lg px-6 py-4 border border-slate-700">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Time to Resolution
                </div>
                <div className="text-3xl font-bold text-slate-100 font-mono">
                  {currentTick || 0} <span className="text-lg text-slate-400">ticks</span>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg px-6 py-4 border border-slate-700">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Status
                </div>
                <div className="text-xl font-bold text-emerald-400">
                  RECOVERED
                </div>
              </div>
            </div>

            {/* Incident Timeline */}
            {incidentTimeline.length > 0 && (
              <div className="bg-slate-800/50 rounded-lg px-6 py-4 border border-slate-700 max-h-64 overflow-y-auto">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                  Incident Timeline
                </div>
                <ul className="space-y-2">
                  {incidentTimeline.map((entry, index) => (
                    <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-slate-600 mt-1">•</span>
                      <span>{entry}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
            >
              Close Panel
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <h2 className="text-xl font-bold text-slate-100">Node Details</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 transition-colors text-2xl leading-none"
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Node Label */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
            Node Name
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {selectedNode.label}
          </div>
        </div>

        {/* Node ID */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
            Node ID
          </div>
          <div className="text-sm font-mono text-slate-300 bg-slate-800 px-3 py-2 rounded border border-slate-700">
            {selectedNode.id}
          </div>
        </div>

        {/* Provider & Service Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
              Provider
            </div>
            <div className="text-sm font-semibold text-slate-200 bg-slate-800 px-3 py-2 rounded border border-slate-700 text-center">
              {selectedNode.provider}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
              Service Type
            </div>
            <div className="text-sm font-semibold text-slate-200 bg-slate-800 px-3 py-2 rounded border border-slate-700 text-center">
              {selectedNode.serviceType}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
            Status
          </div>
          <div
            className={`
              inline-flex px-4 py-2 rounded-lg border-2 font-semibold text-sm uppercase tracking-wider
              ${getStatusColor(selectedNode.status)}
            `}
          >
            {selectedNode.status}
          </div>
        </div>

        {/* Health Meter */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
            Health
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-100">
                {selectedNode.health}%
              </span>
              <span className="text-sm text-slate-400">
                {selectedNode.health >= 80 ? 'Healthy' : 
                 selectedNode.health >= 50 ? 'Degraded' :
                 selectedNode.health >= 20 ? 'Critical' : 'Failed'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 border border-slate-700 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getHealthColor(selectedNode.health)}`}
                style={{ width: `${selectedNode.health}%` }}
              />
            </div>
          </div>
        </div>

        {/* Available Actions */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Available Actions
          </div>
          <div className="space-y-2">
            {selectedNode.availableActions.length === 0 ? (
              <div className="text-sm text-slate-400 italic bg-slate-800 px-4 py-3 rounded border border-slate-700">
                No actions available for this node
              </div>
            ) : (
              selectedNode.availableActions.map((action) => (
                <button
                  key={action}
                  onClick={() => handleActionClick(action)}
                  className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-600 hover:border-slate-500 transition-all duration-200 text-left flex items-center justify-between group"
                >
                  <span className="capitalize">
                    {action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-500 group-hover:text-slate-400 transition-colors">
                    →
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Metadata (if available) */}
        {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
              Metadata
            </div>
            <div className="bg-slate-800 rounded border border-slate-700 p-3">
              <pre className="text-xs text-slate-300 font-mono overflow-x-auto">
                {JSON.stringify(selectedNode.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700 bg-slate-950">
        <div className="text-xs text-slate-500 text-center">
          Click an action to dispatch an event
        </div>
      </div>
    </div>
  );
}

// Made with Bob