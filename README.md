# StockPilot — Professional Inventory Management Demo

StockPilot is a responsive inventory management dashboard built with HTML, CSS and vanilla JavaScript.

## Included improvements

1. **Persistent browser storage** — products and stock movements are saved to `localStorage`, so refreshes no longer reset demo data.
2. **Functional stock-in / stock-out** — transaction modal, quantity validation, available-stock protection, references, notes, timestamps and automatic movement history.
3. **Admin login + session handling** — demo authentication with session persistence.
4. **Validation + confirmations** — duplicate SKU prevention, numeric validation, stock-out protection, confirmation dialogs and success/error toasts.
5. **Improved analytics** — inventory value, units, catalogue health, supplier summaries, stock concentration and movement KPIs.
6. **Search / filters / alerts / CSV** — global search, inventory filters, low-stock alert panel and Excel-friendly CSV export.
7. **Responsive UI** — desktop, tablet and mobile layouts with mobile navigation.
8. **Supabase-ready settings** — save a project URL and public anon key in the Settings screen for a future real database integration.
9. **Professional admin login page** — clean sign-in experience and protected dashboard shell.

## Demo login

- Email: `admin@stockpilot.demo`
- Password: `Admin123!`

> This is demo authentication only. It is not a secure production authentication system.





## Demo login troubleshooting

The browser demo uses local client-side authentication. Use exactly:

- Email: `admin@stockpilot.demo`
- Password: `Admin123!`

The login handler trims accidental leading/trailing whitespace from the email and demo password. The `app.js` script is versioned in `index.html` (`app.js?v=2.1`) to help browsers fetch the corrected authentication script instead of a stale cached copy.


This is demo authentication only; it is not suitable for real user accounts or production security. For production, connect the application to a real authentication provider such as Supabase Auth and keep credentials out of client-side source code.
