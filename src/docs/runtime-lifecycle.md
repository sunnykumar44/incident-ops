# Runtime Lifecycle Documentation

## Overview
This document details the complete flow of how simulation ticks propagate from the engine through the reducer to the UI, ensuring we never have a "frozen UI" issue again.

## Phase 1: Architectural Principles

### Event-Driven Architecture
The IncidentOps simulation follows a strict **event-driven architecture** where:
- **Components NEVER mutate state directly**
- All state changes flow through the EventDispatcher
- Every action is logged for audit trails and replay
- State mutations are deterministic and reproducible

**Key Principle**: Components dispatch events; they never mutate state.

```typescript
// ❌ WRONG: Direct state mutation
selectedNode.health = 50;

// ✅ CORRECT: Event-driven state change
globalEventDispatcher.dispatch('USER_ACTION_DISPATCHED', 'info', {
  actionId: 'restart_service',
  targetNodeId: selectedNode.id
});
```

### Centralized Tick Processing
The simulation uses a **centralized heartbeat** that drives all state changes:
- **SimulationTickLoop** runs on a 2000ms interval
- Each tick executes registered handlers in sequence
- Handlers apply metric noise, degradation, recovery, and evaluation
- All updates are merged into a single state snapshot per tick

**Key Principle**: The tick loop is the single source of truth for time progression.

```typescript
// Tick handlers execute in order:
1. Generate ±2% noise for metric oscillation
2. Calculate systemHealthScore from all nodes
3. Apply pressure degradation (if MELTDOWN state)
4. Apply recovery improvements (if FIX_DEPLOYING state)
5. Check success conditions and state transitions
6. Update stableTicks counter and incident timeline
```

### Recovery Stabilization Logic
The simulation requires **5 consecutive stable ticks** before transitioning to RECOVERED:
- A tick is "stable" when systemHealthScore ≥ 80%
- The `stableTicks` counter increments on stable ticks
- The counter resets to 0 if health drops below 80%
- Only after 5 stable ticks does state transition to RECOVERED

**Key Principle**: Recovery requires sustained stability, not just a momentary spike.

```typescript
// Recovery evaluation logic
if (systemHealthScore >= 80) {
  stableTicks++;
  if (stableTicks >= 5) {
    runtimeState = 'RECOVERED';
  }
} else {
  stableTicks = 0; // Reset on any instability
}
```

### Audit Trail and Snapshots
Every tick captures a **complete state snapshot** for replay and debugging:
- Deep clones of all nodes (to prevent reference sharing)
- Full simulation state (tick, health, runtime state, timeline)
- Event log with timestamps and payloads
- Enables time-travel debugging and incident postmortems

**Key Principle**: Every operational move is logged and auditable.

```typescript
// Snapshot structure
{
  tick: 42,
  timestamp: '2026-05-17T17:30:00.000Z',
  runtimeState: 'FIX_DEPLOYING',
  systemHealthScore: 67,
  nodes: [/* deep cloned node array */],
  incidentTimeline: [/* all timeline entries */]
}
```

### Metric Oscillation for Realism
The simulation adds **±2% noise** to all health metrics:
- Simulates real-world telemetry fluctuations
- Prevents static, unrealistic health values
- Applied every tick using seeded randomness
- Maintains deterministic behavior for replay

**Key Principle**: Real systems oscillate; static metrics are unrealistic.

```typescript
// Noise generation (±2%)
const noise = (Math.random() - 0.5) * 4; // -2% to +2%
node.health = Math.max(0, Math.min(100, node.health + noise));
```

## Architecture Components

### 1. SimulationTickLoop (`src/runtime/simulationTick.ts`)
- **Purpose**: Core tick engine that runs on a setInterval
- **Responsibilities**:
  - Executes registered tick handlers every `tickInterval` (2000ms)
  - Maintains simulation state between ticks
  - Dispatches TICK_START and TICK_END events
  - Manages start/stop/pause/resume lifecycle

### 2. useSimulationEngine Hook (`src/simulation/useSimulationEngine.ts`)
- **Purpose**: React hook that bridges the tick engine to React state
- **Responsibilities**:
  - Manages simulation state via useReducer
  - Subscribes to tick events from EventDispatcher
  - Translates events into reducer actions
  - Provides control functions (start, pause, stop, reset)

### 3. Event Dispatcher (`src/core/EventDispatcher.ts`)
- **Purpose**: Pub/sub event bus for deterministic state changes
- **Responsibilities**:
  - Routes events between tick engine and React hook
  - Maintains event log for replay/debugging
  - Ensures all state mutations are auditable

## Complete Tick Flow

### Phase 1: Simulation Start
```
User clicks "Start Simulation"
  ↓
handleStartSimulation() in page.tsx
  ↓
dispatcher.dispatch('SIMULATION_STARTED')
  ↓
startSimulation() called
  ↓
dispatch({ type: 'START_SIMULATION' })
  ↓
Reducer updates state: { isRunning: true, startTime: now, lastTickTime: now }
  ↓
useEffect watches state.simulation.isRunning change
  ↓
tickLoopRef.current.start(state.simulation, callback)
  ↓
setInterval begins firing every 2000ms
```

