# Changelog

A log of every update to Kotree, from the newest to the oldest.

## [3.4.0]

A big, quiet release: more to find, more to play with, and a lot of work you will only notice when something stops being annoying.

### Added

- Three more apps in the Windows 95 desktop — Notepad (its draft survives a reload), Calculator and a real Paint with PNG export
- A metro-style map on /explore showing every secret and which ones you have found
- Shareable badges: a small SVG image for any stat, ready for a README
- Streaks and achievements, with your progress exportable and importable as one file
- A five-question quiz about the site, with a best score worth beating
- QR codes for any page in three contrast-safe styles, downloadable as SVG or PNG
- Three new secrets — fourteen in total — plus seasonal touches for Valentine's, April Fools' and Halloween, switchable off
- Volume control and separate switches for tap sounds and alerts; haptics follow the same rules
- Six iOS launch images, so the app opens without a white flash on an iPhone
- Swipe down to close any dialog, and a year carousel inside Wrapped
- Gentle page transitions where the browser supports them, and none where it should not
- An OLED theme — true black, for the dark that wants to be darker — with every pair of colours still checked to stay readable
- A free accent colour picker that verifies contrast before it applies anything
- A print button on notes, so a note turns into a clean PDF

### Changed

- The guestbook explains itself honestly when JavaScript is off, and moderation can preview a decrypted message in full formatting and hide messages in bulk
- Admin sign-in now needs a second factor (a code from your authenticator app, with recovery codes), sessions are listed and can be revoked, and every action lands in an audit log you can filter and export
- The offline promise is stronger: the shell opens with the network down, and queued messages are clearly marked
- Empty states across the site now use one honest style instead of stock imagery
- Reduced motion is respected everywhere — dialogs, page fades, transitions and carousels
- The icon set got a proper audit: maskable safe areas verified, and a favicon that finally exists
- The AI terminal wears the same window as the rest of the site now — a real title bar with a close button, full-width prompt bar — instead of a pretend operating-system frame
- The guestbook scrolls forever instead of hiding secrets behind a "load more" button, and the message list is tall enough to read more than two at a time
- On tablet-sized screens the links now sit two to a row with the guestbook beside them, instead of one stretched link per row

### Fixed

- A missing favicon file the browser had been asking for (and not getting) since the last redesign
- The URL bar colour on phones now stays correct whatever the theme, accent or browser does with duplicate hints
- The guestbook message cleaner tidied text in the wrong order, so some joined characters never composed; the order is now right
- Page transitions no longer start while a page is still loading — that could crash the tab outright on some browsers (it did in ours); they now run only once the page has settled
- Buttons in the top dock and the share and QR control no longer spill past their border when hovered or active
- The Web3 and Geo-Quest cards carry the same border and shadow as every other card, and the guestbook message box finally sits at the bottom of its card
- The left column no longer leaves a bare patch on wide screens — the theme cards stretch to meet the column beside them

## [3.3.0]

The biggest update yet in polish rather than pixels: new places to look, a search that actually searches, and a pile of invisible work that keeps the whole thing standing.

### Added

- A Stats page — total clicks, the last thirty days, secrets found and the most-loved guestbook messages
- Kotree Wrapped — the year on this site, wrapped up in one animated page
- Minesweeper, sitting quietly in the Windows 95 desktop (the desktop itself stays classic, on purpose)
- Tags on notes and projects, with tag pages, related reading, a table of contents, reading time and previous/next links
- Search that looks inside notes and projects, and can flip the theme, sound or accent without leaving the keyboard
- New terminal commands — `stats`, `wrapped`, `theme dark`, `open <slug>` — with tab completion and history from the arrow keys
- A "What's new" nudge that appears once after an update and links straight to the changelog
- Sound: small, quiet confirmations for reactions, copies and permalinks (still mutable, still polite)
- A draft of your guestbook message is kept while you type, so a stray refresh cannot eat it
- Two new secrets to find — the list on /secrets has the hints
- An offline page that shows what is saved and reloads itself when the connection returns
- A privacy page — short, honest, and linked in the footer

### Changed

- The browser bar now follows the theme and accent you picked
- Long pages fade in gently as you scroll — unless you prefer less motion
- Everything reflows properly down to a 320-pixel screen, and the text scales with the window
- High-contrast mode, screen readers and keyboards get the same page as everyone else, through a fresh accessibility pass on every page
- The admin area keeps a log of what was done, can resolve visitor-reported errors, and shows page views per page
- Messages queued offline now tell the app icon when they are still waiting
- Share a link to Kotree from an Android phone and it arrives as a guestbook draft
- The whole site is tested on Safari, Firefox, two phone sizes and two versions of Node before it ships, and the deploy checks itself afterwards

### Fixed

- Focus now returns to the button that opened the terminal when the dialog closes
- Guestbook timestamps and reaction labels meet the contrast bar everywhere, including high-contrast mode
- The install banner no longer covers the header buttons on small phones
- Messages can no longer bring invisible characters along for the ride
- The site no longer asks browsers for anything it cannot honour on plain-HTTP setups

## [3.2.0]

A quieter update with a big footprint: new pages, a smarter admin area, and proper manners when the connection drops.

### Added

- Projects and Notes — proper pages for the things I build and the things I think about, with their own share images
- About and Now — the story behind Kotree and a snapshot of what I am working on right now
- A full Guestbook page showing every secret ever left, with permalinks and reactions
- Secrets — a page listing every easter egg you have found on this device, hints included
- A friendlier offline mode — pages you have visited still open, and anything you tap or write while offline sends itself later, even if you close the tab
- Share cards for every page, so links look good wherever they are posted
- A print-friendly changelog — clean ink-on-paper version, no browser clutter
- Admin additions: a daily clicks chart, search in the moderation list, CSV and JSON export, one-click backup, and a small panel of errors reported by visitors
- A smarter 404 page — search everything on the site, or let chance pick a link for you
- One click per person per link per day, so the numbers mean real visitors

### Changed

- Admin sign-in no longer keeps your password in the page; it is swapped for a secure session that expires by itself
- The footer now links to every corner of the site
- Heavy extras — the 3D scenes, the terminal, QR codes — only load when they are actually used, so the page starts faster
- Visitors who prefer less motion, dark colours or slow connections get a lighter, calmer experience
- Rate-limited actions now tell you how long to wait

### Fixed

- Dark mode contrast and keyboard focus issues, checked from phones to very wide screens
- Assorted layout rough edges on large displays

## [3.1.0]

A bold new look and a pile of small fixes.

### Added

- A colorful redesign — cream paper, ink borders, hard shadows, and a rainbow of link cards
- New fonts, a refreshed logo, and matching browser and app icons
- Keyboard shortcut help — press `?` to see them all
- A "Load more" button in Secret Confessions, so older messages are one click away

### Changed

- The page is no longer permanently dark — it is light, colorful, and much easier to read
- The terminal matches the new look; the Windows 95 desktop stays classic, on purpose
- Text that was hard to read is fixed — nothing blends into the background anymore
- The boss fight now gives you a moment before it starts firing back
- Page changes fade in smoothly
- The image shown when you share the page got a fresh coat of paint

### Removed

- The old frosted-glass and glow effects

## [3.0.0-lts]

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
- The AI chat has its own tighter limit (10 a minute), a global budget, and a daily spend cap, so floods can't drain the AI quota
- The AI chat blocks harmful content and has an emergency kill switch
- The AI chat is also guarded at the CDN edge, so floods are stopped before they reach the server
- The AI chat recognizes and refuses prompt-injection attempts
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
