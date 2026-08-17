# Design System

## Direction

Studio OS, not SaaS, ERP, or a commercial admin dashboard. The product is a calm, long-lived operating surface for a videography studio: an editorial planning desk where the team understands the rhythm of upcoming shoots before managing the underlying orders.

The selected visual concept is **精品创意工作室风**. It uses quiet composition, considered typography, deliberate whitespace, fine rules, and a small number of purposeful surfaces. Orders remain the single management source of truth; calendar views are time-based ways of reading those orders, never an independent scheduling product.

## Visual decisions

- Color strategy: warm ivory canvas with deep ink-green (#14532D) for primary action, selection, focus, and confirmed work. Its darker and softer companions support hover and restrained selection states; the Buir Point Logo uses the same green. Neutrals stay warm and low contrast. No gradients, glass effects, or decorative color systems.
- Typography: Geist and a system CJK fallback provide a composed sans-serif voice. Dates and precise numeric information use the mono companion sparingly. Hierarchy comes from scale, weight, spacing, and alignment rather than oversized display type.
- Shape: 12px panels, 10px form fields, pills only for compact status markers. Prefer quiet paper-like surfaces, hairline dividers, and negative space over stacked cards.
- Elevation: little or none. Use thin cool-stone borders and very soft background-tinted shadows only where a surface needs separation.
- Motion: low intensity. Navigation, buttons, drawers, and disclosures have brief state feedback; nothing performs on page load. All motion respects reduced-motion preferences.

## Information architecture

- Dashboard is the daily reading surface for the whole studio. Its primary story is **本月拍摄节奏**: a work calendar derived from orders, followed by upcoming shoots and restrained reminders.
- The calendar shows only date, project, assigned camera person, and order status. It has month navigation and date links, but no drag-and-drop, time grid, event editor, or Google Calendar feature set.
- Orders is the sole management entry point for creating, editing, deleting, searching, and filtering orders. It should read like a studio project archive: date-led, scannable, and composed rather than spreadsheet-heavy.
- Order source, shoot location, and production handoff remain attributes of an order. They never create CRM, partner, project, or production-board modules.
- Out-of-scope modules such as people management, equipment, venues, and assets must not appear in the navigation or dashboard.

## Portfolio Management

- Portfolio is the studio's internal works publishing archive, not an asset library or KPI-driven CMS.
- The works list follows the Studio OS archive language: a calm, scannable record structure separated by fine rules rather than a grid of promotional cards.
- The primary lifecycle is explicit and sequential: create or edit a draft, publish or withdraw it, archive or restore it, then permanently delete it only through a clearly destructive action.
- The Portfolio navigation entry appears only for users with `portfolio_view`; hiding navigation never replaces server-side authorization.
- Every status pairs a written label with its visual treatment. Draft, published, and archived states must never be communicated by color alone.
- Desktop and mobile reuse the existing Dashboard Shell, including its side rail, top bar, and drawer behavior; Portfolio does not introduce a separate application frame.
- Portfolio cover and video uploads live in the dedicated `portfolio-media` bucket. The edit page presents them as two quiet archive rows with explicit empty, uploading, preview, error, and removal states; they never become a general asset library.
- Cover and video previews preserve the existing paper-like hierarchy. Video uses native controls without autoplay, and media actions remain subordinate to the work record.
- About content management is a fixed four-item editorial list inside Portfolio: story, concept, process, and FAQ. It uses plain-text editing and explicit published/hidden labels; it is not a rich-text builder or a new navigation system.
- Editing content and changing visibility remain separate actions. The interface preserves the fixed content taxonomy instead of exposing create, reorder, or delete controls.
- Portfolio categories are maintained as an ordered archive list with explicit enabled/disabled labels. Disabling a category preserves existing work relationships; categories with related works cannot be deleted.
- Home featured management reads only published works. Featured membership and numeric display order are explicit publishing operations, and withdrawing a work automatically removes it from the featured set.

## Layout

- Desktop: a quiet narrow side rail and a generous page canvas. Pages use an editorial grid with one dominant work region, fine dividers, and secondary information placed in a clearly subordinate rail or sequence.
- Dashboard: the month calendar is visually primary without becoming a separate calendar application. Upcoming orders are a date-grouped editorial list; reminders stay as a single light-weight line or region.
- Production attention appears only as a restrained owner-only entry list for backup, editing, and delivery. It is never expressed as KPI cards, progress dashboards, or a kanban board.
- Owner-only daily handling, customer history, and annual source reads are derived from orders and return to the existing order archive. They do not create separate customer, reminder, task, or analytics destinations.
- Owner and camera are both active studio members in the shared order archive. The shared surface exposes the complete working record, while owner-only daily handling and annual source reads remain deliberately small operational reads rather than a management layer.
- Removing an order means moving it into the existing archive, never presenting irreversible deletion as the default working action. Archived records are excluded from day-to-day rhythm and search by default.
- Mobile: the top bar and drawer navigation remain. Prioritize today's work, the signed-in camera person's assignments when applicable, and upcoming shoots. Month navigation becomes a compact date navigator rather than a scaled-down desktop calendar.
- The Dashboard offers one owner-only quick-create action. It opens a short, single-column order form and returns to the created project archive for later completion.
- Page content stays inside a 1440px work area. Future data-heavy surfaces group related information with spacing and dividers before adding containers.

## Accessibility

- Semantic landmarks, descriptive icon labels, and visible keyboard focus states.
- WCAG AA contrast for text, fields, statuses, and actions.
- Calendar navigation and date/order links remain keyboard-operable with text alternatives for condensed mobile calendar cells.
- Responsive layouts preserve readable tap targets and do not rely on color alone for order status.
- Server-side authorization remains independent from navigation visibility.
