export function trackLinkClick(name: string): void {
  fetch('/api/click-link-counter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.toLowerCase(), count: 1 }),
    keepalive: true,
  }).catch(() => {});
}
