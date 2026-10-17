export interface GuestbookEntry {
  /** Server-assigned id — absent on optimistic (not yet delivered) entries. */
  id?: string;
  message: string;
  createdAt: string;
  reactions?: Record<string, number>;
  /** Stored offline and waiting to be delivered. */
  pending?: boolean;
}
