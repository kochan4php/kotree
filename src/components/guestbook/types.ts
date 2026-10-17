export interface GuestbookEntry {
  /** Server-assigned id — absent on optimistic (not yet delivered) entries. */
  id?: string;
  message: string;
  createdAt: string;
  reactions?: Record<string, number>;
  /** K30: featured by the admin — floats to the top of the wall. */
  pinned?: boolean;
  /** Stored offline and waiting to be delivered. */
  pending?: boolean;
}
