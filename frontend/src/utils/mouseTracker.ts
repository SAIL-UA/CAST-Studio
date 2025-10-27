import { getNormalizedPosition } from './utils';
import { logMousePositionBatch } from '../services/api';

interface MousePosition {
  x: number;
  y: number;
  timestamp: string;
}

class MouseTracker {
  private positions: MousePosition[] = [];
  private batchInterval: number = 60000; // 60 seconds
  private maxBatchSize: number = 100000; // Max positions per batch
  private intervalId: NodeJS.Timeout | null = null;
  private isTracking: boolean = false;

  start() {
    if (this.isTracking) return;
    
    this.isTracking = true;
    document.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    
    // Send batches periodically
    this.intervalId = setInterval(() => {
      this.sendBatch();
    }, this.batchInterval);
  }

  stop() {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    document.removeEventListener('mousemove', this.handleMouseMove);
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Send final batch
    this.sendBatch();
  }

  private handleMouseMove = (event: MouseEvent) => {
    const position = getNormalizedPosition(event);
    
    this.positions.push({
      x: position.x,
      y: position.y,
      timestamp: new Date().toISOString()
    });

    // Send batch if it gets too large
    if (this.positions.length >= this.maxBatchSize) {
      this.sendBatch();
    }
  };

  private async sendBatch() {
    if (this.positions.length === 0) return;

    const batch = [...this.positions];
    this.positions = []; // Clear the array

    try {
      await logMousePositionBatch(batch);
    } catch (error) {
      console.error('Failed to send mouse position batch:', error);
      // Optionally re-add positions to retry later
    }
  }
}

// Export singleton instance
export const mouseTracker = new MouseTracker();