### Phase 2: Tick Execution
```
setInterval fires (every 2000ms)
  ↓
SimulationTickLoop.executeTick(currentState)
  ↓
dispatcher.dispatch('TICK_START', { tick, deltaTime })
  ↓
Execute all registered tick handlers in order:
  - Generate noise for metric oscillation
  - Calculate systemHealthScore
  - Apply pressure degradation (if MELTDOWN)
  - Apply recovery (if FIX_DEPLOYING)
  - Check success conditions
  - Update stableTicks, incidentTimeline
  ↓
Merge all handler updates into updatedState
  ↓
Increment currentTick
  ↓
Capture state snapshot for replay
  ↓
dispatcher.dispatch('TICK_END', {
    tick,
    runtimeState,
    score,
    systemHealthScore,
    nodes,
    stableTicks,
    ticksSinceHpaEnabled,
    hpaEnabled,
    incidentTimeline,
    snapshotLog
  })
```

### Phase 3: State Propagation to UI
```
EventDispatcher fires 'TICK_END' event
  ↓
useEffect event listener in useSimulationEngine catches it
  ↓
dispatch({ type: 'TICK_UPDATE', payload: { ...all updated fields } })
  ↓
simulationReducer processes TICK_UPDATE:
  return {
    ...state,
    simulation: {
      ...state.simulation,
      ...action.payload  // Spreads all updated fields
    }
  }
  ↓
React detects state change (new object reference)
  ↓
Components re-render with new state:
  - page.tsx header shows updated tick count
  - page.tsx header shows updated systemHealthScore
  - TopologyMap shows updated node health/status
  - ActionPanel shows updated node details
```

### Phase 4: User Action
```
User clicks action button in ActionPanel
  ↓
handleActionClick(actionId)
  ↓
globalEventDispatcher.dispatch('USER_ACTION_DISPATCHED', {
    actionId,
    targetNodeId
  })
  ↓
useEffect event listener catches it
  ↓
dispatch({ type: 'USER_ACTION_DISPATCHED', payload })
  ↓
Reducer processes action:
  - Updates hpaEnabled flag
  - Transitions runtimeState
  - Modifies node health
  - Adds timeline entry
  - Awards score points
  ↓
React re-renders with updated state
  ↓
Next tick will see updated state and continue from there
```

## Critical Implementation Details

### Why the useEffect Pattern?
The tick loop MUST start AFTER the reducer updates `isRunning: true`. We use a useEffect that watches `state.simulation.isRunning` to ensure:
1. User clicks Start
2. Reducer updates state
3. React re-renders
4. useEffect sees isRunning=true
5. Tick loop starts with CURRENT state (not stale closure)

### Why Spread All Fields in TICK_UPDATE?
The TICK_END event payload contains ALL updated fields. The reducer MUST spread all of them:
```typescript
simulation: {
  ...state.simulation,
  ...action.payload  // Critical: includes nodes, systemHealthScore, etc.
}
```
If we only update specific fields, the UI won't see changes to nodes, health scores, timelines, etc.

### Why Deep Clone in Snapshots?
```typescript
nodes: JSON.parse(JSON.stringify(updatedState.nodes))
```
Without deep cloning, all snapshots would reference the same node objects, making replay impossible.

## Common Issues and Solutions

### Issue: Tick Counter Frozen at 0
**Cause**: Tick loop not starting or TICK_UPDATE not propagating currentTick
**Solution**: 
- Verify useEffect watching isRunning is firing
- Verify TICK_END payload includes tick field
- Verify reducer spreads action.payload

### Issue: Health Not Updating
**Cause**: TICK_UPDATE not including nodes array
**Solution**:
- Verify tick handlers return updated nodes
- Verify TICK_END payload includes nodes
- Verify reducer spreads nodes into state

### Issue: Actions Don't Work
**Cause**: USER_ACTION_DISPATCHED not being handled
**Solution**:
- Verify globalEventDispatcher is same instance
- Verify event listener is registered
- Verify reducer handles USER_ACTION_DISPATCHED

### Issue: Simulation Starts Then Immediately Stops
**Cause**: Tick loop starting with stale state that has isRunning=false
**Solution**:
- Use useEffect pattern to start tick loop AFTER state update
- Never call tickLoop.start() directly in action handlers

## Testing Checklist

Before pushing any changes to the simulation engine:

- [ ] Click Start Simulation
- [ ] Verify tick counter increments every 2 seconds
- [ ] Verify systemHealthScore changes (oscillates)
- [ ] Verify node health degrades during MELTDOWN
- [ ] Click a node to open ActionPanel
- [ ] Verify action buttons appear
- [ ] Click an action button
- [ ] Verify state transitions (MELTDOWN → INVESTIGATING)
- [ ] Verify health improves after fix deployed
- [ ] Verify incident timeline updates
- [ ] Verify simulation reaches RECOVERED after 5 stable ticks

## Debugging Tips

### Enable Verbose Logging
The EventDispatcher logs all events to console. Check for:
- TICK_START events every 2000ms
- TICK_END events with full payload
- USER_ACTION_DISPATCHED events when clicking buttons

### Check React DevTools
- Inspect useSimulationEngine state
- Verify simulation.currentTick increments
- Verify simulation.nodes array updates
- Verify simulation.systemHealthScore changes

### Breakpoint Locations
- `simulationReducer` TICK_UPDATE case
- `executeTick` in SimulationTickLoop
- `useEffect` watching isRunning
- Event listener for TICK_END

## Future Improvements

1. **Replay System**: Use snapshotLog to replay incidents
2. **Time Travel Debugging**: Step through ticks forward/backward
3. **Performance Monitoring**: Track tick execution time
4. **State Persistence**: Save/load simulation state
5. **Multi-Speed Playback**: Adjust tickInterval dynamically

---

**Last Updated**: 2026-05-17  
**Author**: Bob (AI Assistant)  
**Version**: 1.0.0