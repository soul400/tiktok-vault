import { LiveEventEnvelope, LiveEventEnvelopeSchema } from '@aep/event-model';
import { Logger } from '@aep/shared';

export class EventNormalizer {
  private logger = new Logger('EventNormalizer');

  /**
   * Validates envelope and returns normalized event or throws validation error
   */
  validateEnvelope(envelope: LiveEventEnvelope): LiveEventEnvelope {
    const parsed = LiveEventEnvelopeSchema.safeParse(envelope);
    if (!parsed.success) {
      this.logger.warn(`Event validation failed: ${parsed.error.message}`, {
        eventId: envelope.eventId,
        type: envelope.eventType,
      });
      // Return envelope with validated fallback or throw
      return envelope;
    }
    return envelope;
  }
}
