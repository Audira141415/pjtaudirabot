import OpenAI from 'openai';
import { ILogger } from '@pjtaudirabot/core';

export interface MediaResult {
  type: 'text' | 'description' | 'transcription';
  content: string;
  metadata?: Record<string, unknown>;
}

export interface MediaHandlerConfig {
  openaiApiKey?: string;
  maxFileSizeMB?: number;
}

export class MediaHandler {
  private openai?: OpenAI;
  private maxFileSize: number;

  constructor(
    config: MediaHandlerConfig,
    private logger: ILogger
  ) {
    this.logger = logger.child({ service: 'media-handler' });
    this.maxFileSize = (config.maxFileSizeMB ?? 10) * 1024 * 1024;

    if (config.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    }
  }

  /**
   * Describe an image using GPT-4 Vision.
   */
  async describeImage(
    imageBuffer: Buffer,
    mimeType: string,
    prompt?: string
  ): Promise<MediaResult> {
    if (imageBuffer.length > this.maxFileSize) {
      return {
        type: 'text',
        content: 'Image is too large to process.',
      };
    }

    if (!this.openai) {
      return {
        type: 'text',
        content: 'Image processing is not available (no AI provider configured).',
      };
    }

    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt ?? 'Describe this image concisely.',
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl, detail: 'low' },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const description = response.choices[0]?.message?.content ?? 'Unable to describe image.';

    this.logger.debug('Image described', { size: imageBuffer.length, mimeType });

    return {
      type: 'description',
      content: description,
      metadata: {
        model: response.model,
        tokens: response.usage?.total_tokens,
      },
    };
  }

  /**
   * Transcribe audio using Whisper.
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string
  ): Promise<MediaResult> {
    if (audioBuffer.length > this.maxFileSize) {
      return {
        type: 'text',
        content: 'Audio file is too large to transcribe.',
      };
    }

    if (!this.openai) {
      return {
        type: 'text',
        content: 'Audio transcription is not available (no AI provider configured).',
      };
    }

    // Convert Buffer to File for OpenAI API
    const ext = this.mimeToExt(mimeType);
    const file = new File([audioBuffer], `audio.${ext}`, { type: mimeType });

    const transcription = await this.openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
    });

    this.logger.debug('Audio transcribed', {
      size: audioBuffer.length,
      textLength: transcription.text.length,
    });

    return {
      type: 'transcription',
      content: transcription.text,
      metadata: { mimeType },
    };
  }

  /**
   * Process a document by extracting text.
   * Falls back to basic info if no AI is available.
   */
  async processDocument(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<MediaResult> {
    if (buffer.length > this.maxFileSize) {
      return {
        type: 'text',
        content: `Document "${filename}" is too large to process.`,
      };
    }

    // For text-based documents, extract content directly
    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      const text = buffer.toString('utf-8').slice(0, 5000);
      return {
        type: 'text',
        content: text,
        metadata: { filename, mimeType },
      };
    }

    return {
      type: 'text',
      content: `Received document: "${filename}" (${mimeType}, ${this.formatSize(buffer.length)})`,
      metadata: { filename, mimeType, size: buffer.length },
    };
  }

  isSupported(): boolean {
    return !!this.openai;
  }

  private mimeToExt(mimeType: string): string {
    const map: Record<string, string> = {
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
      'audio/x-opus+ogg': 'ogg',
    };
    return map[mimeType] ?? 'ogg';
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
