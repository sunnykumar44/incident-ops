'use client';

import { useReducer, useEffect, useRef, useCallback } from 'react';
import { EventDispatcher, SimulationEvent } from '../core/EventDispatcher';
import { RuntimeState, NodeAction } from '../core/types';
import { Scenario, Node } from '../schema/Scenario';
import { 
  SimulationState, 
  SimulationTickLoop, 
  createInitialSimulationState 
} from '../runtime/simulationTick';

/**
 * Actions that can be dispatched to the simulation reducer
 */
type SimulationAction =
  | { type: 'LOAD_SCENARIO'; payload: Scenario }
  | { type: 'START_SIMULATION' }
  | { type: 'PAUSE_SIMULATION' }
  | { type: 'RESUME_SIMULATION' }
  | { type: 'STOP_SIMULATION' }
  | { type: 'TICK_UPDATE'; payload: Partial<SimulationState> }
  | { type: 'USER_ACTION_DISPATCHED'; payload: { actionId: string; targetNodeId: string } }
  | { type: 'EXECUTE_ACTION'; payload: { nodeId: string; action: NodeAction } }
  | { type: 'UPDATE_NODE_HEALTH'; payload: { nodeId: string; health: number } }
  | { type: 'UPDATE_RUNTIME_STATE'; payload: RuntimeState }
  | { type: 'UPDATE_SCORE'; payload: number }
  | { type: 'RESET_SIMULATION' };

/**
 * Complete simulation engine state
 */
interface SimulationEngineState {
  scenario: Scenario | null;
  simulation: SimulationState | null;
  isLoaded: boolean;
  isPaused: boolean;
  error: string | null;
}

/**
 * Initial state for the simulation engine
 */
const initialState: SimulationEngineState = {
  scenario: null,
  simulation: null,
  isLoaded: false,
  isPaused: false,
  error: null
};

/**
 * Reducer for simulation state management
 * All state mutations occur exclusively through this reducer
 */
