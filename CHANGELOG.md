# Changelog

A log of every update to Kotree, from the newest to the oldest.

## [3.0.0]

The biggest update yet: new interactive features, a faster and safer page, and better accessibility.

### Added

- AI terminal — chat with a clone of Deo right on the page (press the green button or type `help`)
- Voice commands — say a link name to open it; falls back to typing if your microphone is blocked
- Secret Confessions — leave an encrypted message in the guestbook
- Crypto tip jar — connect a wallet and send a tip
- Geo quest — verify your location to unlock a hidden reward
- Hidden easter eggs: a retro Windows 95 desktop, DOOM, a boss fight, an infinite mirror, and more
- Search button in the top bar (Ctrl+K on desktop) — now reachable on phones too
- RSS feed so you can follow updates in your reader
- Automated regression tests that run on every change, keeping the page stable
- Offline support — the page keeps working and your clicks sync when you're back online
- Add-to-home-screen prompt for phones and computers
- Toast notifications and subtle sound and haptic feedback on buttons
- Fresh 404 and error pages

### Changed

- Much faster first visit: about 3.3 seconds before, under 1 second now
- Heavy extras (games, wallet, QR code) now load only when you actually use them
- The page is permanently dark — light mode is gone
- Softer frosted-glass cards with gentler corners everywhere
- Tools moved to the top bar for easier access
- Click counts and stats update instantly after you click a link
- QR code now opens in a neat popup instead of flipping the card
- Smaller stylesheet — a few unused effects were removed

### Removed

- Light mode
- The 3D tilt effect on cards
- Several heavy background effects

### Fixed

- The page no longer breaks after updates (CSS sometimes failed to load before)
- Some cards lost their glassy depth — now they all match
- Guestbook entries that looked saved but never were — including when the server rejects them
- Guestbook no longer stores visitor IP addresses
- RSS dates now show when each version actually came out (they all said "today" before)
- Install instructions on iPhone show as a toast instead of a browser pop-up
- The project license (MIT) is back — it was accidentally dropped during a past cleanup
- The boss fight game no longer traps you — press Escape or hit the exit button
- Search can be closed on phones with an X button (phone keyboards have no Escape key)
- The search button no longer appears on the changelog page

### Accessibility

- Closing a window returns focus where it belongs; Tab stays inside popups
- Every button is big enough to tap comfortably
- Screen readers get proper labels and live terminal output
- Animations respect the system "reduce motion" setting

### Security

- Guestbook and click counter hardened against fake requests and floods
- Rate limits can no longer be bypassed with spoofed IPs
- Stricter security headers on every page
- Links opened from games and easter eggs are fully sandboxed
- All dependencies audited — no known vulnerabilities

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
