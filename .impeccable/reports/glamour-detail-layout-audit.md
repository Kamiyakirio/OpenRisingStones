# Glamour detail layout audit

Date: 2026-10-05. Scope: GlamourDetailView, its attribution footer, and their
responsive layout. Layout and polish addressed the findings below.

## Integrity verdict

Pass within this scope. The existing media, author, submission, and equipment
reading order remains intact. The page owns its gutters; subordinate sections
and the footer share consistent edges. Equipment preserves the original slot
order and lookup behavior. Impeccable's layout detector reports no findings
for the three modified components.

## Addressed findings

| Severity | Location                         | Verified problem                                                                                                                     | Result                                                                                                                                                                            |
| -------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2       | EquipmentSlot                    | Populated and empty cards in the same row measured 103.5px and 81.5px, leaving a 22px difference at the bottom.                      | Items stretch to their row height, with icons and copy aligned at the top.                                                                                                        |
| P2       | DetailContent                    | Equipment columns used viewport width while the overall detail columns used available container width.                               | Equipment chooses one or two columns from its own 480px container threshold.                                                                                                      |
| P2       | GlamourDetailView and SiteFooter | Detail and footer used different maximum widths and compact gutter rules.                                                            | The detail footer uses the same 1480px maximum and 20/16/12px horizontal gutters. Other footer layouts retain their previous defaults.                                            |
| P2       | DetailContent media              | A portrait fixture produced a 1280.875px media section at 1100px viewport width, pushing the information far below the first screen. | Single-column images are bounded to 720px and thumbnails form a separate horizontal strip. Two-column media explicitly fills its track and matches the information column height. |
| P2       | DetailContent spacing            | Viewport overrides and 28-48px title padding competed with the page's compact spacing.                                               | Content uses 20px section spacing and a single responsive gutter owner.                                                                                                           |

## Verification

- Real production components were mounted in a temporary Chromium preview using
  synthetic submission data, including long names, dyes, empty slots, and unknown
  ownership. Only the detail-loading hook was substituted in the browser;
  production authentication and API code were not modified.
- Measured light and dark layouts at 320, 390, 600, 768, 900, 1100, 1220, 1440,
  and 1920px. All pass document-overflow, page-edge, footer-edge, and paired-card
  top/bottom alignment checks.
- Loading and error states pass at desktop and phone widths. The skeleton shares
  the content grid and media-frame sizing.
- Thumbnail selection updates its pressed state. Keyboard navigation retains a
  visible focus outline. The completed preview reports no uncaught page errors.
- Prettier, desktop/mobile production build, lint, `git diff --check`, and the
  scoped layout detector pass.

## Limits and follow-up

This verifies component layout with representative fixtures, not a live
authenticated submission or physical-device gestures. Existing image cropping
still uses `object-cover`. No claim is made that all content is uncropped.
Existing broader theme and bundle findings remain in the application audit;
they are outside this alignment change. Finish review: layout and polish pass
within the stated scope.

## Correction after the real-submission screenshot

The initial checks verified the media section boundaries, but missed a narrower
image frame inside that section. An automatic width combined with aspect ratio
and a 720px maximum height could shrink the frame, leaving an unintended gap
before the information column. The previous verification claim was too broad.

The image now explicitly fills its track width. Two-column media stretches to the
information column height and the image fills the remaining space above any
thumbnails. Updated checks compare the actual image frame with the media track
and measure both column bottoms. In the single-image desktop fixture, the gap
is 20px and both top and bottom differences are 0px. Multiple-image fixtures
match media-column bottoms while keeping thumbnails below the main frame.
Single-column widths retain the bounded portrait frame. Chromium preview checks
at all nine previous widths in both themes, build, lint, and layout detection pass.