function simulationReducer(
  state: SimulationEngineState,
  action: SimulationAction
): SimulationEngineState {
  switch (action.type) {
    case 'LOAD_SCENARIO':
      return {
        ...state,
        scenario: action.payload,
        simulation: createInitialSimulationState(
          action.payload.topology.nodes,
          action.payload.initialState
        ),
        isLoaded: true,
        error: null
      };

    case 'START_SIMULATION':
      if (!state.simulation) {
        return { ...state, error: 'No scenario loaded' };
      }
      return {
        ...state,
        simulation: {
          ...state.simulation,
          isRunning: true,
          startTime: Date.now(),
          lastTickTime: Date.now()
        },
        isPaused: false,
        error: null
      };

    case 'PAUSE_SIMULATION':
      if (!state.simulation) {
        return state;
      }
      return {
        ...state,
        simulation: {
          ...state.simulation,
          isRunning: false
        },
        isPaused: true
      };

    case 'RESUME_SIMULATION':
      if (!state.simulation) {
        return state;
      }
      return {
        ...state,
        simulation: {
          ...state.simulation,
          isRunning: true,
          lastTickTime: Date.now()
        },
        isPaused: false
      };

    case 'STOP_SIMULATION':
      if (!state.simulation) {
        return state;
      }
      return {
        ...state,
        simulation: {
          ...state.simulation,
          isRunning: false
        },
        isPaused: false
      };

    case 'TICK_UPDATE':
      if (!state.simulation) {
        return state;
      }
      // Deep clone nodes array to ensure React detects changes
      const updatedPayload = { ...action.payload };
      if (updatedPayload.nodes) {
        updatedPayload.nodes = updatedPayload.nodes.map(node => ({ ...node }));
      }
      if (updatedPayload.incidentTimeline) {
        updatedPayload.incidentTimeline = [...updatedPayload.incidentTimeline];
      }
      if (updatedPayload.snapshotLog) {
        updatedPayload.snapshotLog = [...updatedPayload.snapshotLog];
      }
      return {
        ...state,
        simulation: {
          ...state.simulation,
          ...updatedPayload
        }
      };

    case 'USER_ACTION_DISPATCHED': {
      if (!state.simulation || !state.scenario) {
        return state;
      }

      const { actionId, targetNodeId } = action.payload;
      let updatedSimulation = { ...state.simulation };
      const timeline = [...updatedSimulation.incidentTimeline];

      // Handle specific actions that affect simulation state
      if (actionId === 'enable_circuit_breaker') {
        // Enable HPA (Horizontal Pod Autoscaler) as the fix
        updatedSimulation.hpaEnabled = true;
        updatedSimulation.ticksSinceHpaEnabled = 0;
        updatedSimulation.stableTicks = 0; // Reset stable ticks
        
        // Transition to INVESTIGATING state
        if (updatedSimulation.runtimeState === 'MELTDOWN') {
          updatedSimulation.runtimeState = 'INVESTIGATING';
          timeline.push('🔍 Circuit breaker enabled - Beginning investigation phase');
        }

        // Apply immediate health improvement to the target node
        updatedSimulation.nodes = updatedSimulation.nodes.map(node => {
          if (node.id === targetNodeId) {
            return {
              ...node,
              health: Math.min(100, node.health + 15),
              status: node.health + 15 >= 70 ? 'recovering' as const : node.status
            };
          }
          return node;
        });

        // Award points for correct action
        updatedSimulation.score += state.scenario.rewards.correctActionBonus;
        timeline.push(`✅ Autoscaling enabled on ${targetNodeId}`);
      } else if (actionId === 'scale_up') {
        // Scale up action improves health
        updatedSimulation.nodes = updatedSimulation.nodes.map(node => {
          if (node.id === targetNodeId) {
            return {
              ...node,
              health: Math.min(100, node.health + 20),
              status: node.health + 20 >= 70 ? 'recovering' as const : node.status
            };
          }
          return node;
        });
        updatedSimulation.score += state.scenario.rewards.correctActionBonus;
        timeline.push(`⬆️ Scaled up ${targetNodeId}`);
      } else if (actionId === 'investigate') {
        // Investigation doesn't change health but transitions state
        if (updatedSimulation.runtimeState === 'MELTDOWN') {
          updatedSimulation.runtimeState = 'INVESTIGATING';
          timeline.push('🔍 Investigation initiated - Analyzing system metrics');
        }
        updatedSimulation.score += Math.floor(state.scenario.rewards.correctActionBonus / 2);
      } else if (actionId === 'deploy_fix') {
        // Deploy fix improves health significantly
        updatedSimulation.nodes = updatedSimulation.nodes.map(node => {
          if (node.id === targetNodeId) {
            return {
              ...node,
              health: Math.min(100, node.health + 30),
              status: node.health + 30 >= 70 ? 'recovering' as const : node.status
            };
          }
          return node;
        });
        
        if (updatedSimulation.runtimeState === 'INVESTIGATING') {
          updatedSimulation.runtimeState = 'FIX_DEPLOYING';
          timeline.push('🚀 Fix deployment initiated');
        }
        
        updatedSimulation.score += state.scenario.rewards.correctActionBonus;
        timeline.push(`🔧 Deployed fix to ${targetNodeId}`);
      } else if (actionId === 'restart') {
        // Restart improves health moderately
        updatedSimulation.nodes = updatedSimulation.nodes.map(node => {
          if (node.id === targetNodeId) {
            return {
              ...node,
              health: Math.min(100, node.health + 25),
              status: node.health + 25 >= 70 ? 'recovering' as const : node.status
            };
          }
          return node;
        });
        updatedSimulation.score += state.scenario.rewards.correctActionBonus;
        timeline.push(`🔄 Restarted ${targetNodeId}`);
      } else {
        // Other actions have minimal effect
        updatedSimulation.nodes = updatedSimulation.nodes.map(node => {
          if (node.id === targetNodeId) {
            return {
              ...node,
              health: Math.min(100, node.health + 10)
            };
          }
          return node;
        });
        updatedSimulation.score += Math.floor(state.scenario.rewards.correctActionBonus / 3);
        timeline.push(`⚙️ Action '${actionId}' executed on ${targetNodeId}`);
      }

      updatedSimulation.incidentTimeline = timeline;
      
      // Deep clone nodes to ensure React detects changes
      updatedSimulation.nodes = updatedSimulation.nodes.map(node => ({ ...node }));

      return {
        ...state,
        simulation: updatedSimulation
      };
    }

    case 'EXECUTE_ACTION': {
      if (!state.simulation || !state.scenario) {
        return state;
      }

      const { nodeId, action: nodeAction } = action.payload;
      const updatedNodes = state.simulation.nodes.map(node => {
        if (node.id === nodeId) {
          // Check if action is available
          if (!node.availableActions.includes(nodeAction)) {
            return node;
          }

          // Apply action effects (simplified logic)
          let healthDelta = 0;
          switch (nodeAction) {
            case 'restart':
              healthDelta = 20;
              break;
            case 'scale_up':
              healthDelta = 15;
              break;
            case 'deploy_fix':
              healthDelta = 30;
              break;
            case 'enable_circuit_breaker':
              healthDelta = 10;
              break;
            default:
              healthDelta = 5;
          }

          return {
            ...node,
            health: Math.min(100, node.health + healthDelta),
            status: node.health + healthDelta >= 80 ? 'active' as const : node.status
          };
        }
        return node;
      });

      return {
        ...state,
        simulation: {
          ...state.simulation,
          nodes: updatedNodes
        }
      };
    }

    case 'UPDATE_NODE_HEALTH': {
      if (!state.simulation) {
        return state;
      }

      const { nodeId, health } = action.payload;
      const updatedNodes = state.simulation.nodes.map(node =>
        node.id === nodeId
          ? {
              ...node,
              health: Math.max(0, Math.min(100, health)),
              status: health < 30 ? 'failed' as const : 
                      health < 70 ? 'degraded' as const : 'active' as const
            }
          : node
      );

      return {
        ...state,
        simulation: {
          ...state.simulation,
          nodes: updatedNodes
        }
      };
    }

    case 'UPDATE_RUNTIME_STATE':
      if (!state.simulation) {
        return state;
      }
      return {
        ...state,
        simulation: {
          ...state.simulation,
          runtimeState: action.payload
        }
      };

    case 'UPDATE_SCORE':
      if (!state.simulation) {
        return state;
      }
      return {
        ...state,
        simulation: {
          ...state.simulation,
          score: state.simulation.score + action.payload
        }
      };

    case 'RESET_SIMULATION':
      if (!state.scenario) {
        return initialState;
      }
      return {
        ...state,
        simulation: createInitialSimulationState(
          state.scenario.topology.nodes,
          state.scenario.initialState
        ),
        isPaused: false,
        error: null
      };

    default:
      return state;
  }
}

