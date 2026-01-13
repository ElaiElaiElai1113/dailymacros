# DailyMacros

DailyMacros is a full-stack web app for ordering protein shakes with clear
macro breakdowns, custom build flows, and staff/admin operational tools. It is
built with React + TypeScript + Vite on the frontend and Supabase for auth and
data.

## Features

- Customer ordering flow with macros, allergens, and pricing.
- Build-your-own drinks with live nutrition totals.
- Cart and checkout with order tracking.
- Staff/admin ops dashboards for managing drinks, addons, and orders.
- Print labels for orders.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS + Radix UI primitives
- Supabase (auth + database)

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3) Run the app

```bash
npm run dev
```

Then open the local URL shown by Vite.

## Key Workflows

### Customer ordering

1. Go to `/menu` to browse available drinks.
2. Use `/order` for preset drinks or `/build` for a custom shake.
3. Add items to the cart and proceed to `/checkout`.
4. After checkout, track orders at `/orders` or `/track/:code`.

### Build-your-own flow

1. Navigate to `/build`.
2. Select ingredients and units.
3. Review the nutrition totals and allergens in the bottom bar.
4. Add to cart.

### Staff and admin access

1. Log in at `/login`.
2. Staff dashboard is available at `/staff`.
3. Admin operations are available at `/ops`.
   - `/ops` shows the admin home
   - `/ops/drinks` manages drinks
   - `/ops/addons` manages addons
   - `/ops/orders` manages orders

Note: Access is controlled by Supabase profile roles. Ensure your user has a
`profiles.role` value of `staff` or `admin`.

### Print labels

Use `/print-label/:orderItemId` to render a print-optimized label.

## Architecture (Short)

- `src/pages` holds route-level screens and feature flows.
- `src/components` contains reusable UI building blocks.
- `src/context` manages app-wide state like the cart.
- `src/utils` includes shared business logic (nutrition, pricing).
- `src/lib` contains auth helpers and the Supabase client.
- `src/layouts` organizes page chrome and admin layout structure.

## Scripts

- `npm run dev` - Start the Vite dev server
- `npm run build` - Type-check and build for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run ESLint

## Supabase Notes

The app expects these tables/views to exist:

- `profiles` (with `user_id` and `role`)
- `drinks`
- `drink_ingredients`
- `ingredients`
- `ingredient_nutrition` (or equivalent view with per-100g fields)
- `orders` and `order_items`

If your schema differs, adjust the queries in `src/pages` and `src/utils`.

## Routes At A Glance

- `/` landing page
- `/menu` drink list
- `/order` order flow
- `/build` build-your-own flow
- `/cart` cart
- `/checkout` checkout
- `/orders` order history
- `/track/:code` order tracking
- `/login` login
- `/staff` staff dashboard
- `/ops` admin home
- `/ops/ingredients` manage ingredients
- `/ops/drinks` manage drinks
- `/ops/addons` manage addons
- `/ops/orders` manage orders
- `/print-label/:orderItemId` print label

## Troubleshooting

- Blank data: confirm Supabase URL/key and that tables contain active rows.
- Access issues: check `profiles.role` is set to `staff` or `admin` where needed.
- Build errors: run `npm run lint` and `npm run build` to surface type or lint issues.

## Deployment

This project is Vite-based and can be deployed to Vercel or any static host.
Make sure the environment variables are set in your hosting provider.
