# DANN public landing page

Public marketing site for DANN, maintained inside `frontend/landing-page/`.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The page uses the repository's supplied DANN logo assets and the shared brand system from `docs/design/DANN_brand_colors_typography.md`: kraft paper tones, oxide-red stamp accent, Google Sans Flex, and IBM Plex Mono for data/figures.

Pilot-interest submissions are intentionally frontend-only at this stage. They are stored in the visitor's local browser storage until a real intake endpoint is connected.
