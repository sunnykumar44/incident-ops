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
      return {
        ...state,
        simulation: {
          ...state.simulation,
          ...action.payload
        }
      };

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
        // Apply pressure degradation
        if (state.scenario && context.state.runtimeState === 'MELTDOWN') {
          const degradationRate = state.scenario.pressure.escalationRate;
          const updatedNodes = context.state.nodes.map(node => ({
            ...node,
            health: Math.max(0, node.health - degradationRate * 10)
          }));

          return { nodes: updatedNodes };
        }
      });
    }

    return () => {
      if (tickLoopRef.current) {
        tickLoopRef.current.stop();
      }
    };
  }, [state.scenario]);

  // Subscribe to events and update state
  useEffect(() => {
    const dispatcher = dispatcherRef.current;

    const unsubscribe = dispatcher.onAll((event: SimulationEvent) => {
      // Handle specific events that should trigger state updates
      switch (event.type) {
        case 'TICK_END':
          if (event.payload && state.simulation) {
            dispatch({
              type: 'TICK_UPDATE',
              payload: {
                currentTick: event.payload.tick as number,
                runtimeState: event.payload.runtimeState as RuntimeState,
                score: event.payload.score as number
              }
            });
          }
          break;

        case 'MAX_TICKS_REACHED':
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
    if (!state.simulation || !tickLoopRef.current) {
      return;
    }

    dispatch({ type: 'START_SIMULATION' });
    
    tickLoopRef.current.start(state.simulation, (updatedState) => {
      dispatch({ type: 'TICK_UPDATE', payload: updatedState });
    });
  }, [state.simulation]);

  // Pause simulation
  const pauseSimulation = useCallback(() => {
    dispatch({ type: 'PAUSE_SIMULATION' });
    tickLoopRef.current?.pause();
  }, []);

  // Resume simulation
  const resumeSimulation = useCallback(() => {
    if (!state.simulation || !tickLoopRef.current) {
      return;
    }

    dispatch({ type: 'RESUME_SIMULATION' });
    tickLoopRef.current.resume(state.simulation, (updatedState) => {
      dispatch({ type: 'TICK_UPDATE', payload: updatedState });
    });
  }, [state.simulation]);

  // Stop simulation
  const stopSimulation = useCallback(() => {
    dispatch({ type: 'STOP_SIMULATION' });
    tickLoopRef.current?.stop();
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
