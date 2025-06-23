export class APIClient {
  private baseUrl = 'https://api.soft-armor.io/v1';

  async scan(mediaUrl: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getApiKey()}`
        },
        body: JSON.stringify({ url: mediaUrl })
      });
      
      return await response.json();
    } catch (error) {
      console.warn('API scan failed:', error);
      return null;
    }
  }

  private async getApiKey(): Promise<string> {
    // TODO: Implement API key retrieval
    return 'demo-key';
  }
}
