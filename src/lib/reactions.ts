// G1: note and project reactions. The set is closed and shared by the API and
// the button row, so the two can never drift apart.

export const REACTIONS = [
  { kind: 'heart', emoji: '❤️', label: 'love it' },
  { kind: 'fire', emoji: '🔥', label: 'that is useful' },
  { kind: 'mind', emoji: '🤯', label: 'that surprised me' },
] as const;

export type ReactionKind = (typeof REACTIONS)[number]['kind'];

export function isReactionKind(value: unknown): value is ReactionKind {
  return REACTIONS.some((reaction) => reaction.kind === value);
}

// Only real content pages can collect reactions: /notes/<slug> or
// /projects/<slug>, nothing else, nothing deeper.
export const REACTION_PATH = /^\/(?:notes|projects)\/[a-z0-9-]+$/;

export function isReactionPath(value: unknown): value is string {
  return typeof value === 'string' && REACTION_PATH.test(value);
}
