import { Injectable, Logger } from '@nestjs/common';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  async sendPush(tokens: string[], title: string, body: string): Promise<void> {
    if (tokens.length === 0) return;

    const messages = tokens.map((to) => ({ to, title, body, sound: 'default' }));
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Expo push failed (${response.status}): ${text}`);
    }
    this.logger.log(`Push notification sent to ${tokens.length} device(s)`);
  }
}
