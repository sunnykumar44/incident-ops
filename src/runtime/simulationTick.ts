import { EventDispatcher } from '../core/EventDispatcher';
import { RuntimeState } from '../core/types';
import { Node } from '../schema/Scenario';

/**
 * State snapshot for replay functionality
 */
export interface StateSnapshot {
  tick: number;
  timestamp: number;
  runtimeState: RuntimeState;
  nodes: Node[];
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * Simulation state that gets updated each tick
 */
export interface SimulationState {
  currentTick: number;
  runtimeState: RuntimeState;
  nodes: Node[];
  score: number;
  isRunning: boolean;
  startTime: number;
  lastTickTime: number;
  snapshotLog: StateSnapshot[];
  hpaEnabled: boolean;
  ticksSinceHpaEnabled: number;
  systemHealthScore: number;
  stableTicks: number;
  incidentTimeline: string[];
}

/**
 * Tick context passed to tick handlers
 */
export interface TickContext {
  state: SimulationState;
  dispatcher: EventDispatcher;
  deltaTime: number;
}

/**
 * Tick handler function type
 */
export type TickHandler = (context: TickContext) => Partial<SimulationState> | void;

/**
 * Centralized simulation tick loop
 * 
 * This function acts as the heartbeat of the simulation engine,
 * executing registered tick handlers in a deterministic order.
 */
export class SimulationTickLoop {
  private tickHandlers: TickHandler[];
  private intervalId: NodeJS.Timeout | null;
  private tickInterval: number;
  private maxTicks: number;
  private dispatcher: EventDispatcher;

  constructor(
    dispatcher: EventDispatcher,
    tickInterval: number = 1000,
    maxTicks: number = 1000
  ) {
    this.tickHandlers = [];
    this.intervalId = null;
    this.tickInterval = tickInterval;
    this.maxTicks = maxTicks;
    this.dispatcher = dispatcher;
  }

  /**
   * Register a tick handler
   */
  registerHandler(handler: TickHandler): void {
    this.tickHandlers.push(handler);
  }

  /**
   * Remove a tick handler
   */
  unregisterHandler(handler: TickHandler): void {
    const index = this.tickHandlers.indexOf(handler);
    if (index > -1) {
      this.tickHandlers.splice(index, 1);
    }
  }

  /**
   * Execute a single tick
   */
  executeTick(state: SimulationState): SimulationState {
    const now = Date.now();
    const deltaTime = now - state.lastTickTime;

    // Create tick context
    const context: TickContext = {
      state,
      dispatcher: this.dispatcher,
      deltaTime
    };

    // Dispatch tick start event
    this.dispatcher.dispatch('TICK_START', 'info', {
      tick: state.currentTick,
      deltaTime
    });

    // Execute all tick handlers in order
    let updatedState = { ...state };
    for (const handler of this.tickHandlers) {
      try {
        const updates = handler(context);
        if (updates) {
          updatedState = { ...updatedState, ...updates };
        }
      } catch (error) {
        console.error('Error in tick handler:', error);
        this.dispatcher.dispatch('TICK_ERROR', 'critical', {
          error: error instanceof Error ? error.message : 'Unknown error',
          tick: state.currentTick
        });
      }
    }

    // Update tick counter and timestamp
    updatedState.currentTick += 1;
    updatedState.lastTickTime = now;

    // Capture state snapshot for replay
    const snapshot: StateSnapshot = {
      tick: updatedState.currentTick,
      timestamp: now,
      runtimeState: updatedState.runtimeState,
      nodes: JSON.parse(JSON.stringify(updatedState.nodes)), // Deep clone
      score: updatedState.score,
      metadata: {
        hpaEnabled: updatedState.hpaEnabled,
        ticksSinceHpaEnabled: updatedState.ticksSinceHpaEnabled
      }
    };
    updatedState.snapshotLog = [...updatedState.snapshotLog, snapshot];

    // Check if max ticks reached
    if (updatedState.currentTick >= this.maxTicks) {
      this.dispatcher.dispatch('MAX_TICKS_REACHED', 'warning', {
        tick: updatedState.currentTick,
        maxTicks: this.maxTicks
      });
      updatedState.isRunning = false;
    }

    // Dispatch tick end event with all updated state
    this.dispatcher.dispatch('TICK_END', 'info', {
      tick: updatedState.currentTick,
      runtimeState: updatedState.runtimeState,
      score: updatedState.score,
      systemHealthScore: updatedState.systemHealthScore,
      nodes: updatedState.nodes,
      stableTicks: updatedState.stableTicks,
      ticksSinceHpaEnabled: updatedState.ticksSinceHpaEnabled,
      hpaEnabled: updatedState.hpaEnabled,
      incidentTimeline: updatedState.incidentTimeline,
      snapshotLog: updatedState.snapshotLog
    });

    return updatedState;
  }

  /**
   * Start the tick loop
   */
  start(
    initialState: SimulationState,
    onTick: (state: SimulationState) => void
  ): void {
    if (this.intervalId) {
      console.warn('Tick loop already running');
      return;
    }

    this.dispatcher.dispatch('SIMULATION_START', 'info', {
      tickInterval: this.tickInterval,
      maxTicks: this.maxTicks
    });

    let currentState = initialState;

    this.intervalId = setInterval(() => {
      if (!currentState.isRunning) {
        this.stop();
        return;
      }

      currentState = this.executeTick(currentState);
      onTick(currentState);
    }, this.tickInterval);
  }

  /**
   * Stop the tick loop
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;

      this.dispatcher.dispatch('SIMULATION_STOP', 'info', {
        timestamp: Date.now()
      });
    }
  }

  /**
   * Pause the tick loop
   */
  pause(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;

      this.dispatcher.dispatch('SIMULATION_PAUSE', 'info', {
        timestamp: Date.now()
      });
    }
  }

  /**
   * Resume the tick loop
   */
  resume(
    currentState: SimulationState,
    onTick: (state: SimulationState) => void
  ): void {
    if (this.intervalId) {
      console.warn('Tick loop already running');
      return;
    }

    this.dispatcher.dispatch('SIMULATION_RESUME', 'info', {
      timestamp: Date.now()
    });

    this.start(currentState, onTick);
  }

  /**
   * Check if the tick loop is running
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Update tick interval
   */
  setTickInterval(interval: number): void {
    this.tickInterval = interval;
    
    // If running, restart with new interval
    if (this.intervalId) {
      console.warn('Tick interval changed while running. Restart required.');
    }
  }

  /**
   * Get current tick interval
   */
  getTickInterval(): number {
    return this.tickInterval;
  }

  /**
   * Clear all tick handlers
   */
  clearHandlers(): void {
    this.tickHandlers = [];
  }
}

/**
 * Create a default simulation state
 */
export function createInitialSimulationState(
  nodes: Node[],
  runtimeState: RuntimeState = 'HEALTHY'
): SimulationState {
  const initialTimeline: string[] = [];
  
  // Add initial timeline entry based on state
  if (runtimeState === 'MELTDOWN') {
    initialTimeline.push('🚨 Traffic spike detected - System entering meltdown state');
  } else if (runtimeState === 'HEALTHY') {
    initialTimeline.push('✅ System initialized in healthy state');
  }

  return {
    currentTick: 0,
    runtimeState,
    nodes,
    score: 0,
    isRunning: false,
    startTime: Date.now(),
    lastTickTime: Date.now(),
    snapshotLog: [],
    hpaEnabled: false,
    ticksSinceHpaEnabled: 0,
    systemHealthScore: 100,
    stableTicks: 0,
    incidentTimeline: initialTimeline
  };
}

// Made with Bob
