export class PodSender {
  async sendToPod(scanResult: any, podUrl: string): Promise<boolean> {
    try {
      const response = await fetch(podUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          result: scanResult,
          source: 'soft-armor-extension'
        })
      });
      
      return response.ok;
    } catch (error) {
      console.warn('Pod send failed:', error);
      return false;
    }
  }
}
