# PawPass Change Log

This file keeps a simple record of project changes.

## 2026-09-08

- **Author:** GitHub Copilot
- **Change:** Added this change log.
- **Reason:** Keep Codex and Copilot changes in one easy-to-read file.
- **Change:** Continued the catalog and admin-panel implementation after the previous Codex run reached its usage limit.
- **Details:** Added the `/admin` page, administrator login flow, category and pet-group management, listing create/edit/delete controls, publish toggles, and ordering controls. The shop now loads products, categories, and pet groups from the SQLite catalog API.
- **Checks:** The production build passed. The server test passed when run directly with `node --test tests/server.test.js`.

## Older changes

The project has no Git history in this workspace. Because of that, older changes cannot be linked to Codex, Copilot, or another person with certainty.

## How to add a change

Add a new section with:

- **Date:** YYYY-MM-DD
- **Author:** Codex, GitHub Copilot, or a person
- **Change:** What was changed
- **Reason:** Why it was changed
