# F019 — Mobile-first optimization

> Status: **In progress** (requested 2026-07-06). The app is used from the phone but several surfaces break on mobile — the Dashboard "Recent Pitches" rows overlap (screenshots), and crowded top bars overflow.

## Motivation
Pitch Vault must be 100% usable on a phone: every action visible/reachable, nothing overlapping, no horizontal scroll. This pairs with F018 (PWA) so the installed app feels native.

## Diagnosis (as-found)
- **Dashboard rows** (`app/(app)/dashboard/page.tsx`): the right-hand group (`{views} views` + status badge + edit/preview) is not shrink-protected, so it collides with the title/date `flex-1` column at phone width — the overlap Christian screenshotted.
- **Pitches top bar** (`app/(app)/pitches/page.tsx`): a fixed `h-14` header packing search + folder filter + view toggle + thumbnail-refresh + new-pitch — too wide for 390px.
- **Nav**: the shadcn sidebar already renders a mobile off-canvas Sheet via the hamburger (`SidebarTrigger`); page navigation is covered — verify it works end-to-end.

## Scope
- **F019.1** Fix the Dashboard recent-pitch rows: shrink-safe right group, truncating title/date, hide/relocate the "views" text on narrow screens.
- **F019.2** Responsive Pitches top bar: keep search + folder filter + new reachable; collapse secondary actions (view toggle, refresh) into an overflow menu on mobile.
- **F019.3** Verify + fix the mobile nav Sheet (hamburger → sheet → every destination tappable → closes on select).
- **F019.4** Global hygiene: viewport meta, no horizontal scroll at 390px, ≥44px tap targets, safe-area insets.

### Non-goals
- A brand-new bottom-tab nav paradigm — the sidebar Sheet already covers navigation; only add one if a real gap appears.
- Redesigning the desktop layout — mobile-responsive only, desktop unchanged.

## Verification
Lens on `device: iphone-15` (390×844) per surface — assert no overlap + no horizontal overflow, screenshots for the human.

## Stories
- **F019.1** Fix Dashboard responsive layout
- **F019.2** Responsive Pitches top bar
- **F019.3** Mobile navigation reachable
- **F019.4** Global mobile hygiene
