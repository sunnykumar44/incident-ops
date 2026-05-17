import { z } from 'zod';

/**
 * Zod schemas for IncidentOps Scenario structure
 * Ensures type safety and validation for scenario cartridges
 */

// Runtime state schema
export const RuntimeStateSchema = z.enum([
  'HEALTHY',
  'MELTDOWN',
  'INVESTIGATING',
  'FIX_DEPLOYING',
  'RECOVERED'
]);

// Event severity schema
export const EventSeveritySchema = z.enum(['info', 'warning', 'critical']);

// Cloud provider schema
export const CloudProviderSchema = z.enum(['GCP', 'AWS', 'Azure', 'Generic']);

// Service type schema
export const ServiceTypeSchema = z.enum([
  'LoadBalancer',
  'Kubernetes',
  'Database',
  'Cache',
  'Storage',
  'Compute',
  'Network',
  'Monitoring'
]);

// Node status schema
export const NodeStatusSchema = z.enum(['active', 'degraded', 'failed', 'recovering']);

// Node action schema
export const NodeActionSchema = z.enum([
  'restart',
  'scale_up',
  'scale_down',
  'rollback',
  'investigate',
  'deploy_fix',
  'enable_circuit_breaker',
  'increase_timeout'
]);

// Node schema - cloud-agnostic infrastructure node
export const NodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  provider: CloudProviderSchema,
  serviceType: ServiceTypeSchema,
  status: NodeStatusSchema,
  health: z.number().min(0).max(100),
  availableActions: z.array(NodeActionSchema),
  metadata: z.record(z.string(), z.unknown()).optional()
});

// Edge schema - connections between nodes
export const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

// Topology schema - infrastructure graph
export const TopologySchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema)
});

// Pressure configuration - defines how incidents escalate
export const PressureConfigSchema = z.object({
  initialDelay: z.number().min(0).describe('Milliseconds before pressure starts'),
  escalationRate: z.number().min(0).max(1).describe('Rate of health degradation per tick'),
  cascadeThreshold: z.number().min(0).max(100).describe('Health level that triggers cascade'),
  recoveryRate: z.number().min(0).max(1).describe('Rate of health recovery per tick')
});

// Reward configuration - scoring system
export const RewardConfigSchema = z.object({
  correctActionBonus: z.number(),
  incorrectActionPenalty: z.number(),
  timeToResolvePenalty: z.number(),
  cascadePreventionBonus: z.number(),
  perfectResolutionBonus: z.number()
});

// Simulation configuration
export const SimulationConfigSchema = z.object({
  tickInterval: z.number().min(100).describe('Milliseconds between simulation ticks'),
  maxTicks: z.number().min(1).describe('Maximum number of ticks before auto-end'),
  autoResolve: z.boolean().describe('Whether simulation auto-resolves after maxTicks'),
  deterministicSeed: z.string().optional().describe('Seed for deterministic randomness')
});

// Complete Scenario schema
export const ScenarioSchema = z.object({
  version: z.string().describe('Scenario version (semver)'),
  name: z.string(),
  description: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  estimatedDuration: z.number().describe('Expected duration in minutes'),
  
  // Separated concerns
  topology: TopologySchema,
  simulation: SimulationConfigSchema,
  pressure: PressureConfigSchema,
  rewards: RewardConfigSchema,
  
  // Initial state
  initialState: RuntimeStateSchema,
  
  // Learning objectives
  learningObjectives: z.array(z.string()),
  
  // Metadata
  tags: z.array(z.string()),
  author: z.string().optional(),
  createdAt: z.string().datetime().optional()
});

// Type exports
export type RuntimeState = z.infer<typeof RuntimeStateSchema>;
export type EventSeverity = z.infer<typeof EventSeveritySchema>;
export type CloudProvider = z.infer<typeof CloudProviderSchema>;
export type ServiceType = z.infer<typeof ServiceTypeSchema>;
export type NodeStatus = z.infer<typeof NodeStatusSchema>;
export type NodeAction = z.infer<typeof NodeActionSchema>;
export type Node = z.infer<typeof NodeSchema>;
export type Edge = z.infer<typeof EdgeSchema>;
export type Topology = z.infer<typeof TopologySchema>;
export type PressureConfig = z.infer<typeof PressureConfigSchema>;
export type RewardConfig = z.infer<typeof RewardConfigSchema>;
export type SimulationConfig = z.infer<typeof SimulationConfigSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;

// Made with Bob
