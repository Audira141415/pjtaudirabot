import { ILogger } from '@pjtaudirabot/core';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

export type SentimentResult = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'URGENT';

export class SentimentService {
  private openai: OpenAI | null = null;

  constructor(
    private db: PrismaClient,
    private logger: ILogger,
    apiKey?: string
  ) {
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Analyze message content for sentiment and urgency.
   * Fallback to basic rule-based analysis if OpenAI is not available.
   */
  async analyze(content: string): Promise<{ sentiment: SentimentResult; score: number }> {
    try {
      if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'Analyze the sentiment and urgency of the message. Respond with a single word: POSITIVE, NEUTRAL, NEGATIVE, or URGENT.' 
            },
            { role: 'user', content }
          ],
          max_tokens: 10,
        });

        const result = response.choices[0].message.content?.toUpperCase() as SentimentResult;
        return { 
          sentiment: ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'URGENT'].includes(result) ? result : 'NEUTRAL',
          score: result === 'URGENT' ? 1.0 : result === 'POSITIVE' ? 0.8 : result === 'NEGATIVE' ? 0.2 : 0.5
        };
      }
    } catch (err) {
      this.logger.error('Sentiment analysis failed, falling back to basic rules', err);
    }

    // Basic Rule-based Fallback
    const lowerContent = content.toLowerCase();
    if (lowerContent.match(/tolong|bantu|urgent|penting|cepat/)) return { sentiment: 'URGENT', score: 0.9 };
    if (lowerContent.match(/bagus|terima kasih|ok|mantap|siap/)) return { sentiment: 'POSITIVE', score: 0.8 };
    if (lowerContent.match(/kecewa|lambat|buruk|jelek|tidak puas/)) return { sentiment: 'NEGATIVE', score: 0.2 };

    return { sentiment: 'NEUTRAL', score: 0.5 };
  }

  /**
   * Stores the analyzed sentiment for a message in the database for dashboard visualization.
   */
  async recordSentiment(messageId: string, content: string) {
    const { sentiment, score } = await this.analyze(content);
    
    try {
      // Assuming a MessageSentiment model exists or we attach it to Metadata
      await this.db.message.update({
        where: { id: messageId },
        data: {
          metadata: {
            upsert: {
              sentiment,
              sentimentScore: score,
              analyzedAt: new Date().toISOString()
            }
          }
        }
      });
      
      if (sentiment === 'URGENT') {
        this.logger.warn(`URGENT SIGNAL DETECTED: [Msg ${messageId}]`);
      }
    } catch (err) {
      this.logger.error('Failed to record message sentiment', err);
    }
  }
}
