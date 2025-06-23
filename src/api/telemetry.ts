export class Telemetry {
  private endpoint = 'https://telemetry.soft-armor.io/v1/events';

  async recordScan(scanResult: any, userOptedIn: boolean): Promise<void> {
    if (!userOptedIn) return;

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: 'scan_completed',
          data: {
            riskLevel: scanResult.riskLevel,
            hasC2PA: scanResult.c2paValid,
            timestamp: scanResult.timestamp
          }
        })
      });
    } catch (error) {
      console.warn('Telemetry failed:', error);
    }
  }
}
