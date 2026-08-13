# Changelog

A log of every update to Kotree, from the newest to the oldest.

## [3.0.0]

A deep hardening pass: performance, security, accessibility, and code health.

### Added

- Search button in the header dock (mobile-friendly entry point)
- Focus returns to the trigger after closing any modal
- Tab focus is trapped inside the AI terminal, telepathy, and QR dialogs
- ARIA labels for the guestbook, terminal, and telepathy inputs
- iOS safe-area insets when installed as a PWA
- `noopener noreferrer` on all external links

### Changed

- QR code modal now lazy-loads (smaller initial bundle)
- Fluid-glass depth applied consistently to every card
- Sitemap dates come from git history instead of build time
- Header bar inset widened to match the layout grid

### Fixed

- First visit was slow (3.3s) — the middleware edge function is gone (0.7s now)
- Intermittent broken CSS — service worker v2 is network-first for pages
- Guestbook entries kept optimistic ghosts after a failed save
- Guestbook API no longer exposes visitor IP addresses / user agents

### Security

- Rate limiting now uses the real client IP (last proxy hop)
- Click counter and guestbook hardened with CSRF tokens and rate limits
- `X-Powered-By` header removed
- All dependencies audited — no known vulnerabilities

### Refactor

- Every file is now 100 lines or fewer, grouped into feature folders
- All Tailwind v4 editor warnings resolved
- Lint and CI are green (0 errors, 0 warnings)

## [2.0.0-lts]

A big refresh. The whole page now matches the kochan.dev brand.

### Added

- Installable as an app on your phone or computer
- New icon for the browser tab and home screen
- Better protection for the click counter
- Stronger browser security headers
- More useful info for search engines and social media previews
- Ability to verify the site with Google and Bing

### Changed

- New colors inspired by kochan.dev (previously a rainbow gradient)
- New font
- Cleaner background: a solid color with a subtle grid
- Social media buttons restyled to look cleaner
- Loading screen now matches the rest of the page
- Error and 404 pages now match the main page too
- Fewer background effects, making the page lighter and faster

### Removed

- Star and meteor animations
- Several unused background patterns
- Old decorative shapes behind the cards
- Unused starter files

### Security

- The click counter now blocks fake requests from other websites and floods

## [1.0.2-stable]

Small polish release.

### Changed

- Slightly softer blur effect
- Updated dependencies

## [1.0.1-stable]

The release that made Kotree feel complete.

### Added

- Loading screen
- Personal motto
- Click counter that tracks how often each link is clicked
- Custom 404 and error pages
- Search engine setup
- Icons

### Changed

- Updated dependencies
- Improved the overall look of the page
- Reworked the social media buttons and links
- Updated the app icon colors

### Removed

- Blurred backgrounds
- An unused module

## [1.0.0-lts]

Maintenance release.

### Removed

- An unused animation library

### Changed

- Updated project settings

## [1.0.0]

The jump to the latest React version.

### Added

- New social media links

### Changed

- Upgraded to the latest version of React
- Cleaned up the project

## [0.0.0]

The very first version of Kotree, built as a simple web page.

### Added

- Footer with copyright and links
- Social media buttons
- Profile avatar from GitHub
- Animations
- Project documentation and license
- Styling with Tailwind CSS
- Development setup with Docker and Netlify deployment

### Changed

- Button design
- Footer year updates automatically

### Fixed

- Broken LinkedIn link
- Various small issues
