/**
 * Core TypeScript types for IncidentOps
 * These types are shared across the application to prevent circular dependencies
 */

/**
 * Runtime state of the simulation
 */
export type RuntimeState = 
  | 'HEALTHY' 
  | 'MELTDOWN' 
  | 'INVESTIGATING' 
  | 'FIX_DEPLOYING' 
  | 'RECOVERED';

/**
 * Event severity levels
 */
export type EventSeverity = 'info' | 'warning' | 'critical';

/**
 * Cloud provider types
 */
export type CloudProvider = 'GCP' | 'AWS' | 'Azure' | 'Generic';

/**
 * Service types in cloud infrastructure
 */
export type ServiceType = 
  | 'LoadBalancer'
  | 'Kubernetes'
  | 'Database'
  | 'Cache'
  | 'Storage'
  | 'Compute'
  | 'Network'
  | 'Monitoring';

/**
 * Node status in the topology
 */
export type NodeStatus = 'active' | 'degraded' | 'failed' | 'recovering';

/**
 * Available actions that can be performed on nodes
 */
export type NodeAction = 
  | 'restart'
  | 'scale_up'
  | 'scale_down'
  | 'rollback'
  | 'investigate'
  | 'deploy_fix'
  | 'enable_circuit_breaker'
  | 'increase_timeout';

/**
 * Health metric for nodes (0-100)
 */
export type HealthMetric = number;

/**
 * Timestamp in milliseconds
 */
export type Timestamp = number;

/**
 * Unique identifier
 */
export type UUID = string;

// Made with Bob
