import { logScrollBatch } from '../services/api';

interface ScrollEventData {
  scrollTop: number;
  scrollPercentage: number;
  timestamp: string;
}

interface ScrollSession {
  elementId: string;
  clientHeight: number;
  scrollHeight: number;
  events: ScrollEventData[];
}

class ScrollTracker {
  private sessions: Map<string, ScrollSession> = new Map();
  private debounceTimeout: NodeJS.Timeout | null = null;
  private debounceDelay: number = 5000; // 5 seconds
  private maxBatchSize: number = 5000; // Max events per batch
  private totalEvents: number = 0;

  /**
   * Track a scroll event. Events are batched by element and sent after 5 seconds of inactivity.
   */
  trackScroll(
    elementId: string,
    scrollTop: number,
    scrollHeight: number,
    clientHeight: number,
    scrollPercentage: number
  ) {
    // Get or create session for this element
    let session = this.sessions.get(elementId);

    if (!session) {
      session = {
        elementId,
        clientHeight,
        scrollHeight,
        events: []
      };
      this.sessions.set(elementId, session);
    } else {
      // Update dimensions in case they changed (window resize, content load)
      session.clientHeight = clientHeight;
      session.scrollHeight = scrollHeight;
    }

    // Add scroll event data (only changing values)
    session.events.push({
      scrollTop,
      scrollPercentage,
      timestamp: new Date().toISOString()
    });

    this.totalEvents++;

    // Clear existing timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Send batch immediately if it gets too large
    if (this.totalEvents >= this.maxBatchSize) {
      this.sendBatch();
      return;
    }

    // Set new timeout to send batch after inactivity
    this.debounceTimeout = setTimeout(() => {
      this.sendBatch();
    }, this.debounceDelay);
  }

  /**
   * Manually flush the current batch (useful for cleanup on unmount)
   */
  flush() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    this.sendBatch();
  }

  private async sendBatch() {
    if (this.sessions.size === 0) return;

    // Convert sessions map to array
    const batch = Array.from(this.sessions.values());
    const eventCount = this.totalEvents;

    // Clear the sessions and counter
    this.sessions.clear();
    this.totalEvents = 0;

    try {
      await logScrollBatch(batch);
      console.log(`Sent scroll batch with ${eventCount} events across ${batch.length} element(s)`);
    } catch (error) {
      console.error('Failed to send scroll batch:', error);
      // Optionally re-add sessions to retry later
    }
  }
}

// Export singleton instance
export const scrollTracker = new ScrollTracker();
