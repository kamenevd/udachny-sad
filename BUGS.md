# Bugs Found by Ges Bughunt — 2026-07-20

## Bug 1: Telegram widget external request failure
- **Severity**: Low (cosmetic)
- **Error**: REQUEST_FAILED: https://telegram.org/js/telegram-widget.js?22 — net::ERR_ABORTED
- **Cause**: Telegram login widget tries to load external JS, fails in local/preview environment
- **Fix**: Lazy-load Telegram widget only when needed, or remove if Telegram auth not used

## Bug 2: Onboarding modal blocks all interaction (CRITICAL)
- **Severity**: HIGH
- **Error**: Guided tour modal (aria-label="Знакомство с приложением") intercepts pointer events on entire viewport
- **Symptom**: Cannot click plants, garden items, or any UI element while tour modal is active
- **Root cause**: Modal overlay (z-50, fixed inset-0) covers full screen and intercepts clicks. Tour never auto-dismisses.
- **Fix**: Close tour modal on first interaction or provide visible close button. Use spotlight overlay instead of blocking modal.

## Bug 3: Gardens list empty state after login
- **Observation**: After login, gardens list shows 0 items, no visible gardens to open
- **UX issue**: No empty state CTA visible (blocked by tour modal). Possible data race if gardens exist but dont load.
