import { v4 as uuidv4 } from 'uuid';
import { EventSeverity } from './types';

/**
 * Event structure for the deterministic simulation engine
 */
export interface SimulationEvent {
  id: string;
  type: string;
  timestamp: number;
  severity: EventSeverity;
  payload?: Record<string, unknown>;
}

/**
 * Event listener callback type
 */
export type EventListener = (event: SimulationEvent) => void;

/**
 * Deterministic EventDispatcher for IncidentOps
 * 
 * This class ensures all state mutations occur through events,
 * providing a deterministic and auditable event log.
 */
export class EventDispatcher {
  private listeners: Map<string, Set<EventListener>>;
  private eventLog: SimulationEvent[];
  private isLogging: boolean;

  constructor(enableLogging = true) {
    this.listeners = new Map();
    this.eventLog = [];
    this.isLogging = enableLogging;
  }

  /**
   * Subscribe to events of a specific type
   */
  on(eventType: string, listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listeners = this.listeners.get(eventType)!;
    listeners.add(listener);

    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  /**
   * Subscribe to all events
   */
  onAll(listener: EventListener): () => void {
    return this.on('*', listener);
  }

  /**
   * Dispatch an event to all registered listeners
   */
  dispatch(
    type: string,
    severity: EventSeverity,
    payload?: Record<string, unknown>
  ): SimulationEvent {
    const event: SimulationEvent = {
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      severity,
      payload
    };

    // Log the event
    if (this.isLogging) {
      this.eventLog.push(event);
      console.log(
        `[EventDispatcher] ${event.timestamp} | ${event.severity.toUpperCase()} | ${event.type}`,
        payload ? `| Payload: ${JSON.stringify(payload)}` : ''
      );
    }

    // Notify specific listeners
    const specificListeners = this.listeners.get(type);
    if (specificListeners) {
      specificListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${type}:`, error);
        }
      });
    }

    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in wildcard event listener:', error);
        }
      });
    }

    return event;
  }

  /**
   * Get the complete event log
   */
  getEventLog(): ReadonlyArray<SimulationEvent> {
    return [...this.eventLog];
  }

  /**
   * Get events filtered by type
   */
  getEventsByType(type: string): ReadonlyArray<SimulationEvent> {
    return this.eventLog.filter(event => event.type === type);
  }

  /**
   * Get events filtered by severity
   */
  getEventsBySeverity(severity: EventSeverity): ReadonlyArray<SimulationEvent> {
    return this.eventLog.filter(event => event.severity === severity);
  }

  /**
   * Get events within a time range
   */
  getEventsByTimeRange(startTime: number, endTime: number): ReadonlyArray<SimulationEvent> {
    return this.eventLog.filter(
      event => event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  /**
   * Clear the event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Get the number of registered listeners for a specific event type
   */
  getListenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.size ?? 0;
  }

  /**
   * Export event log as JSON
   */
  exportEventLog(): string {
    return JSON.stringify(this.eventLog, null, 2);
  }

  /**
   * Get statistics about the event log
   */
  getEventLogStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<EventSeverity, number>;
    timeRange: { start: number; end: number } | null;
  } {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<EventSeverity, number> = {
      info: 0,
      warning: 0,
      critical: 0
    };

    let minTime = Infinity;
    let maxTime = -Infinity;

    this.eventLog.forEach(event => {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      // Count by severity
      eventsBySeverity[event.severity]++;

      // Track time range
      if (event.timestamp < minTime) minTime = event.timestamp;
      if (event.timestamp > maxTime) maxTime = event.timestamp;
    });

    return {
      totalEvents: this.eventLog.length,
      eventsByType,
      eventsBySeverity,
      timeRange: this.eventLog.length > 0 
        ? { start: minTime, end: maxTime }
        : null
    };
  }
}

// Singleton instance for global use
export const globalEventDispatcher = new EventDispatcher();

// Made with Bob
