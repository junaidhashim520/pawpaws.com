# PawPass ? pet shop & care portfolio

A fictional pet-store concept for demonstrating website design and functionality to potential clients. Includes original vector product illustrations, responsive shopping, a detailed footer, and an interactive care playground.

## Run locally

Requires Node.js 22.13+ (Node 22 LTS recommended).

```sh
npm install
npm run dev
```

Open http://localhost:5173. Keep the terminal open and stop with Ctrl+C. Run only one development instance at a time.

## Build and check

```sh
npm run build
npm test
npm start
```

`npm run build` checks TypeScript and creates `dist/`. `npm start` serves the build at http://localhost:3001. `npm run typecheck` runs TypeScript separately.

## Demo features

- Homepage with pet categories, illustrated collection, care, brand story, journal, FAQs, and a complete footer.
- Product search, pet/category filters, price sorting, and product-detail dialogs.
- Shopping bag with quantity controls, removal, and browser persistence.
- Demo delivery/pickup selection and order receipt. Example USD prices; no tax calculation, payment collection, personal information, or fulfillment.
- Pet profile, provider search, date selection, saved demo bookings, and cancellation.
- Accessible dialogs, mobile navigation, reduced-motion support, and keyboard focus styling.

Cart, receipts, pet profiles, and care bookings use this browser?s local storage. Clearing site data removes them. The checkout sends no orders or data to a server.

The earlier SQLite waitlist API remains available at POST `/api/waitlist`, with validation and duplicate handling, but is not exposed in the portfolio storefront. Its database is `data/pawpass.sqlite`; the file is excluded from version control. API tests use an isolated in-memory database.

## Customize for a real business

- `src/data/products.ts`: sample catalog, USD formatting, categories, and cart validation.
- `src/components/product-art.tsx`: original SVG product illustrations.
- `src/App.tsx`: storefront structure, shopping flows, journal, and informational dialogs.
- `src/store.css`: responsive storefront styling.
- `src/components/care-preview.tsx`: local care playground.
- `src/index.css`: shared typography and care styling.
- `docs/portfolio-plan.md`: goals, phases, customer journeys, and customization plan.
- `server/index.js`: retained waitlist API and production static server.

Before a real business launch, replace sample content and configure genuine inventory, payments, tax, delivery, policies, contact information, provider availability, authentication, and durable order storage. No real services are connected in this sample.

Pet photographs and fonts may load from Unsplash and Google Fonts. Product illustrations and the hero dog image are local. Optional server variables are `API_PORT` (3001) and `DATA_FILE` (`data/pawpass.sqlite`). If changing the development API port, also update the proxy in `vite.config.ts`.
