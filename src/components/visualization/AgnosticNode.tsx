'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ServiceType, NodeStatus } from '@/core/types';

/**
 * Node data structure for React Flow
 */
export interface AgnosticNodeData {
  label: string;
  serviceType: ServiceType;
  status: NodeStatus;
  health: number;
  provider?: string;
}

/**
 * Get status-based styling for the node
 */
function getStatusStyles(status: NodeStatus, health: number) {
  switch (status) {
    case 'active':
      return {
        borderColor: 'border-emerald-500',
        glowColor: 'shadow-emerald-500/50',
        statusBg: 'bg-emerald-500/20',
        statusText: 'text-emerald-400',
        healthBar: 'bg-emerald-500'
      };
    case 'degraded':
      return {
        borderColor: 'border-amber-500',
        glowColor: 'shadow-amber-500/50',
        statusBg: 'bg-amber-500/20',
        statusText: 'text-amber-400',
        healthBar: 'bg-amber-500'
      };
    case 'failed':
      return {
        borderColor: 'border-red-500',
        glowColor: 'shadow-red-500/50',
        statusBg: 'bg-red-500/20',
        statusText: 'text-red-400',
        healthBar: 'bg-red-500'
      };
    case 'recovering':
      return {
        borderColor: 'border-blue-500',
        glowColor: 'shadow-blue-500/50',
        statusBg: 'bg-blue-500/20',
        statusText: 'text-blue-400',
        healthBar: 'bg-blue-500'
      };
    default:
      return {
        borderColor: 'border-slate-600',
        glowColor: 'shadow-slate-500/50',
        statusBg: 'bg-slate-500/20',
        statusText: 'text-slate-400',
        healthBar: 'bg-slate-500'
      };
  }
}

/**
 * Get icon for service type
 */
function getServiceIcon(serviceType: ServiceType): string {
  const icons: Record<ServiceType, string> = {
    LoadBalancer: '⚖️',
    Kubernetes: '☸️',
    Database: '🗄️',
    Cache: '⚡',
    Storage: '💾',
    Compute: '🖥️',
    Network: '🌐',
    Monitoring: '📊'
  };
  return icons[serviceType] || '📦';
}

/**
 * Custom React Flow Node Component
 * Read-only visualization of cloud infrastructure nodes
 */
export const AgnosticNode = memo(({ data }: NodeProps<AgnosticNodeData>) => {
  const styles = getStatusStyles(data.status, data.health);
  const icon = getServiceIcon(data.serviceType);

  return (
    <div className="relative">
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-slate-600 !border-2 !border-slate-400"
      />

      {/* Node Container */}
      <div
        className={`
          relative
          bg-slate-900
          border-2
          ${styles.borderColor}
          ${styles.glowColor}
          shadow-lg
          rounded-lg
          p-4
          min-w-[200px]
          transition-all
          duration-500
          ease-in-out
          hover:scale-105
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <div>
              <div className="text-sm font-semibold text-slate-200">
                {data.label}
              </div>
              <div className="text-xs text-slate-500">
                {data.serviceType}
              </div>
            </div>
          </div>
          {data.provider && (
            <div className="text-xs text-slate-600 font-mono">
              {data.provider}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="mb-3">
          <div
            className={`
              inline-flex
              items-center
              gap-1
              px-2
              py-1
              rounded
              text-xs
              font-medium
              transition-all
              duration-500
              ease-in-out
              ${styles.statusBg}
              ${styles.statusText}
            `}
          >
            <div className="w-2 h-2 rounded-full bg-current animate-pulse transition-all duration-500 ease-in-out" />
            {data.status.toUpperCase()}
          </div>
        </div>

        {/* Health Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Health</span>
            <span className={`font-mono font-semibold ${styles.statusText}`}>
              {data.health}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${styles.healthBar} transition-all duration-500 ease-in-out rounded-full`}
              style={{ width: `${data.health}%` }}
            />
          </div>
        </div>

        {/* Glow Effect */}
        <div
          className={`
            absolute
            inset-0
            rounded-lg
            ${styles.glowColor}
            opacity-20
            blur-xl
            -z-10
            transition-all
            duration-500
            ease-in-out
          `}
        />
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-slate-600 !border-2 !border-slate-400"
      />
    </div>
  );
});

AgnosticNode.displayName = 'AgnosticNode';

// Made with Bob