/**
 * Custom React hook for the simulation engine
 * Uses useReducer to ensure all state mutations occur through events
 */
export function useSimulationEngine() {
  const [state, dispatch] = useReducer(simulationReducer, initialState);
  const dispatcherRef = useRef<EventDispatcher>(new EventDispatcher());
  const tickLoopRef = useRef<SimulationTickLoop | null>(null);

  // Initialize tick loop
  useEffect(() => {
    if (!tickLoopRef.current && state.scenario) {
      tickLoopRef.current = new SimulationTickLoop(
        dispatcherRef.current,
        state.scenario.simulation.tickInterval,
        state.scenario.simulation.maxTicks
      );

      // Register default tick handlers
      tickLoopRef.current.registerHandler((context) => {
        if (!state.scenario) return;

        let updates: Partial<SimulationState> = {};

        // Generate realistic noise for metric oscillation (±2% variance)
        const generateNoise = () => (Math.random() - 0.5) * 4;

        // Calculate system health score with oscillation
        const avgNodeHealth = context.state.nodes.reduce((sum, node) => sum + node.health, 0) / context.state.nodes.length;
        const healthScore = Math.max(0, Math.min(100, Math.round(avgNodeHealth + generateNoise())));
        updates.systemHealthScore = healthScore;

        // Increment ticks since HPA enabled
        if (context.state.hpaEnabled) {
          updates.ticksSinceHpaEnabled = context.state.ticksSinceHpaEnabled + 1;
        }

        // Apply pressure degradation during MELTDOWN with oscillation
        if (context.state.runtimeState === 'MELTDOWN') {
          const degradationRate = state.scenario.pressure.escalationRate;
          const updatedNodes = context.state.nodes.map(node => {
            // Add realistic oscillation to health degradation
            const baseDegrade = degradationRate * 10;
            const oscillation = generateNoise();
            const newHealth = Math.max(0, node.health - baseDegrade + oscillation);
            
            return {
              ...node,
              health: newHealth,
              status: newHealth < 30 ? 'failed' as const :
                      newHealth < 70 ? 'degraded' as const : node.status
            };
          });
          updates.nodes = updatedNodes;
        }

        // Apply recovery during FIX_DEPLOYING with oscillation
        if (context.state.runtimeState === 'FIX_DEPLOYING' && context.state.hpaEnabled) {
          const recoveryRate = state.scenario.pressure.recoveryRate;
          const updatedNodes = context.state.nodes.map(node => {
            // Add realistic oscillation to health recovery
            const baseRecovery = recoveryRate * 10;
            const oscillation = generateNoise();
            const newHealth = Math.min(100, node.health + baseRecovery + oscillation);
            
            return {
              ...node,
              health: newHealth,
              status: newHealth >= 80 ? 'active' as const :
                      newHealth >= 70 ? 'recovering' as const : node.status
            };
          });
          updates.nodes = updatedNodes;
        }

        // Check success conditions on every tick
        if (context.state.hpaEnabled && context.state.ticksSinceHpaEnabled >= 5) {
          // Success condition: HPA enabled and 5 ticks have passed
          const allNodesHealthy = context.state.nodes.every(node => node.health >= 80);
          
          if (allNodesHealthy && context.state.runtimeState !== 'RECOVERED') {
            updates.runtimeState = 'RECOVERED';
            // Award perfect resolution bonus
            updates.score = context.state.score + state.scenario.rewards.perfectResolutionBonus;
            
            // Dispatch recovery event
            context.dispatcher.dispatch('INCIDENT_RESOLVED', 'info', {
              tick: context.state.currentTick,
              timeToResolve: context.state.currentTick,
              finalScore: updates.score
            });
          }
        }

        return Object.keys(updates).length > 0 ? updates : undefined;
      });
    }

    return () => {
      if (tickLoopRef.current) {
        tickLoopRef.current.stop();
      }
    };
  }, [state.scenario]);

  // Start/stop tick loop based on simulation running state
  useEffect(() => {
    if (!state.simulation || !tickLoopRef.current) {
      return;
    }

    if (state.simulation.isRunning && !state.isPaused) {
      // Start the tick loop with current simulation state
      tickLoopRef.current.start(state.simulation, (updatedState) => {
        dispatch({ type: 'TICK_UPDATE', payload: updatedState });
      });
    } else {
      // Stop the tick loop
      tickLoopRef.current.stop();
    }

    return () => {
      if (tickLoopRef.current) {
        tickLoopRef.current.stop();
      }
    };
  }, [state.simulation?.isRunning, state.isPaused]);

  // Subscribe to events and update state
  useEffect(() => {
    const dispatcher = dispatcherRef.current;

    const unsubscribe = dispatcher.onAll((event: SimulationEvent) => {
      // Handle specific events that should trigger state updates
      switch (event.type) {
        case 'USER_ACTION_DISPATCHED':
          if (event.payload) {
            dispatch({
              type: 'USER_ACTION_DISPATCHED',
              payload: {
                actionId: event.payload.actionId as string,
                targetNodeId: event.payload.targetNodeId as string
              }
            });
          }
          break;

        case 'TICK_END':
          if (event.payload && state.simulation) {
            // Extract all updated fields from the payload
            const updates: Partial<SimulationState> = {
              currentTick: event.payload.tick as number,
              runtimeState: event.payload.runtimeState as RuntimeState,
              score: event.payload.score as number
            };
            
            // Include all other fields that may have been updated
            if (event.payload.systemHealthScore !== undefined) {
              updates.systemHealthScore = event.payload.systemHealthScore as number;
            }
            if (event.payload.nodes) {
              updates.nodes = event.payload.nodes as typeof state.simulation.nodes;
            }
            if (event.payload.stableTicks !== undefined) {
              updates.stableTicks = event.payload.stableTicks as number;
            }
            if (event.payload.ticksSinceHpaEnabled !== undefined) {
              updates.ticksSinceHpaEnabled = event.payload.ticksSinceHpaEnabled as number;
            }
            if (event.payload.hpaEnabled !== undefined) {
              updates.hpaEnabled = event.payload.hpaEnabled as boolean;
            }
            if (event.payload.incidentTimeline) {
              updates.incidentTimeline = event.payload.incidentTimeline as string[];
            }
            if (event.payload.snapshotLog) {
              updates.snapshotLog = event.payload.snapshotLog as typeof state.simulation.snapshotLog;
            }
            
            dispatch({
              type: 'TICK_UPDATE',
              payload: updates
            });
          }
          break;

        case 'MAX_TICKS_REACHED':
          dispatch({ type: 'STOP_SIMULATION' });
          break;

        case 'INCIDENT_RESOLVED':
          // Stop simulation when incident is resolved
          dispatch({ type: 'STOP_SIMULATION' });
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [state.simulation]);

  // Load scenario
  const loadScenario = useCallback((scenario: Scenario) => {
    dispatch({ type: 'LOAD_SCENARIO', payload: scenario });
    dispatcherRef.current.dispatch('SCENARIO_LOADED', 'info', {
      scenarioName: scenario.name,
      version: scenario.version
    });
  }, []);

  // Start simulation
  const startSimulation = useCallback(() => {
    if (!state.simulation) {
      return;
    }

    dispatch({ type: 'START_SIMULATION' });
    // Tick loop will be started by the useEffect watching isRunning
  }, [state.simulation]);

  // Pause simulation
  const pauseSimulation = useCallback(() => {
    dispatch({ type: 'PAUSE_SIMULATION' });
    // Tick loop will be stopped by the useEffect watching isPaused
  }, []);

  // Resume simulation
  const resumeSimulation = useCallback(() => {
    if (!state.simulation) {
      return;
    }

    dispatch({ type: 'RESUME_SIMULATION' });
    // Tick loop will be restarted by the useEffect watching isPaused
  }, [state.simulation]);

  // Stop simulation
  const stopSimulation = useCallback(() => {
    dispatch({ type: 'STOP_SIMULATION' });
    // Tick loop will be stopped by the useEffect watching isRunning
  }, []);

  // Execute action on a node
  const executeAction = useCallback((nodeId: string, action: NodeAction) => {
    dispatch({ type: 'EXECUTE_ACTION', payload: { nodeId, action } });
    dispatcherRef.current.dispatch('ACTION_EXECUTED', 'info', {
      nodeId,
      action
    });
  }, []);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    tickLoopRef.current?.stop();
    dispatch({ type: 'RESET_SIMULATION' });
    dispatcherRef.current.dispatch('SIMULATION_RESET', 'info', {});
  }, []);

  return {
    // State
    scenario: state.scenario,
    simulation: state.simulation,
    isLoaded: state.isLoaded,
    isPaused: state.isPaused,
    error: state.error,

    // Actions
    loadScenario,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    executeAction,
    resetSimulation,

    // Event dispatcher for external use
    dispatcher: dispatcherRef.current
  };
}

// Made with Bob
