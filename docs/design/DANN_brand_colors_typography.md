# DANN — Colors & Typography
### Shared reference for the dashboard (`client/`, Leo) and the landing page (`frontend/`, Vimbai)

Base: **#DDD5C0** (kraft paper) + **Google Sans Flex** — everything below extends those two into a full, usable system so both surfaces stay visually one product.

---

## 1. Color tokens

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#DDD5C0` | Primary background — the base kraft tone. Given. |
| `--paper-light` | `#F1ECDF` | Cards, panels, input fields — a lighter tint of paper so surfaces lift off the background without leaving the kraft family |
| `--paper-dark` | `#C7BC9F` | Dividers, table row stripes, disabled states |
| `--ink` | `#2A241D` | Primary text — warm near-black, not pure black, so it sits comfortably on kraft |
| `--ink-muted` | `#6B6152` | Secondary text, labels, placeholder text |
| `--stamp` | `#A8462A` | Primary accent — oxide-red "stamp" color. Used for primary buttons, active nav state, key numbers (e.g. profit figure on Dashboard) |
| `--stamp-dark` | `#7E331E` | Hover/pressed state for the accent, and for stamped headers on the landing page |
| `--copper` | `#8C6B3F` | Secondary accent — links, icons, subtle highlights that shouldn't compete with the stamp accent |
| `--success` | `#4B7A52` | Payment received, production logged, stock healthy |
| `--warning` | `#C08A2E` | Low stock, approaching reorder point |
| `--error` | `#B23B2E` | Stock-out, overdue payment (60+ days) — deliberately close to but distinguishable from `--stamp`, since both read as "urgent oxide-red" but error is desaturated slightly darker for accessibility |
| `--border` | `#C9BFA8` | Hairlines, card borders, table borders |

**Contrast note:** `--ink` on `--paper` and `--paper-light` both pass WCAG AA for body text. `--stamp` on `--paper` passes AA for large text/UI elements but check it for small body text — use `--stamp-dark` if a small-text pairing fails contrast checks.

---

## 2. Typography

| Role | Typeface | Notes |
|---|---|---|
| **Display / Headings** | Google Sans Flex, weight 600–700 | Use the variable axis instead of switching families — keep tracking slightly tight on large sizes (H1/H2) for a stamped, deliberate feel rather than a soft SaaS one |
| **Body / UI** | Google Sans Flex, weight 400–500 | Same family as display, lighter weight. Because it's a variable font, this stays cohesive without needing a second body face |
| **Data / Numbers** | IBM Plex Mono, weight 400–500 | Stock counts, currency, quantities, timestamps — anywhere a number is the point. Monospacing keeps columns of figures (inventory tables, ledger balances) aligned and gives DANN a "ledger" texture instead of generic dashboard digits |

**Do not use Inter anywhere** — it's the strongest tell of templated AI-generated UI and works against the distinct kraft/ledger identity DANN is building.

### Type scale (starting point, adjust per component)

| Level | Size | Weight | Face |
|---|---|---|---|
| H1 | 32px | 700 | Google Sans Flex |
| H2 | 24px | 600 | Google Sans Flex |
| H3 | 18px | 600 | Google Sans Flex |
| Body | 15px | 400 | Google Sans Flex |
| Caption / label | 13px | 500 | Google Sans Flex |
| Data / figures | 15–18px | 500 | IBM Plex Mono |

---

## 3. Usage split between the two surfaces

- **Dashboard (`client/`):** lean on `--paper-light` as the working surface (cards, tables), `--ink` for dense data-heavy screens, `--stamp` reserved for primary actions and the one key number per screen (today's profit, amount overdue) so it stays meaningful and doesn't get diluted.
- **Landing page (`frontend/`):** can go bolder with `--paper` as a full-bleed background and `--stamp-dark` for large stamped headline treatments — the landing page has room for the accent to be a real design moment in a way the dashboard, which needs to stay calm and scannable for daily use, doesn't.

Both surfaces should share the same tokens above rather than each inventing near-duplicates — that's what keeps the marketing site and the product feeling like one brand instead of two.
