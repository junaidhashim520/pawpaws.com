# Database and admin implementation phases

1. Database: migrate/seed SQLite once, stable IDs for listings and categories, product/animal type, stock, publication state, safe images, explicit ordering.
2. Authentication: first administrator created from local CLI, hashed passwords, expiring server-side sessions, protected write endpoints.
3. Admin workspace: /admin login, overview, searchable inventory, create/edit/archive/delete, photo upload, category and pet-group management, sequence controls.
4. Storefront: load published database catalog, build category/pet filters and footer from that catalog, reconcile stale carts, refresh after returning from admin.
5. Verification: API authorization/validation, ordering, taxonomy references, persistence, browser CRUD → storefront and mobile review.

Scope: one local store, one administrator role. Demo checkout and local care playground remain demos. Inventory is displayed and limits cart quantities; demo checkout does not reserve or decrement stock. Real order fulfillment is a future business integration.
