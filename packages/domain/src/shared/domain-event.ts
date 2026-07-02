export interface DomainEvent {
  readonly occurredAt: Date;
  readonly eventType: string;
}
