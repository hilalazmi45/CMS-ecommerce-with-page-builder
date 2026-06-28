# Laravel + React Visual Commerce — Root `CLAUDE.md`

> **Current baseline (verified 27 June 2026):** Laravel 13.x, React 19.2.x, and PHP 8.3 or newer. Exact patch versions must be resolved from the repository lockfiles and changed only through a dedicated dependency-upgrade task after the full test suite passes.
>
> **Purpose:** This root-level file is the engineering contract for Claude Code and human contributors working on the Laravel 13 + React 19.2 + Inertia.js visual-commerce application. It is intentionally strict. The priority is preserving a working application while implementing the roadmap incrementally.
>
> **Primary rule:** Never “finish” a feature by weakening types, bypassing validation, deleting working behaviour, replacing an established architecture, or leaving unrelated regressions behind.
>
> **Framework identity:** This repository is a Laravel/React application, not a WordPress plugin repository. References to Elementor, WooCommerce, Woodmart, or WordPress plugins describe required user-facing behaviour and migration compatibility only. Do not copy plugin internals, WordPress hooks, post-meta assumptions, or vendor code into the application.

---

## 0. How Claude Code Must Use This File

This file applies to every task in this repository unless the user gives a more specific instruction. A user instruction may change product scope, but it does **not** silently waive security, data-integrity, or regression-safety requirements.

### 0.1 Instruction precedence

When instructions conflict, use this order:

1. User's explicit instruction for the current task.
2. Security, privacy, financial correctness, and data-integrity rules in this file.
3. Existing repository architecture and established conventions.
4. The implementation roadmap in this file.
5. General framework conventions.

Stop and report the conflict when satisfying a lower-priority instruction would violate a higher-priority rule.

### 0.2 Repository truth beats this document

This document describes intended architecture, but the checked-out repository is the current source of truth. Before changing code:

- Inspect the actual files, versions, routes, migrations, tests, and package manifests.
- Do not assume a file, class, table, column, relationship, route, permission, widget, or command exists merely because it is named here.
- If the repository differs from this document, preserve working repository behaviour and report the mismatch.
- Update this file only when the task explicitly includes documentation maintenance or when a confirmed architecture change makes the document materially wrong.

### 0.3 One bounded task at a time

Do not attempt all phases in one run. Each implementation request must be reduced to a bounded vertical slice that can be tested and reviewed independently.

A valid vertical slice normally includes:

- database change, if required;
- backend validation and service logic;
- policy/permission enforcement;
- frontend UI and typed props;
- automated tests;
- documentation or configuration updates;
- a rollback path.

If the requested feature is too large, implement the safest coherent slice and clearly list what remains. Do not leave half-connected production paths behind a visible UI unless the unfinished path is protected by a feature flag.


### 0.4 Interpret external references correctly

The repository may contain WordPress, WooCommerce, Elementor Pro, Woodmart, plugin, theme, screenshot, or exported-site references. Treat them as behavioural specifications and test fixtures.

- Reimplement behaviour through Laravel domain services, controllers, policies, jobs, events, React components, Inertia props, and typed application contracts.
- Do not make the Laravel application depend on a WordPress runtime unless a separate, explicitly approved integration requires it.
- Do not copy licensed or vendor source code into first-party application code.
- Do not preserve implementation quirks that conflict with security, accessibility, data integrity, or the confirmed product requirement.
- When parity is ambiguous, document the observed reference behaviour and implement the smallest safe interpretation.
- Keep migration adapters isolated. A legacy-data adapter must not leak WordPress-specific shapes into core domain models.

---

## 1. Non-Negotiable Safety Rules

### 1.1 Never perform destructive repository operations

Unless the user explicitly asks and the exact impact is understood, do not run or recommend:

```bash
git reset --hard
git clean -fd
git clean -fdx
git checkout -- .
git restore .
git push --force
git push --force-with-lease
rm -rf .
php artisan migrate:fresh
php artisan db:wipe
php artisan schema:drop
composer update
npm update
```

Additional restrictions:

- Do not delete untracked files.
- Do not overwrite user changes that are outside the task.
- Do not amend, squash, rebase, tag, commit, or push unless requested.
- Do not replace entire files when a focused patch is sufficient.
- Do not regenerate lockfiles unless dependency changes are part of the task.
- Do not modify generated build output, `vendor/`, or `node_modules/`.
- Do not silently remove code because it appears unused; first confirm references through search, routes, container bindings, events, tests, and dynamic registration.

### 1.2 Never hide errors to make tests pass

Forbidden shortcuts include:

- disabling tests or changing assertions to accept incorrect behaviour;
- adding broad `try/catch` blocks that swallow exceptions;
- returning success after a failed database or payment operation;
- adding `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, PHPStan ignores, or `any` without a documented, narrowly scoped reason;
- using non-null assertions merely to suppress a type problem;
- bypassing policies, Form Requests, CSRF, webhook signatures, or schema validation;
- replacing real domain logic with placeholder values;
- weakening database constraints to accommodate invalid data;
- using timeouts or arbitrary delays to hide race conditions.

### 1.3 Preserve backward compatibility by default

A change must preserve:

- existing public routes and route names;
- existing controller request/response shapes;
- persisted builder JSON from earlier widget versions;
- existing database records;
- existing permissions and admin access patterns;
- current storefront URLs and slugs;
- existing checkout and order records;
- existing environment variable names, unless a documented compatibility alias is included.

Breaking changes require an explicit migration plan, compatibility period, and rollback instructions.

### 1.4 Avoid broad refactors during feature work

Do not mix unrelated formatting, renaming, dependency upgrades, folder moves, or architecture rewrites into a feature patch. Refactor only the code necessary to implement the requested behaviour safely.

A normal task should not modify more than one bounded context unless the feature genuinely crosses contexts. Cross-context changes must preserve dependency direction and use explicit contracts/events.

---

## 2. Mandatory Execution Protocol

Claude Code must follow this lifecycle for every code task.

### Required checklist

- [ ] Requirement and acceptance criteria reviewed
- [ ] Relevant backend, frontend, routes, migrations, configuration, and tests inspected
- [ ] Existing behaviour and data contracts confirmed
- [ ] Dependencies, external integrations, and side effects identified
- [ ] Security, authorisation, privacy, financial, and concurrency risks reviewed
- [ ] Smallest reversible implementation slice selected
- [ ] Automated or explicit manual tests completed
- [ ] Diff, logs, temporary code, and regression risks reviewed
- [ ] Completion report prepared with truthful command results

### Step 1 — Read before writing

Inspect the minimum relevant set of files, including:

- `composer.json`, `composer.lock`, `package.json`, lockfile;
- relevant routes;
- related controller, Form Request, policy, service, model, migration, React page/component, and tests;
- similar completed functionality in the repository;
- configuration and service-provider registration;
- Inertia shared props and TypeScript types when frontend data is involved.

Search for symbol usage before changing shared code:

```bash
rg "ClassName|functionName|route.name|setting_key|widget-type" app resources routes tests config database
```

Do not infer usage only from imports. Laravel resolves classes through routes, events, queues, policies, service containers, Blade, configuration strings, and scheduled commands.

### Step 2 — Record the baseline

Before editing, run the narrowest available checks that cover the target area. At minimum:

```bash
git status --short
php artisan about
php artisan route:list --except-vendor
```

Then run relevant existing tests. Examples:

```bash
php artisan test --filter=Builder
php artisan test tests/Feature/Storefront/CartTest.php
npm run test:unit -- --run
npx tsc --noEmit
```

If the baseline already fails, do not claim the new change caused or fixed those failures unless proven. Record pre-existing failures in the final report.

### Step 3 — Produce an implementation plan

Before code changes, identify:

- files expected to change;
- data model impact;
- API/prop contracts;
- permissions and security checks;
- transaction and concurrency requirements;
- tests to add or update;
- rollback approach;
- known assumptions.

Do not create speculative files until the corresponding integration point has been verified.

### Step 4 — Implement the smallest complete slice

Rules:

- Prefer additive changes over replacement.
- Reuse existing services, components, hooks, form controls, modal patterns, notifications, and permission patterns.
- Keep controllers thin.
- Keep domain decisions in services/value objects.
- Keep React rendering separate from data mutation.
- Add types before wiring complex UI behaviour.
- Add validation at trust boundaries.
- Use transactions around related writes.
- Use feature flags for incomplete or high-risk production paths.

### Step 5 — Validate continuously

After each logical block, run focused checks. Do not wait until the end to discover widespread breakage.

Suggested sequence:

1. syntax/type check;
2. focused unit test;
3. focused feature test;
4. related regression tests;
5. full test/build gate when the slice is complete.

### Step 6 — Review the diff

Before declaring completion:

```bash
git diff --check
git diff --stat
git diff -- app resources routes tests database config
```

Review specifically for:

- accidental deletions;
- debug statements (`dd`, `dump`, `console.log`, temporary alerts);
- hard-coded IDs, secrets, URLs, prices, currencies, or dates;
- unrelated formatting churn;
- missing imports and dead imports;
- unsafe casts;
- N+1 queries;
- missing permission checks;
- missing transaction boundaries;
- missing error states or loading states;
- schema changes without migrations/tests.

### Step 7 — Report truthfully

The completion response must include:

- concise implementation summary;
- files changed;
- migrations/configuration required;
- tests and commands actually run;
- test results;
- remaining risks or deferred scope;
- manual verification steps where automation is not available.

Never say “all tests pass” unless the tests were run successfully in the current working tree.

---

## 3. Change Size and Delivery Rules

### 3.1 Patch size limits

Prefer patches that a reviewer can understand in one sitting.

- Small: up to roughly 5 files, one behaviour.
- Medium: up to roughly 15 files, one vertical slice.
- Large: split into backend contract, frontend integration, and hardening phases.

Generated migrations, tests, and types do not justify mixing unrelated business features.

### 3.2 Dependency changes

Before adding a dependency, prove that the repository or platform cannot reasonably provide the capability.

For every proposed package, verify:

- framework/version compatibility;
- maintenance activity;
- licence suitability;
- bundle/runtime cost;
- security implications;
- SSR compatibility for frontend packages;
- whether it duplicates an installed package.

Use an exact or controlled version range. Never upgrade unrelated packages in the same patch.

### 3.3 Feature flags

Use a feature flag for functionality that is:

- incomplete;
- payment-related and not production-certified;
- dependent on missing credentials;
- undergoing data migration;
- performance-sensitive and awaiting production measurement;
- likely to require rapid rollback.

Feature flags must default to the current stable behaviour. Do not leave unreachable dead branches permanently; create a removal ticket/condition.

---

## 4. Architectural Boundaries

### 4.1 Dependency direction

Allowed direction:

```text
HTTP / Console / Queue entry points
        ↓
Application services / actions
        ↓
Domain models, value objects, contracts
        ↓
Infrastructure adapters (gateway, mail, storage, cache)
```

Rules:

- Domain code must not import controllers, Form Requests, Inertia responses, React concepts, or route helpers.
- Controllers validate, authorise, delegate, and return.
- Models define persistence relationships and local invariants; do not turn models into large orchestration services.
- External providers implement domain contracts.
- Cross-domain communication uses explicit service contracts or domain events, not direct writes to another context's tables from controllers.
- Circular dependencies between bounded contexts are forbidden.

### 4.2 Service transaction ownership

The application service that coordinates a business operation owns the transaction boundary.

Example:

```php
DB::transaction(function () use ($command): Order {
    $order = $this->orders->createFromCheckout($command);
    $this->inventory->reserveForOrder($order);
    $this->statusHistory->recordPlaced($order);

    return $order;
});
```

Do not begin nested transactions in multiple low-level methods without understanding savepoint behaviour across SQLite and MySQL.

### 4.3 Events and queues

- Dispatch domain events only after the database transaction commits.
- Queued listeners must be idempotent.
- Queue payloads should contain stable identifiers, not huge serialised model graphs.
- Configure retry/backoff and terminal failure handling for external calls.
- Mail or webhook failure must not roll back a successfully placed order.
- Never perform network calls while holding a database row lock unless unavoidable and documented.


### 4.4 Laravel + React repository rules

- Put commerce business logic in the appropriate `app/Domain/<Context>/` service, action, value object, specification, or repository contract. Do not hide business rules inside controllers, React components, middleware, model observers, or route closures.
- Treat `app/Domain/` as the default home for first-party domain behaviour and `resources/js/` as presentation/client interaction. The browser must not become the source of truth for money, stock, discounts, access, order state, or payment state.
- Do not edit `vendor/`, `node_modules/`, generated Vite assets, SSR build output, generated IDE helpers, coverage output, or compiled caches.
- Prefer framework extension points, service-container bindings, contracts, middleware, events, listeners, policies, casts, and adapters over modifying third-party packages.
- Optional integrations must degrade safely. Guard them through configuration, capability checks, service-container bindings, package/class availability, and typed null/disabled implementations.
- Do not call `env()` outside config files. Access settings through `config()` or an approved encrypted settings service.
- Keep controllers thin: authorise, validate, delegate, and return a response.
- Keep React pages/components free of direct persistence logic. Use Inertia forms, API clients, or typed actions with explicit loading/error states.
- Preserve Inertia SSR compatibility. Browser-only APIs require runtime guards and must not execute during server rendering.
- Never log secrets, card/payment payloads, full access tokens, password-reset tokens, full customer PII, or identifiable coupon/store-credit data. Mask identifiers where operational logging is necessary.

### 4.5 Minimum files to inspect before a non-trivial change

Inspect only what is relevant, but normally include:

- `composer.json`, `composer.lock`, `package.json`, and the relevant TypeScript/Vite configuration;
- `routes/web.php`, `routes/admin.php`, `routes/api.php`, or the route file actually serving the feature;
- the relevant controller, Form Request, policy, domain service, model, migration, resource/DTO, event/listener/job, and tests;
- the relevant React page, layout, component, builder widget, registry entry, and shared Inertia-prop definition;
- `app/Http/Middleware/HandleInertiaRequests.php` when shared data or SSR hydration is involved;
- `config/services.php` and the relevant config file when an external provider is involved;
- existing architectural notes and legacy-reference fixtures for parity work.

Useful discovery commands:

```bash
git status --short
php artisan about
php artisan route:list --except-vendor
php artisan migrate:status
rg "ControllerName|ServiceName|route.name|table_name|setting_key|event_name" app resources routes tests database
find app/Domain resources/js/Pages resources/js/pageBuilder tests -maxdepth 4 -type f | sort
```

Do not run expensive full-repository commands blindly when a narrower search answers the question.

---

## 5. Database and Migration Safety

### 5.1 Compatibility targets

All migrations and queries must work with:

- SQLite for local development/tests;
- MySQL for production.

Avoid database-specific SQL unless it is isolated behind a tested driver branch.

### 5.2 Migration rules

Every schema change requires:

- a forward migration;
- a safe `down()` where practical;
- indexes for expected lookup patterns;
- foreign-key behaviour explicitly chosen;
- migration tests or feature tests that exercise the schema;
- a production rollout note if the table is large or locked during alteration.

Do not:

- rename/drop a live column in the same deployment that stops writing the old column;
- add a non-null column without a default/backfill plan;
- change money precision casually;
- change primary key types after data exists;
- assume SQLite enforces or alters constraints identically to MySQL.

### 5.3 Expand-and-contract strategy

For breaking data changes:

1. Add the new nullable column/table.
2. Deploy code that writes both old and new representations.
3. Backfill existing records in a resumable command/job.
4. Switch reads to the new representation with fallback.
5. Verify production data.
6. Stop writing the old representation.
7. Drop old structures only in a later deployment.

### 5.4 Data backfills

Backfills must be:

- resumable;
- chunked by stable primary key;
- safe to rerun;
- observable through progress logging;
- bounded to avoid memory exhaustion;
- separated from web requests.

Use commands/jobs and `chunkById()`. Do not load entire product/order tables into memory.

### 5.5 Deletion policy

Default to soft deletion where historical business records or relationships matter. Never cascade-delete orders, payment transactions, status history, inventory movements, or financial audit records because a user/product is deleted.

For catalogue deletion, prefer status/archive flags and preserve order-item snapshots.

---

## 6. Type and Data Contract Rules

### 6.1 PHP

- Use strict parameter and return types.
- Prefer immutable DTOs/value objects for complex service inputs and outputs.
- Use backed enums only when database compatibility and migration strategy are clear.
- Avoid unstructured arrays across layers. When an array is unavoidable, document its shape with PHPDoc and validate it.
- Use Laravel casts for JSON, booleans, dates, encrypted fields, and money representations where appropriate.

### 6.2 TypeScript

- `strict: true` is mandatory.
- `any` is forbidden in application code.
- External/JSON input begins as `unknown`, then passes a type guard or schema parser.
- Inertia page props must be explicitly typed.
- Shared API/domain types belong in a stable `types/` module, not duplicated across pages.
- Use discriminated unions for widget types, payment states, and async UI states when practical.

### 6.3 API and Inertia contracts

Backend-provided data must use a deliberate resource/transformer layer. Do not expose full Eloquent models by accident.

Each contract must specify:

- property names and nullability;
- date format and timezone;
- monetary unit and currency;
- pagination format;
- permission-driven fields/actions;
- error shape;
- compatibility defaults for older data.

Do not rename a prop and update only one consumer. Search all usages first.

### 6.4 Time handling

- Store timestamps in UTC.
- Convert to the configured application/user timezone at presentation boundaries.
- Do not compare date strings lexically when timezone offsets matter.
- Tests must freeze time for date-sensitive behaviour.
- Scheduled jobs must state their timezone explicitly.

---

## 7. Page Builder Schema Invariants

The builder JSON is persisted user data. Treat it like a public API.

### 7.1 Canonical schema

The exact repository types take precedence, but the intended shape is:

```ts
type Breakpoint = 'desktop' | 'tablet' | 'mobile';

type CssUnit = 'px' | 'em' | 'rem' | '%' | 'vw' | 'vh' | 'auto';

interface CssLength {
  value: number | null;
  unit: CssUnit;
}

interface ResponsiveStyleMap {
  desktop: Record<string, unknown>;
  tablet: Record<string, unknown>;
  mobile: Record<string, unknown>;
}

interface PageComponent {
  id: string;
  type: string;
  version: number;
  settings: Record<string, unknown>;
  styles: ResponsiveStyleMap;
  children?: PageComponent[];
}

interface PageSchema {
  schemaVersion: number;
  components: PageComponent[];
  metadata?: {
    title?: string;
    createdWith?: string;
    updatedAt?: string;
  };
}
```

Do not silently change the meaning or type of an existing setting key.

### 7.2 Stable IDs

- Existing component IDs remain stable during settings/style updates.
- Duplicate/paste/template insertion must recursively generate new IDs.
- Moving a component does not regenerate its ID.
- IDs must be safe for DOM use after escaping/prefixing.
- Copying must not preserve database IDs or references that should be document-local.

### 7.3 Widget version migrations

When a widget's settings shape changes:

1. Increment the widget definition version.
2. Add a pure migration from each supported older version.
3. Preserve unknown settings where safe.
4. Add unit tests using persisted fixtures from older versions.
5. Run migrations at load/normalisation time without mutating the raw server response in place.
6. Persist the upgraded schema only after a user save, unless a deliberate backfill is requested.

Example contract:

```ts
type WidgetMigration = (component: PageComponent) => PageComponent;

const migrations: Record<string, Record<number, WidgetMigration>> = {
  'product-grid': {
    1: migrateProductGridV1ToV2,
    2: migrateProductGridV2ToV3,
  },
};
```

A migration must be deterministic and idempotent for its target version.

### 7.4 Unknown widgets and corrupted data

`PageRenderer` and the editor must not crash the whole page when a component type is missing or invalid.

Required behaviour:

- Storefront: skip or render a safe placeholder according to environment; log structured diagnostics without exposing internals to visitors.
- Editor: show an “Unknown widget” block with type, version, and delete/export options.
- Preserve raw settings so reinstalling/registering the widget can recover the content.
- Detect recursive depth/component count limits to prevent malicious or accidental payload exhaustion.

### 7.5 Save concurrency

Builder saving must protect against two tabs overwriting each other.

Preferred approach:

- Include `revisionId` or `updatedAt` in the edit payload.
- Save sends the expected revision token.
- Server compares it inside the transaction.
- On mismatch, return HTTP 409 with the current revision metadata.
- Editor offers reload, compare, or save-as-copy; never silently overwrite.

Autosave requirements:

- debounce;
- one in-flight save per document;
- abort or ignore stale responses;
- dirty/saving/saved/error state visible;
- failed autosave does not clear dirty state;
- navigation warning when unsaved changes remain.

### 7.6 Undo/redo invariants

- Undo/redo state is document-local and bounded.
- Selection-only changes should not flood history.
- Remote save responses must not reset history unexpectedly.
- A failed mutation must not create a history entry.
- Paste/duplicate is a single undoable operation.
- Widget migration normalisation is not exposed as dozens of undo steps.

### 7.7 Responsive inheritance

Resolve styles in this order:

```text
desktop base
  → tablet overrides desktop
    → mobile overrides resolved tablet
```

An absent value inherits. An explicit reset must be represented distinctly from absence; do not use empty strings ambiguously.

### 7.8 Custom HTML and CSS

- HTML mode requires a dedicated permission.
- Sanitize with an allow-list; remove scripts, event handlers, unsafe URLs, iframes unless explicitly permitted, and dangerous SVG content.
- Custom CSS requires a dedicated permission.
- Parse CSS rather than applying regex-only scoping.
- Reject `@import`, `expression()`, `javascript:` URLs, external tracking URLs, and selector escape attempts.
- Apply payload size limits.
- Do not execute custom JavaScript from builder content.

---

## 8. Frontend and React Safety

### 8.1 SSR safety

Any use of browser-only APIs must be guarded:

```ts
const isBrowser = typeof window !== 'undefined';
```

Rules:

- Do not read `window`, `document`, `navigator`, `localStorage`, `matchMedia`, or element dimensions during server render.
- Initialise browser-derived state in an effect or through a safe lazy initializer.
- Server and first client render must produce compatible markup to avoid hydration errors.
- Use deterministic IDs; do not call random ID generators during render.
- Lazy-loaded components need SSR-compatible fallbacks.

### 8.2 State ownership

- Server data is authoritative for prices, stock, permissions, order status, and persisted page content.
- Local state manages temporary UI interaction.
- Do not duplicate the same mutable state in multiple components without a clear owner.
- Do not mutate props, reducer state, or nested component trees in place.
- Derive values with selectors/memoisation only where profiling shows value; avoid premature complexity.

### 8.3 Forms

Every form must include:

- typed initial values;
- client convenience validation, but server validation remains authoritative;
- field-level server errors;
- disabled/submitting state;
- duplicate-submission protection;
- success and failure feedback;
- focus management for the first invalid field;
- preserved input on recoverable errors.

### 8.4 Accessibility

Minimum requirements:

- semantic elements and labels;
- keyboard-operable controls;
- visible focus states;
- modal focus trap and focus return;
- accessible names for icon-only buttons;
- `aria-live` for save/cart/status feedback;
- colour is not the only status indicator;
- reduced-motion support for animations;
- drag-and-drop has a keyboard alternative where practical.

### 8.5 Keyboard shortcuts

Builder shortcuts must not trigger while focus is in editable controls unless explicitly intended.

Check:

```ts
const target = event.target;
const isEditing = target instanceof HTMLElement && (
  target.isContentEditable ||
  ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
);
```

Support platform modifiers (`Ctrl`/`Meta`) and prevent browser defaults only when the builder action is actually handled.

### 8.6 Error boundaries

High-risk widget previews and third-party UI integrations should be isolated by an error boundary so one widget does not crash the entire editor/storefront tree. Log component type and ID without logging secrets or personal data.

---

## 9. Commerce Domain Invariants

Commerce correctness takes priority over UI convenience.

### 9.1 Money

- Never calculate money with binary floating-point values.
- Store and calculate in integer minor units (for example cents/sen) plus ISO currency, or use an established immutable Money value object.
- Product/order display formatting happens at the presentation layer.
- Rounding mode and order must be explicit and tested.
- Order items snapshot unit price, discount, tax, name, SKU, and variation attributes at purchase time.
- Never recompute historical order totals from the current product record.

Suggested value object:

```php
final readonly class Money
{
    public function __construct(
        public int $minor,
        public string $currency,
    ) {}
}
```

### 9.2 Server-authoritative checkout

Never trust frontend totals, discount amounts, shipping fees, tax, stock, or payment status.

At checkout the server must reload and validate:

- active product/variation;
- current purchasable status;
- currency;
- server price;
- requested quantity limits;
- stock availability;
- coupon eligibility and usage limits;
- shipping method eligibility for the submitted address;
- tax applicability;
- gateway availability.

The browser may send identifiers and user selections, not authoritative amounts.

### 9.3 Cart identity and merge

- Guest cart uses an opaque, rotated session identifier.
- Do not expose sequential cart IDs.
- On login, merge guest and customer carts in one transaction.
- Deduplicate identical product+variation+configuration lines.
- Revalidate stock, price, and product availability during merge.
- Apply a deterministic quantity policy and report adjustments to the user.
- Prevent another authenticated user from accessing a cart by ID manipulation.

### 9.4 Order placement idempotency

The checkout submission must include an idempotency key generated per intended order attempt.

Server requirements:

- unique constraint on the key scoped appropriately;
- repeated request returns the existing order/result;
- no duplicate order, inventory reservation, coupon usage, email, or gateway charge;
- key cannot be reused for a materially different payload;
- store a request fingerprint where useful.

### 9.5 Inventory

Define quantities clearly:

```text
on_hand   = physically held stock
reserved  = stock held for pending/processing orders
available = on_hand - reserved
```

Rules:

- Stock reservation and order creation occur atomically.
- Lock relevant inventory rows (`lockForUpdate`) in a stable order to reduce deadlocks.
- Never allow `available < 0` unless backorders are explicitly enabled.
- Every manual adjustment creates an immutable `InventoryMovement` with actor, reason, before, delta, after, and reference.
- Payment failure/cancellation releases reservations exactly once.
- Fulfilment converts reservation into stock deduction exactly once.
- Refund does not automatically restock unless the admin explicitly selects restock and the return is eligible.

### 9.6 Orders

Order status and payment status are separate state machines.

Example order statuses:

```text
pending → processing → completed
pending → cancelled
processing → cancelled (policy-controlled)
processing/completed → refunded or partially_refunded
```

Example payment statuses:

```text
unpaid → pending → paid
pending → failed
paid → partially_refunded → refunded
```

Do not allow arbitrary status jumps. Centralise transitions in an order state service and record every transition in `OrderStatusHistory` with actor/source/reason.

### 9.7 Coupons and promotions

- Coupon validation and discount calculation are pure/repeatable for the same cart context.
- Enforce date windows in a defined timezone.
- Enforce global and per-user limits atomically at order placement.
- Record coupon usage against the order.
- Define stacking order and exclusivity.
- Prevent discount total from exceeding eligible line totals.
- BOGO auto-added lines must be marked, repriced server-side, and removed/recalculated when eligibility disappears.
- Refund allocation must know how discounts were distributed across lines.

### 9.8 Tax

- Tax rates need an effective-date strategy before rates can change historically.
- Snapshot tax names/rates/amounts on order lines and totals.
- Define whether discounts apply before or after tax.
- Define inclusive/exclusive pricing and shipping tax.
- Compound rates apply by priority in a deterministic order.
- Do not provide jurisdiction-specific tax claims without business approval; the engine implements configured rules.

### 9.9 Shipping

- Match zones server-side using normalised country/state/postcode.
- A submitted method ID must be revalidated against the address/cart.
- Snapshot method title and amount on the order.
- Handle no-method cases explicitly; never silently use zero shipping.
- Shipping calculation should be side-effect free.


### 9.10 Legacy WooCommerce feature-parity map

The following areas originate from common WooCommerce/plugin behaviour. Implement them as first-party Laravel domain capabilities, not as copied plugin code.

#### Promotions, gift credit, URL coupons, auto-apply, BOGO, and cashback

Primary Laravel home: `app/Domain/Promotions/`, `CouponService`, promotion specifications, usage records, a store-credit ledger, and checkout calculators.

- Preserve balance, expiry, global/per-user limits, customer restrictions, currency, tax mode, uniqueness, and order-status effects.
- Store credit is a financial ledger, not a mutable number with no audit trail.
- Generated codes require collision-safe uniqueness and must not be logged with customer identity.
- URL/auto-applied coupons pass the same server-side eligibility rules as manually entered codes.
- Return structured failure reasons for invalid, expired, exhausted, restricted, conflicting, or already-applied promotions.
- Test cart recalculation, checkout, confirmation email, cancellation, refund, partial redemption, and zero-balance behaviour.

#### Product badges and merchandising labels

Primary Laravel home: a catalogue merchandising policy/service, typed badge resources, and product-card/product-detail React components.

- Define deterministic priority when multiple badges apply.
- Do not hardcode product IDs, media URLs, category IDs, or environment-specific paths.
- Check simple and variable products, sale windows, stock states, category/brand/search/archive pages, loop templates, and cached grids.
- Badge evaluation should be pure and cacheable for the same product/context.

#### Product extras, add-ons, conditional fields, and dynamic pricing

Primary Laravel home: catalogue option definitions, cart-line configuration value objects, order-item metadata snapshots, and server-side pricing/validation services.

- Validate every add-on and conditional rule on the server. Hidden fields and client-calculated prices are untrusted.
- Recalculate base price, add-on price, quantity rules, child products, discounts, shipping implications, and tax in the authoritative checkout calculation.
- Persist a canonical configuration fingerprint so identical configured lines merge predictably and different configurations do not.
- Snapshot labels, values, prices, files, and calculation inputs on the order item.
- Upload options require MIME, size, count, ownership, active-content controls, expiry, and cleanup rules.
- Test hidden-field reset, repeatable groups, variations, tax modes, multi-currency policy, cart editing, order display, refunds, and quantity changes.

#### Roles, capabilities, and admin restrictions

Primary Laravel home: global `Role`/`Permission` models, policies, gates, Form Request `authorize()`, scoped queries, and React capability props.

- Capability changes are security-sensitive and require regression tests.
- Never bypass policies, middleware, CSRF, signed routes, Sanctum ability checks, or ownership checks.
- Do not grant broad wildcard/admin permissions merely to make a screen work.
- Test direct URL access, Inertia navigation, API access, bulk actions, menu visibility, disabled controls, impersonation/test-user flows if present, and cross-resource access.

#### Product reviews, reminders, consent, and incentives

Primary Laravel home: a review service/moderation policy, notification-preference and consent records, and idempotent queued mail/notification jobs.

- Render only approved reviews publicly unless a privileged preview explicitly requests otherwise.
- Enforce verified-purchase rules where configured.
- Preserve unsubscribe, consent, frequency, channel, country/timezone delay, and suppression behaviour.
- Do not send duplicate reminders or duplicate review incentives. Claim a unique reminder/incentive record before dispatch.
- Escape email/admin-template output and allow only approved variables.
- Test disabled reminders, unsubscribed recipients, refunded/cancelled orders, max-delay rules, duplicate jobs, moderation, and missing optional notification providers.

---

## 10. Payments and Webhooks

### 10.1 Gateway contract

The final contract may adapt to existing code, but it must cover capability and idempotency explicitly:

```php
interface PaymentGateway
{
    public function name(): string;
    public function label(): string;
    public function isEnabled(): bool;
    public function supports(string $capability): bool;

    public function createPayment(
        Order $order,
        PaymentAttemptData $attempt,
    ): PaymentResult;

    public function refund(
        Order $order,
        Money $amount,
        RefundData $refund,
    ): RefundResult;

    public function handleWebhook(Request $request): WebhookResult;
}
```

Do not force gateways with redirect flows and gateways with client-side intents into an unsafe identical implementation. Use typed result variants.

### 10.2 Payment transaction records

Record every attempt, not only successes:

- internal ULID;
- order ID;
- gateway;
- type (`payment`, `refund`, `void`);
- status;
- amount/currency;
- provider transaction/reference ID;
- idempotency key;
- sanitised provider response metadata;
- failure code/message safe for logs;
- timestamps.

Unique constraints must prevent duplicate provider events/transactions.

### 10.3 Webhook processing

Required order:

1. Read raw request body.
2. Verify provider signature using the raw body and configured secret.
3. Reject invalid timestamp/replay where supported.
4. Parse and validate event structure.
5. Claim event ID idempotently in a database transaction.
6. Locate the expected transaction/order.
7. Verify amount, currency, merchant/account, and allowed state transition.
8. Apply state change exactly once.
9. Record audit metadata.
10. Return provider-required response quickly.

Heavy follow-up work is queued after commit.

Never trust a browser redirect/callback alone to mark an order paid.

### 10.4 Secrets

- Secrets never appear in Git, logs, exceptions returned to users, Inertia props, browser source, or activity-log payloads.
- Public keys may be exposed only where the provider intends.
- Secret UI fields are write-only and masked.
- Configuration cache behaviour must be considered; never call `env()` outside config files.
- Production secret rotation must not invalidate verification of in-flight events without a planned overlap strategy.

### 10.5 Refunds

- Authorise refunds separately from normal order editing.
- Validate refundable balance.
- Use an idempotency key.
- Persist a pending refund transaction before external submission.
- Reconcile asynchronous provider results.
- Update order refunded totals only from confirmed gateway/domain result.
- Support partial refunds without corrupting line/tax/discount allocation.
- Email failure must not reverse a completed refund.

---

## 11. Security Requirements

### 11.1 Authorisation

- Authentication is not authorisation.
- Every admin action requires a policy/permission check.
- Hide unavailable UI actions, but always enforce server-side.
- Bulk actions authorise every resource or use a policy-aware scoped query.
- Builder access must verify permission for the concrete owner/document type.

### 11.2 Validation

Use Form Requests for HTTP input. Validation must include:

- type/shape;
- maximum lengths and array counts;
- enum/allow-list values;
- relational ownership/existence;
- uploaded MIME determined server-side;
- image dimensions where relevant;
- sane CSS/animation numeric bounds;
- nested builder depth/component count limits;
- unique constraints mirrored with race-safe database handling.

### 11.3 Mass assignment and model exposure

- Never call `Model::create($request->all())` or `update($request->all())`.
- Map validated fields explicitly or use DTOs.
- Do not expose hidden/internal attributes through Inertia.
- Do not allow clients to set ownership, payment state, totals, role IDs, approval flags, or audit fields unless the endpoint is explicitly designed and authorised for it.

### 11.4 Uploads and media

- Validate MIME by file content, not extension.
- Randomise storage names.
- Do not execute uploaded files.
- Keep originals private unless public access is intentional.
- Serve private media with authorised/signed routes.
- Strip unsafe metadata.
- Rasterise or sanitise SVG before use; raw user SVG is high risk.
- Protect image processing from decompression bombs and oversized dimensions.
- Delete/replace files only after the database operation succeeds; clean orphaned files through a job.

### 11.5 Logging and privacy

Log structured operational data, but never log:

- passwords;
- API secrets;
- complete payment payloads;
- card data;
- session cookies/tokens;
- full personal addresses unless essential and protected;
- sanitised builder HTML before confirming it is safe.

Use correlation IDs/order IDs/transaction IDs. User-facing errors are generic; detailed diagnostics go to protected logs.

### 11.6 Rate limiting

Apply appropriate rate limits to:

- login/register/password reset;
- live search;
- reviews;
- wishlist toggle;
- cart mutation;
- checkout attempts;
- coupon validation;
- media upload;
- public form widgets;
- webhook endpoints where provider behaviour allows.

Do not rate-limit webhooks solely by client IP if provider IPs are dynamic; signature verification remains primary.

---

## 12. Performance and Reliability Rules

### 12.1 Query discipline

- Eager-load relationships used by resources/views.
- Select only needed columns for large listings.
- Paginate all unbounded admin/storefront lists.
- Use `withCount`/aggregates instead of per-row queries.
- Add indexes based on actual filter/sort patterns.
- Inspect query count for product grids, cart, checkout, and admin dashboard.
- Do not cache permission-sensitive or user-specific content under a shared key.

### 12.2 Cache correctness

Every cache entry needs:

- explicit key structure;
- tenant/user/locale/currency/device dimension where applicable;
- TTL rationale;
- invalidation owner;
- bypass conditions;
- tests for stale-data risks.

Do not cache authenticated cart, checkout, account, CSRF-bearing, or personalised pages as public HTML.

### 12.3 External calls

- Set connect and total timeouts.
- Retry only safe/idempotent operations.
- Use exponential backoff with jitter.
- Circuit-break or fail gracefully for optional services.
- Do not retry a charge blindly.
- Record provider latency and error category without secrets.

### 12.4 Images

- Preserve original upload.
- Generate variants asynchronously where practical.
- Store width/height and MIME.
- Avoid upscaling smaller sources.
- Correct orientation.
- Use deterministic variant naming/versioning.
- Do not delete old variants until new variants are committed and referenced.

### 12.5 Browser performance

- Keep builder-only dependencies out of storefront bundles.
- Avoid shipping all widget editor panels to public pages.
- Dynamically import heavy widgets.
- Verify bundle output; do not assume manual chunk configuration worked.
- Reserve dimensions for images/media.
- Honour reduced motion.
- Avoid hydration-time layout measurements where CSS can solve layout.

---

## 13. Testing Contract

### 13.1 Required test layers

For each feature, choose the applicable layers:

| Layer | Purpose |
|---|---|
| PHP unit | pure domain calculation, state transition, resolver, migration logic |
| PHP feature | route, middleware, policy, validation, DB writes, Inertia contract |
| Integration | payment adapter, storage, mail, queue, cache with fakes/sandboxes |
| TypeScript unit | reducer, tree helpers, style resolution, widget migration, calculators |
| React component | user interaction, form errors, accessibility, editor controls |
| End-to-end/manual | drag/drop, checkout redirect, real browser hydration, payment sandbox |

### 13.2 Minimum regression cases

#### Builder

- load an older schema fixture;
- unknown widget does not crash;
- add/update/delete/duplicate/move;
- nested move prevents placing a parent inside its descendant;
- undo/redo;
- responsive inheritance;
- hidden/locked behaviour;
- concurrent save conflict;
- invalid schema rejected;
- sanitisation of HTML/CSS.

#### Cart/checkout

- guest and authenticated cart;
- merge conflict/quantity adjustment;
- inactive product;
- variation mismatch;
- insufficient stock under concurrent requests;
- server ignores tampered price/total;
- coupon limits and expiry;
- invalid shipping method;
- duplicate checkout submission returns same order;
- transaction rollback on failure.

#### Payments

- invalid signature;
- duplicate webhook;
- wrong amount/currency;
- out-of-order events;
- successful payment;
- failed payment;
- partial/full refund;
- provider timeout;
- email/queue failure after confirmed payment does not corrupt order.

#### Permissions

For each admin resource/action:

- unauthenticated denied;
- authenticated without permission denied;
- authorised user succeeds;
- UI action not exposed when unavailable.

### 13.3 Test data

- Use factories and named states.
- Do not depend on production IDs.
- Freeze time for expiry/reporting.
- Use deterministic currencies and amounts.
- Use provider fakes or official sandbox; never contact live endpoints from tests.
- Keep persisted builder fixtures in versioned JSON files.

### 13.4 Manual verification when automated coverage is incomplete

When full automation is unavailable, document and execute the narrowest reliable manual checks. At minimum cover:

- happy path;
- invalid and missing request data;
- unauthenticated and unauthorised access;
- missing or disabled optional integration;
- duplicate submission or job retry;
- cart, checkout, order, stock, coupon, tax, shipping, refund, and email regression when commerce state can be affected;
- desktop/mobile and SSR/client hydration when React rendering is affected;
- admin menu/action visibility and direct endpoint protection when roles or permissions are affected.

Manual testing does not replace automated tests for money, permissions, state transitions, migrations, idempotency, or concurrency when those areas are changed.

### 13.5 Quality gate commands

Run commands available in the repository. Preferred final gate:

```bash
./vendor/bin/pint --test
./vendor/bin/phpstan analyse
php artisan test
npm run lint
npx tsc --noEmit
npm run test:unit -- --run
npm run build
```

If a command is missing, do not invent success. State that it is unavailable and run the nearest valid command.

For migration-related tasks also test, on a disposable test database:

```bash
php artisan migrate --force
php artisan migrate:rollback --step=1 --force
php artisan migrate --force
```

Never run rollback against an environment containing user data without explicit confirmation.

---

## 14. Definition of Done

A feature is complete only when all applicable items are true:

- [ ] Scope is implemented without unrelated rewrites.
- [ ] Existing architecture is followed or deviation is documented.
- [ ] Authorisation is enforced server-side.
- [ ] Input is validated at the boundary.
- [ ] Database writes are transactional where required.
- [ ] Concurrency/idempotency is handled for high-risk operations.
- [ ] Errors are visible and recoverable; no silent failure.
- [ ] Types contain no unjustified escape hatches.
- [ ] Loading, empty, validation, success, and failure states exist.
- [ ] Accessibility basics are implemented.
- [ ] Unit/feature tests cover success and critical failure paths.
- [ ] Relevant regression tests pass.
- [ ] Build/type/lint/static analysis pass or limitations are reported.
- [ ] No secrets, debug code, or temporary bypasses remain.
- [ ] Migration/configuration/deployment steps are documented.
- [ ] Rollback behaviour is understood.
- [ ] Final diff was reviewed.

---

## 15. Required Task Format for Claude Code

When the user gives an implementation task, internally structure it as follows:

```md
## Task
[One-sentence outcome]

## Confirmed Existing Behaviour
- [What was inspected]

## Scope
- [Included]

## Out of Scope
- [Explicit exclusions]

## Data / API Contract
- [Requests, responses, props, schema versions]

## Security and Integrity
- [Policies, validation, transactions, idempotency]

## Implementation Steps
1. ...

## Tests
- ...

## Rollback
- ...

## Completion Report

### Summary
Briefly explain the completed behaviour.

### Files Changed
List only files actually modified.

### Testing
List commands and manual checks with pass/fail results. State what could not be run.

### Risks / Notes
Record assumptions, migrations, configuration, compatibility risks, and remaining limitations.

### Next Step
Give only the next bounded recommended action when one is genuinely needed.
```

Do not ask the user to manually choose implementation details that are already established by the repository. Ask only when a product decision materially changes behaviour and cannot be safely inferred.

---

## 16. Subsystem Acceptance Gates

### 16.1 Builder/editor gate

Before merging any builder change:

- Existing saved pages still render.
- Editor and storefront produce equivalent layout semantics.
- SSR build succeeds.
- No browser API is accessed during SSR.
- History remains valid.
- Deeply nested components do not cause runaway recursion.
- Component selection survives non-structural updates.
- Mobile/tablet overrides do not overwrite desktop values.
- Copy/paste strips unsafe/external identifiers and regenerates IDs.
- Unsupported/corrupt widget data fails locally, not globally.

### 16.2 Checkout gate

Before enabling checkout:

- All totals are recalculated server-side.
- Order creation, snapshots, coupon usage, and stock reservation are atomic.
- Repeated submit cannot create duplicate orders.
- Stock race has an automated test.
- Payment state is not determined by the browser.
- Cart is cleared only after a durable order is created; recovery behaviour is defined for failed payment.
- Confirmation page authorises ownership or uses a secure temporary signed access mechanism.
- Personal data is not exposed through predictable order IDs.

### 16.3 Gateway production-readiness gate

A gateway remains disabled by default until:

- credentials/config documented;
- sandbox charge verified;
- webhook signature verified;
- duplicate webhook tested;
- wrong amount/currency rejected;
- timeout/retry behaviour tested;
- refund path tested if advertised;
- logs reviewed for secrets;
- user-facing failure/retry flow exists;
- reconciliation procedure is documented.

### 16.4 Performance feature gate

Before enabling caching, critical CSS, image pipelines, or bundle changes:

- baseline measurement captured;
- correctness tests exist;
- cache invalidation is tested;
- authenticated/personalised bypass verified;
- failure falls back to uncached/original behaviour;
- production build output inspected;
- feature can be disabled without data loss.

---

## 17. Known High-Risk Areas

Treat these as high risk and change them only with focused tests:

- `usePageBuilder` tree mutation helpers;
- `PageRenderer` recursion and style resolution;
- revision save/restore and publish state;
- theme-template condition resolution;
- cart merge;
- checkout totals;
- inventory reservation/release;
- coupon usage counters;
- payment webhook transitions;
- refunds;
- permission registry/policies;
- shared Inertia props;
- catch-all storefront routes;
- media replacement/deletion;
- SSR entry and dynamic imports;
- cache invalidation.

---

## 18. Project Reference and Roadmap

The following section contains the product architecture and implementation roadmap. It must be executed under all safety and quality rules above.

## Project Identity

This file must remain at the repository root beside `artisan`, `composer.json`, and `package.json`.

**visual-commerce/platform** — a Laravel 13 + React 19.2 + Inertia.js commerce platform with a visual storefront builder inspired by Elementor Pro and WooCommerce behaviour, implemented as an original self-hosted Laravel application. Do not copy proprietary source code, assets, trademarks, or licensed implementation details from third-party products.

Stack: PHP 8.3 · Laravel 13 · Inertia.js v2 · React 19.2 · TypeScript 5 · Tailwind CSS 4 · Vite 7 · @dnd-kit · Vitest · SQLite (dev) / MySQL (prod)

---

## Architecture Overview

### Domain Structure (`app/Domain/`)

Every bounded context lives under `app/Domain/<Context>/`:

| Context | Key Models | Key Services |
|---|---|---|
| `Cart` | `Cart`, `CartItem` | — |
| `Catalogue` | `Product`, `ProductCategory`, `ProductBrand`, `ProductVariation`, `ProductImage`, `ProductAttribute` | `ProductService`, `CategoryService` |
| `Cms` | `CmsPage`, `CmsPageRevision` | `CmsPageService` |
| `Customers` | `CustomerAddress` | — |
| `Inventory` | `InventoryMovement` | `InventoryService` |
| `Media` | `Media` | `MediaService` |
| `Orders` | `Order`, `OrderItem`, `OrderAddress`, `OrderStatusHistory` | `OrderService` |
| `PageBuilder` | `PageBuilderTemplate`, `ThemeTemplate`, `BuilderRevision` | `BuilderService` |
| `Payments` | `PaymentTransaction` | — |
| `Promotions` | `Coupon` | `CouponService` |
| `Shipping` | `ShippingZone`, `ShippingZoneMethod` | — |

Global cross-cutting models (`User`, `Role`, `Permission`, `Setting`, `ActivityLog`) live in `app/Models/`.

### Frontend Structure (`resources/js/`)

```
pageBuilder/
  registry.ts          ← Map<type, WidgetDefinition>
  registerAll.ts       ← side-effect barrel that registers all widgets
  types.ts             ← PageComponent, PageSchema, WidgetDefinition, ResponsiveStyles
  usePageBuilder.ts    ← immutable reducer + undo/redo stack
  render/
    PageRenderer.tsx   ← storefront render tree
    StorefrontContext.tsx  ← product/category/brand data provider
    gridStyle.ts
    renderStyles.ts
  widgets/             ← ~65 widget files (one per type)

Pages/Admin/PageBuilder/Editor.tsx   ← full builder canvas + drag-and-drop UI
Pages/Storefront/                    ← Home, Product, Category, Brand, Page
Layouts/
  AdminLayout.tsx
  StorefrontLayout.tsx  ← header + footer from theme templates
```

### Builder Data Flow

```
Admin opens /admin/builder/{type}/{ulid}/edit
  → BuilderController::edit()
  → passes document { type, id, content: PageSchema, saveUrl, … }
  → Editor.tsx mounts with usePageBuilder(initialSchema)
  → DnD: drag widget from left panel → drop on canvas → addComponent()
  → Right panel: SettingsPanel + style controls per selected widget
  → Save → POST saveUrl → BuilderService::save() → writes builder_content + BuilderRevision

Storefront renders:
  → PageRenderer walks PageSchema.components tree
  → Each component → getWidget(type).PreviewComponent
  → StorefrontDataProvider supplies product/category/brand data
  → SSR via vite build --ssr (bootstrap/ssr/ssr.js)
```

### Widget Contract (`WidgetDefinition`)

Every widget must export a `WidgetDefinition` object and call `registerWidget(def)`.

```ts
{
  type: string           // unique kebab-case key, e.g. 'product-grid'
  version: number        // increment when settings shape changes
  category: 'layout' | 'basic' | 'content' | 'commerce' | 'form'
  label: string
  icon: string           // lucide icon name
  defaultSettings: Record<string, unknown>
  defaultStyles: ResponsiveStyles   // { desktop, tablet, mobile }
  hasChildren: boolean
  EditorComponent        // canvas representation (inline editing)
  PreviewComponent       // storefront render
  SettingsPanel          // right-panel settings form
  getChildrenContainerStyle?  // mirrors layout in editor canvas
}
```

Add new widgets in `registerAll.ts` — they appear in the palette automatically.

---

## What Is Already Built

### Backend ✅
- Full RBAC: roles, permissions, policies for every resource, `RBACService`, `PermissionRegistry`
- `BuilderController`: edit / save / revisions / restore — polymorphic over page / category / brand / header / footer / theme
- `BuilderService`: atomic save with revision pruning (keeps 20 auto-saves), publish flag, activity logging
- `HasPageBuilder` concern: `builderRevisions()`, `builderContentOrDefault()`, `builderTitle()`, `builderContentColumn()`
- `ThemeTemplate`: header · footer · single · archive · product · 404 with display conditions JSON column
- `BuilderRevision`: polymorphic, `owner_type` + `owner_id` index, `is_published` flag
- Admin controllers: Products, Categories, Brands, Orders, Customers, Coupons, Media, Users, Roles, Settings, CmsPages, ThemeTemplates
- Storefront controllers: Home, Product, Category, Brand, CmsPage (catch-all slug)
- Migrations: all tables including `builder_content` columns on cms_pages, product_categories, product_brands
- Seeders: `SuperAdminUserSeeder`, `RoleSeeder`, `PermissionSeeder`, `StorefrontDemoSeeder`

### Frontend ✅
- `usePageBuilder` reducer: ADD · UPDATE_SETTINGS · UPDATE_STYLES · DELETE · DUPLICATE · MOVE · UNDO · REDO · SET_SCHEMA with full immutable tree helpers
- `Editor.tsx`: full drag-and-drop canvas with @dnd-kit (draggable sidebar items + sortable canvas items), overlay preview, device switcher (desktop/tablet/mobile), undo/redo toolbar, revision history modal, left widget palette (categorised), right settings panel, layer tree panel, live save
- 65+ registered widgets across 6 tiers: layout, core content, marketing, commerce, header/footer, product page
- `PageRenderer`: recursive storefront render with `ResponsiveStyles` applied
- `StorefrontLayout`: header + footer powered by theme templates
- All Admin pages: CRUD for every domain object

---

## What Needs to Be Built

This section is the implementation roadmap. Each phase depends on the previous.

---

### Phase A — Builder UX: Full Elementor Parity

**Goal**: The editor canvas must feel identical to Elementor Pro.

#### A1. Left Panel — Widget Search + Categories

**File**: `Pages/Admin/PageBuilder/Editor.tsx`

- Add a text search input above the widget palette that filters widgets by label in real time.
- Persist the open/collapsed state of each category panel in `localStorage`.
- Show a widget drag preview image (the `PreviewComponent` rendered at 64×64) on hover via a tooltip.
- Add a "Favorites" category: right-click any widget → "Add to Favorites" → persists in `localStorage`.

#### A2. Section / Container / Column Controls

**Files**: `widgets/SectionWidget.tsx`, `widgets/ContainerWidget.tsx`, `widgets/ColumnsWidget.tsx`

`SectionWidget` settings panel must expose:
- Column layout presets: 1 / 1-1 / 1-1-1 / 1-2 / 2-1 / 1-1-1-1 (Elementor grid presets)
- Background: color · gradient · image · video · slideshow
- Background overlay (color + opacity)
- Border: type / width / color / radius
- Box shadow controls
- Entrance animation (CSS class injection, see A5)
- Min height, vertical alignment
- HTML tag selector (section / div / article / header / footer)
- Sticky position toggle

`ColumnsWidget` must:
- Render children side-by-side using the `getChildrenContainerStyle` hook
- Expose per-column width via drag handle (resize divider between columns)
- Expose individual column background / padding / border settings via a column-level click target

#### A3. Style Controls Panel

**File**: `Pages/Admin/PageBuilder/Editor.tsx` (StylesPanel section)

Replace the current flat style object inputs with grouped, Elementor-style controls:

**Typography group**:
- Font family (Google Fonts typeahead — preload top 100 from `fonts.googleapis.com` on editor mount)
- Font size with unit selector (px / em / rem / vw)
- Font weight (100–900)
- Line height / letter spacing / word spacing
- Text transform / decoration / direction

**Spacing group**:
- Padding / Margin with linked/unlinked sides (click the chain icon)
- Visual four-box input (top/right/bottom/left), unit selector

**Background group**:
- Color picker (hex + rgba + HSL + eyedropper)
- Gradient (linear / radial with stops)
- Image (upload or Media Library, position, size, repeat, attachment)

**Border group**:
- Border type / width (per-side) / color / radius (per-corner)
- Box shadow: offset-x / offset-y / blur / spread / color / inset

**Effects group**:
- Opacity slider
- CSS filter: blur / brightness / contrast / saturate / hue-rotate
- Blend mode selector
- CSS transform: rotate / scale / translateX / translateY / skew

**Advanced group**:
- CSS ID / CSS classes (added to rendered element)
- Custom CSS textarea (scoped to `#el-{id}` selector, injected via `<style>` in preview)
- Z-index
- Overflow control

All controls write to `ResponsiveStyles` for the active device breakpoint. Values at lower breakpoints inherit from higher breakpoints (desktop → tablet → mobile, same as Elementor).

#### A4. Global Design System

**New file**: `resources/js/pageBuilder/globalStyles.ts`  
**New admin route**: `GET /admin/settings/design-system`  
**New setting keys** in `settings` table: `ds_colors`, `ds_typography`, `ds_spacing`

- **Color Palette**: store up to 20 named swatches in `settings.ds_colors` JSON. Editor color pickers show the palette as quick-picks. Widgets reference palette keys; when a palette color changes, all widgets using it update on re-render.
- **Typography Presets**: Body / H1–H6 / Button / Monospace — stored in `settings.ds_typography`. Each widget's typography panel has a "Use Global" toggle that binds to a preset.
- **Spacing Presets**: Small / Medium / Large / XL — used as quick presets in padding/margin inputs.

#### A5. Entrance Animations

**New file**: `resources/js/pageBuilder/animations.ts`  
**CSS file**: `resources/css/animations.css` (pure CSS, no JS library)

Implement the full Elementor animation library as CSS `@keyframes`:
- Fading: fadeIn, fadeInDown, fadeInLeft, fadeInRight, fadeInUp
- Zooming: zoomIn, zoomInDown, zoomInLeft, zoomInRight, zoomInUp
- Bouncing: bounceIn, bounceInDown, bounceInLeft, bounceInRight, bounceInUp
- Sliding: slideInDown, slideInLeft, slideInRight, slideInUp
- Rotating: rotateIn, rotateInDownLeft, rotateInDownRight, rotateInUpLeft, rotateInUpRight
- Attention: bounce, flash, pulse, rubberBand, shake, swing, tada, wobble, jello, heartBeat
- Specials: lightSpeedIn, rollIn, jackInTheBox

Settings panel: animation selector dropdown · duration (ms) · delay (ms) · repeat count.  
Use Intersection Observer in `PageRenderer.tsx` to trigger `.animated.{name}` classes when element enters viewport (replaces WOW.js / AOS).

#### A6. Navigator (Layer Tree)

The layer tree panel (already has a `ListTree` tab in the editor) needs full implementation:
- Render the full component tree as a collapsible indented list
- Drag-to-reorder in the tree (uses the same `moveComponent` action)
- Click a node to select it (calls `select(id)`)
- Right-click context menu: Duplicate · Delete · Rename (sets `settings.label`) · Copy Style · Paste Style
- Dimmed/eye icon to toggle visibility (adds `settings._hidden: true` — PageRenderer skips hidden components)
- Lock icon: locked components cannot be selected/moved in the canvas (useful for global header rows)

#### A7. Inline Text Editing

**Widgets**: HeadingWidget, TextWidget, ButtonWidget

When the widget is selected and the user double-clicks its text area in the editor canvas, switch to a `contenteditable` div and sync changes back to `settings.text` / `settings.content` on blur. This eliminates the need to open the settings panel for simple text edits — identical to Elementor's inline editing.

#### A8. Copy / Paste Across Pages

Use `navigator.clipboard` to serialize the selected `PageComponent` subtree as JSON and write it to the clipboard. Paste shortcut `Ctrl+V` on the canvas deserializes it with `cloneWithNewIds()` and calls `addComponent`. Show a toast notification "Element pasted".

#### A9. Templates Library Modal

**New API route**: `GET /admin/builder/templates` → returns `PageBuilderTemplate` records  
**New API route**: `POST /admin/builder/templates` → saves current selection as a template

In the editor left panel, add a "Templates" tab (folder icon) alongside the widget palette. Shows:
- "My Templates": user-saved sections/pages
- "Block Templates": pre-built starter blocks (shipped in `StorefrontDemoSeeder`)

Clicking a template inserts its components at the current drop position.

---

### Phase B — WooCommerce Behavioural Parity in Laravel

#### B1. Storefront Cart

**New controller**: `app/Http/Controllers/Storefront/CartController.php`  
**New Inertia page**: `resources/js/Pages/Storefront/Cart.tsx`  
**New route**: `GET /cart`, `POST /cart/add`, `PATCH /cart/items/{id}`, `DELETE /cart/items/{id}`, `DELETE /cart`

Cart behaviour:
- Guest carts stored in session (`cart_session_id`); merged into user cart on login.
- `CartController::add()`: validate product/variation exists, has stock, then `CartService::add()`.
- `CartController::update()`: change quantity or remove line.
- `Cart.tsx`: line items table (image · title · variation · price · qty stepper · remove), order summary sidebar (subtotal · shipping estimate · coupon field · total), "Continue Shopping" + "Proceed to Checkout" buttons.
- Mini-cart drawer: triggered by `HeaderCartWidget`. Shows item count badge. Slides in from right. Uses the same cart state from Inertia shared props.

#### B2. Checkout

**New controller**: `app/Http/Controllers/Storefront/CheckoutController.php`  
**New Inertia pages**: `resources/js/Pages/Storefront/Checkout.tsx`, `resources/js/Pages/Storefront/OrderConfirmation.tsx`  
**New routes**: `GET /checkout`, `POST /checkout`, `GET /order-confirmation/{order:ulid}`

Checkout flow (single-page, sections toggle open/closed like WooCommerce):
1. **Contact** — email · phone (pre-filled for logged-in users)
2. **Shipping Address** — first/last name · company · address lines · city · state · postcode · country. "Same as billing" checkbox.
3. **Billing Address** — shown if different from shipping.
4. **Shipping Method** — radio list from `ShippingZone` + `ShippingZoneMethod` matching the address.
5. **Payment** — radio list of enabled gateways (see B4). Each gateway renders its own React component.
6. **Order Review** — read-only summary, coupon field, place order button.

`CheckoutController::store()` must:
- Validate all fields.
- Calculate totals via `OrderService::calculate()` (subtotal + shipping + tax - discount).
- Create `Order` + `OrderItem` + `OrderAddress` records in a DB transaction.
- Clear the cart.
- Fire `OrderPlaced` event (triggers email, see B6).
- Redirect to order confirmation page.

#### B3. My Account

**New controller**: `app/Http/Controllers/Storefront/AccountController.php`  
**New Inertia pages** under `resources/js/Pages/Storefront/Account/`:
- `Dashboard.tsx` — welcome, recent orders, links to sub-pages
- `Orders.tsx` — paginated order list with status badge
- `OrderView.tsx` — order detail: items, totals, addresses, status timeline
- `Addresses.tsx` — saved billing/shipping addresses CRUD
- `Details.tsx` — name, email, password change form
- `Downloads.tsx` — digital product downloads (future)
- `Wishlist.tsx` — see B5

Routes under `/my-account/*`, all behind `auth` middleware.

#### B4. Payment Gateways

**New directory**: `app/Domain/Payments/Gateways/`  
**Contract**: `app/Domain/Payments/Contracts/PaymentGateway.php`

Use the capability-aware, typed, idempotent gateway contract defined in **Section 10.1**. Redirect gateways, client-intent gateways, asynchronous gateways, COD, and refund-capable gateways may use dedicated typed request/result variants behind that contract. Do not reduce the contract to an untyped `charge(Order, array)` method.

Implement:
- `CodGateway` — Cash on Delivery. No external call; marks order `payment_status = pending`.
- `StripeGateway` — uses Stripe Payment Intents. Settings: `stripe_public_key`, `stripe_secret_key`. React component renders Stripe Elements. Webhook: `POST /webhooks/stripe`.
- `PaypalGateway` — PayPal Orders API v2. Settings: `paypal_client_id`, `paypal_secret`, `paypal_sandbox`. React component renders PayPal Buttons SDK. Webhook: `POST /webhooks/paypal`.
- `BillplzGateway` — Billplz (Malaysian FPX). Settings: `billplz_api_key`, `billplz_collection_id`. Redirect flow. Callback: `POST /webhooks/billplz`. *(Malaysian market requirement based on developer email domain)*
- `ToyyibpayGateway` — toyyibPay FPX. Settings: `toyyibpay_user_secret_key`, `toyyibpay_category_code`. *(Malaysian market)*

Register gateway implementations through explicit service-container bindings or a gateway registry. The Admin Settings page may expose enable/disable and non-secret configuration. Secret editing is permitted only through the approved encrypted-secret service described in the Security section; saved secrets are write-only and never returned to React/Inertia.

#### B5. Wishlist & Compare

**Wishlist**:
- `wishlists` table: `id · user_id · product_id · variation_id · created_at`
- `WishlistController`: `POST /wishlist/toggle · GET /wishlist`
- `HeaderWishlistWidget` shows count badge from Inertia shared props.
- `Account/Wishlist.tsx` shows the wishlist with "Move to Cart" action.

**Compare**:
- Client-side only (localStorage), max 4 products.
- `HeaderCompareWidget` shows count.
- `GET /compare` renders a comparison table: attributes as rows, products as columns.

#### B6. Transactional Emails

**New directory**: `app/Domain/Orders/Mail/`  
**Laravel Mailable classes**: `OrderConfirmedMail`, `OrderShippedMail`, `OrderRefundedMail`, `CustomerRegisteredMail`, `PasswordResetMail`

All emails use Blade + Tailwind inline CSS (use `Maizzle` or a simple `resources/views/mail/` layout).  
Trigger via `OrderPlaced`, `OrderShipped`, `OrderRefunded` events → listeners queued via `ShouldQueue`.  
Admin Settings page: SMTP configuration (host / port / username / password / encryption / from name / from address). Preview email button renders the mailable in a modal.

#### B7. Product Reviews

**New migration**: `product_reviews` table: `id · product_id · user_id · rating (tinyint 1-5) · title · body · is_approved · created_at`  
**New controller**: `app/Http/Controllers/Storefront/ReviewController.php`  
**New route**: `POST /product/{product}/reviews · PATCH /admin/reviews/{review}/approve · DELETE /admin/reviews/{review}`

`ProductRatingWidget` and `ProductTabsInfoWidget` render approved reviews. Admin has a Reviews moderation page.

#### B8. Product Variations & Swatches

`ProductSummaryWidget` must render a variation selector when a product has variations:
- Attribute selects (size, colour, etc.)
- Colour swatch mode: if the attribute has `swatch_type = 'color'`, render colour circles instead of a dropdown.
- Image swatch mode: if `swatch_type = 'image'`, render small images.
- On selection change: update displayed price, stock status, and product image via a React state update (no page reload — data already passed from `ProductController::show()`).

#### B9. Stock & Inventory Admin

**Inventory page**: `GET /admin/inventory` — filterable table of all SKUs with current stock level, reserved, available. Inline +/- adjustment with a note field that creates an `InventoryMovement` record.

Stock alerts: if `stock_quantity <= low_stock_threshold` (product field), send `LowStockMail` to admin (queued).

#### B10. Coupon Enhancements

Current `Coupon` model already exists. Add:
- Usage-per-user limit enforcement at checkout.
- Coupon auto-apply via URL param `?coupon=CODE`.
- BOGO (Buy One Get One) discount type: `type = 'bogo'`, free item auto-added to cart.
- Cart item restrictions: min/max quantity, specific product/category rules.

#### B11. Tax

**New migration**: `tax_rates` table: `id · name · country · state · rate (decimal 5,4) · is_compound · priority`  
**New service**: `app/Domain/Orders/Services/TaxService.php::calculate(Order $order): TaxBreakdown`  
Tax included/excluded display controlled by `Settings::get('tax_display_shop')` (incl / excl / both).

#### B12. Refunds & Order Management

`OrderController::refund()`: creates a `PaymentTransaction` with `type = refund`, calls gateway `refund()` method, updates `Order::refunded_amount`, fires `OrderRefunded` event.  
Admin Order detail page shows a "Refund" button with partial/full refund form.

---

### Phase C — Theme Builder (Elementor Theme Builder Parity)

#### C1. Display Conditions

`ThemeTemplate::conditions` JSON column already exists. Implement the evaluator:

**New service**: `app/Domain/PageBuilder/Services/ConditionResolver.php`

Condition rules (same as Elementor):
- `entire_site` — applies everywhere
- `front_page` — homepage only
- `singular:page:{id}` — specific CMS page
- `singular:product:{id}` — specific product
- `archive:product_category:{id}` — category archive
- `archive:product_brand:{id}` — brand archive
- `404` — not-found page

`StorefrontLayout.tsx` receives `activeHeader` and `activeFooter` (already in Inertia shared props) resolved by `ConditionResolver`. Admin `ThemeTemplates/Index.tsx` has a condition editor UI per template (add/remove rules with an "Include / Exclude" radio).

#### C2. Single Product Template

`ThemeTemplate` with `type = product` can override the product page layout. `ProductController::show()` resolves the matching product template (falling back to the default). The product page widget kit (`ProductGalleryWidget`, `ProductSummaryWidget`, `ProductTabsInfoWidget`, `RelatedProductsWidget`, `AddToCartWidget`, etc.) is the content of this template.

#### C3. Archive / Category Template

`ThemeTemplate` with `type = archive` overrides category / brand listing pages. Must include a **Loop Item** sub-template concept: a nested `ThemeTemplate` with `type = loop_item` that defines a single product card. `ProductGridWidget` settings expose a "Loop Item Template" selector.

#### C4. Dynamic Content Tags

**New system**: `resources/js/pageBuilder/dynamicTags/`

Dynamic tags replace hardcoded text with live data. Elementor calls them "Dynamic Tags". Examples:
- `{product.title}` → current product name
- `{product.price}` → formatted price
- `{product.short_description}` → excerpt
- `{site.name}` → site name from settings
- `{page.title}` → current page title
- `{date}` → formatted today's date

Implementation: `HeadingWidget`, `TextWidget`, `ButtonWidget` settings panels show a "Dynamic" toggle. When active, a tag picker dropdown appears. `PageRenderer` resolves tags via `StorefrontContext`.

#### C5. Sticky Header

`HeaderTopBarWidget` / `HeaderLogoWidget` section `SectionWidget` settings panel exposes a "Sticky" section:
- Enable sticky
- Sticky on scroll up only
- Transparent initial state (hero sections look better)
- Different sticky logo (second logo upload)

Implementation: IntersectionObserver on a sentinel element + CSS class toggle. No layout shifts — header element gets `position: sticky; top: 0` + `z-index` escalation.

---

### Phase D — Performance & Optimization

#### D1. Page Cache

**New middleware**: `app/Http/Middleware/CacheStorefrontPage.php`

Cache rendered Inertia HTML responses for published pages using Laravel Cache (Redis in prod, file in dev):
- Cache key: `page:{url}:{locale}`
- TTL: `Settings::get('page_cache_ttl', 3600)` seconds
- Bypass: any authenticated request, any POST/PATCH/DELETE, `?preview=1` query param
- Bust: on `BuilderService::save(publish: true)` for that page, and on `Product::saved()` / `ProductCategory::saved()` events
- Header `X-Cache: HIT|MISS` for debugging

#### D2. Image Optimisation

**Enhance `MediaService`**:

On `Media` upload:
- Generate WebP version alongside original using PHP `imagecreatefromjpeg` / `imagecreatefrompng` + `imagewebp` (no external dependency). Store as `{basename}-webp.webp`.
- Generate responsive sizes: 320, 640, 960, 1280, 1920 width variants. Store paths in `Media::srcset` JSON column.
- Strip EXIF data.

`ImageWidget` / `ProductImageWidget` / all image renders:
- Use `<picture>` with `<source type="image/webp" srcset="…" sizes="…">` + `<img>` fallback.
- Add `loading="lazy"` to all images except LCP candidates (first image in viewport).
- Add `decoding="async"` to all non-LCP images.
- Inline `width` + `height` attributes to prevent CLS.

#### D3. Critical CSS

On page save/publish, extract critical (above-the-fold) CSS:
- Use a lightweight PHP critical CSS extractor or a queue job that runs Puppeteer via `node` to extract critical CSS.
- Store extracted CSS in `CmsPage::critical_css` (new text column).
- `StorefrontLayout.tsx` inlines `<style>` with critical CSS in `<head>` (passed via Inertia shared props) and loads the full stylesheet async via `<link rel="preload">`.

#### D4. SSR Optimisation

The Vite SSR build (`vite build --ssr`) already produces `bootstrap/ssr/ssr.js`. Ensure:
- `StorefrontContext` hydrates correctly on the client (`useEffect` guards for window-only APIs).
- All `useEffect` calls in widget `PreviewComponent`s check `typeof window !== 'undefined'` before touching the DOM.
- Lazy-import heavy widgets (carousel, maps, video) using `React.lazy + Suspense` so they don't bloat the SSR bundle.

#### D5. Bundle Splitting

`vite.config.js` manual chunks:
```js
manualChunks(id) {
  if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
  if (id.includes('node_modules/@inertiajs')) return 'vendor-inertia';
  if (id.includes('node_modules/@dnd-kit')) return 'vendor-dnd';
  if (id.includes('/Pages/Admin/PageBuilder/')) return 'builder-editor';
  if (id.includes('/pageBuilder/render/')) return 'storefront-renderer';
}

// Keep route-level dynamic imports in resources/js/app.tsx so the admin editor is not
// statically imported into the storefront entry. Confirm the generated manifest/chunks
// after each change instead of assuming the chunk names.
```

The builder editor chunk is only loaded on `/admin/builder/*` routes. The storefront chunk is loaded on all public routes. This prevents admin DnD libraries from reaching storefront visitors.

#### D6. Database Query Optimisation

- All `ProductGrid` and product listing queries must eager-load: `with(['images', 'variations', 'brand', 'categories'])`.
- Add composite indexes: `products(status, created_at)`, `products(brand_id, status)`, `product_categories(parent_id, is_active)`, `orders(user_id, created_at)`.
- Use `cursor()` pagination for large exports; `simplePaginate()` for infinite scroll feeds.
- Cache category tree in Redis / file cache (bust on `ProductCategory::saved()`).

#### D7. Resource Preload Hints

Add resource hints only for stable, hashed production assets and the primary above-the-fold font. Do not hard-code `build/app.js`; resolve Vite manifest entries. Prefer `modulepreload`/`preload` and avoid deprecated HTTP/2 server push. Verify that hints do not preload large admin-only chunks on storefront routes.

#### D8. Sitemap & SEO

**New controller**: `app/Http/Controllers/SitemapController.php`  
**Route**: `GET /sitemap.xml`

Auto-generated sitemap includes: all published CmsPages, all published Products, all active Categories, all active Brands.

**Open Graph / Twitter Card meta** via `HandleInertiaRequests::share()`:
- `meta_title`, `meta_description`, `og_image` passed as Inertia shared props from each storefront controller.
- `StorefrontLayout.tsx` renders `<Head>` with full OG tags.

#### D9. Core Web Vitals Targets

| Metric | Target |
|---|---|
| LCP | < 2.5 s |
| INP | < 200 ms (stretch target: < 100 ms) |
| CLS | < 0.1 |
| TTFB | < 600 ms |

Achieve via: SSR (TTFB), critical CSS (LCP), image dimensions (CLS), no main-thread JS on initial load (FID), sticky prerendering.

---

### Phase E — Advanced Elementor Pro Widgets (Missing)

These widgets exist in the Elementor Pro reference (`reference/elementor-pro/`) but are not yet implemented:

| Widget | Category | Key Settings |
|---|---|---|
| `FormWidget` | form | fields builder, email notifications, reCAPTCHA, conditional fields |
| `PostsWidget` | content | query builder (post type, taxonomy filter, author, date), layout grid/list/carousel |
| `NavMenuWidget` *(extend)* | layout | mega-menu support, dropdowns, mobile hamburger |
| `SearchWidget` | commerce | AJAX live search, results dropdown, post type filter |
| `PopupWidget` | content | trigger (exit intent / scroll / delay / click), display conditions, animation |
| `SlideshowWidget` | content | Ken Burns effect, video slide, custom HTML slide |
| `TimelineWidget` | content | horizontal / vertical, alternating layout |
| `LoginFormWidget` | form | redirect after login, lost password link |
| `RegisterFormWidget` | form | user role assignment, auto-login after register |
| `WooCheckoutWidget` | commerce | renders checkout form (uses B2 checkout controller) |
| `WooCartWidget` | commerce | renders cart table inline on any page |
| `WooProductFilterWidget` | commerce | AJAX filter: price range, attribute checkboxes, rating stars, stock status |
| `WooMiniCartWidget` | commerce | off-canvas cart drawer |
| `WooMyAccountWidget` | commerce | account dashboard widget for embedding in any page |

For each widget, follow the `WidgetDefinition` contract and add the import to `registerAll.ts`.

---

### Phase F — Admin UX Enhancements

#### F1. Products Form (Admin)

`Pages/Admin/Products/Form.tsx` must include:
- Variations builder: attribute selector (e.g. Size + Color) → generates variation matrix → per-variation price / SKU / stock / images table.
- Product gallery: drag-to-reorder image grid, primary image badge.
- Linked products: upsells / cross-sells / grouped product selector (typeahead).
- Downloadable product toggle: file upload + download limit / expiry.
- SEO tab: meta title, meta description, OG image (uses Media Library modal).

#### F2. Order Detail (Admin)

`Pages/Admin/Orders/Show.tsx` must include:
- Full order timeline (status changes, notes, auto-added system events).
- Inline status change dropdown + "Email customer" checkbox.
- Refund section (partial or full, item-level, with reason).
- Shipment tracking: carrier + tracking number → generates a tracking link.
- Print order / invoice as PDF (use `dompdf` via a `PrintController`).

#### F3. Dashboard Analytics

`Pages/Admin/Dashboard.tsx` replace placeholder stats with real data:
- Revenue chart (line graph last 30 days) — pure CSS/SVG, no chart library to keep bundle lean.
- Top products table (by revenue and by units sold).
- Recent orders widget.
- Conversion funnel: sessions → add-to-cart → checkout → paid.
- Low stock alerts list.
- New customers count.

---

## Development Commands

```bash
# Install all dependencies
composer setup

# Start all servers concurrently (Laravel + Queue + Pail + Vite)
composer dev

# Run PHP tests (Pest)
composer test

# Run JS unit tests (Vitest)
npm run test:unit

# Type-check
npx tsc --noEmit

# Lint
npm run lint

# Format
npm run format

# Build production
npm run build

# Static analysis
./vendor/bin/phpstan analyse
```

## Environment

```dotenv
APP_NAME="Visual Commerce"
APP_ENV=local
APP_KEY=          # php artisan key:generate
APP_URL=http://localhost:8000

# Database (dev: SQLite, prod: MySQL)
DB_CONNECTION=sqlite
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_DATABASE=visual_commerce
# DB_USERNAME=root
# DB_PASSWORD=

# Cache / Queue (dev: file/sync, prod: Redis)
CACHE_DRIVER=file
QUEUE_CONNECTION=sync
# CACHE_DRIVER=redis
# QUEUE_CONNECTION=redis
# REDIS_HOST=127.0.0.1

# Mail
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_FROM_ADDRESS=hello@example.com
MAIL_FROM_NAME="${APP_NAME}"

# Stripe
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
PAYPAL_SANDBOX=true

# Billplz (Malaysian FPX)
BILLPLZ_API_KEY=
BILLPLZ_COLLECTION_ID=

# toyyibPay
TOYYIBPAY_USER_SECRET_KEY=
TOYYIBPAY_CATEGORY_CODE=

# Google Fonts API
GOOGLE_FONTS_API_KEY=

# CDN (optional)
CDN_URL=
```

---

## Coding Standards

- PHP: PSR-12 + Laravel Pint. Run `./vendor/bin/pint` before every commit.
- TypeScript: strict mode (`strict: true` in `tsconfig.json`). No `any`. Use `unknown` + type guards.
- React: functional components only. No class components. Hooks follow the Rules of Hooks.
- File naming: PHP `PascalCase.php`, TSX `PascalCase.tsx`, TS utilities `camelCase.ts`.
- Widget files: `{PascalCase}Widget.tsx` — one file per widget. Export `default` the `WidgetDefinition`. No JSX in the definition object body — put components in named functions.
- No inline styles in widget `EditorComponent` / `PreviewComponent` except for dynamic values from `component.styles` / `component.settings`. Static look belongs in Tailwind classes.
- Domain models must not import from `app/Http/` or `resources/`. Services must not import from `app/Http/`. Controllers import from Domain only.
- All DB writes go through a service or repository. Controllers validate, delegate to service, return response.
- Every new route must be covered by a feature test (`tests/Feature/`). Every new service method must have a unit test (`tests/Unit/`).

---

## Security

- All admin routes require `auth` + `verified` middleware. Permissions checked via Policies.
- All form requests use Laravel `FormRequest` with explicit `authorize()` implementing RBAC check.
- File uploads validated by MIME type (server-side) + max size. Images stored in `storage/app/private` and served via signed URLs or `storage:link`.
- Payment secrets are loaded through `config/services.php`. Default policy: keep secrets in environment variables or an approved secret manager. If editable credentials are ever required in the admin UI, store them only through an explicit encrypted-secret service using Laravel encrypted casts; never expose secret values back to the browser after initial save.
- Webhook endpoints verify signature (`Stripe-Signature` header, Billplz X-Signature) before processing.
- Builder `save()` endpoint validates `content` is a valid `PageSchema` shape (schemaVersion integer + components array).
- No raw SQL. Use Eloquent query builder only. Parameterised bindings are guaranteed by the ORM.
- XSS: default text rendering uses React text nodes. HTML mode is restricted to authorised users and must pass an allow-list HTML sanitizer before persistence and again before rendering. Custom CSS must be parsed, reject dangerous constructs such as `@import`, external `url()`, and selector breakout attempts, then be scoped to `#el-{id}`.
- CSRF: all Inertia forms include the CSRF token automatically via `@inertiajs/react` `useForm`. API routes use Sanctum.

---

## Key File Locations

| Concern | Path |
|---|---|
| Widget registry | `resources/js/pageBuilder/registry.ts` |
| Widget barrel | `resources/js/pageBuilder/registerAll.ts` |
| Widget contract | `resources/js/pageBuilder/types.ts` |
| Builder state hook | `resources/js/pageBuilder/usePageBuilder.ts` |
| Storefront renderer | `resources/js/pageBuilder/render/PageRenderer.tsx` |
| Builder editor UI | `resources/js/Pages/Admin/PageBuilder/Editor.tsx` |
| Builder HTTP controller | `app/Http/Controllers/Admin/BuilderController.php` |
| Builder domain service | `app/Domain/PageBuilder/Services/BuilderService.php` |
| Theme template model | `app/Domain/PageBuilder/Models/ThemeTemplate.php` |
| Revision model | `app/Domain/PageBuilder/Models/BuilderRevision.php` |
| HasPageBuilder concern | `app/Domain/PageBuilder/Concerns/HasPageBuilder.php` |
| Admin routes | `routes/admin.php` |
| Storefront routes | `routes/web.php` |
| Inertia shared props | `app/Http/Middleware/HandleInertiaRequests.php` |
| Reference: Elementor Pro | `reference/elementor-pro/` |
| Reference: Woodmart theme | `woodmart/` |

---

## 19. Roadmap Execution Order

Do not implement phases simply by letter when prerequisites are missing. Use this safer dependency order:

1. **Foundation hardening**
   - baseline test suite;
   - builder schema validation/version migrations;
   - money value representation;
   - policy/Form Request consistency;
   - typed Inertia resources;
   - feature flag mechanism.
2. **Builder usability slices**
   - A1, A6, A7, A8;
   - A3 shared style value types;
   - A2 layout controls;
   - A4 design tokens;
   - A5 animations;
   - A9 templates.
3. **Commerce core**
   - B1 cart;
   - inventory reservation foundation from B9;
   - B10 basic coupons;
   - B11 tax foundation;
   - B2 checkout and order placement;
   - B3 account order views.
4. **Payments**
   - COD first as the reference gateway;
   - one redirect/hosted gateway;
   - one client intent gateway;
   - webhooks/reconciliation;
   - refunds.
5. **Theme builder**
   - C1 conditions;
   - C2/C3 templates;
   - C4 dynamic tags;
   - C5 sticky header.
6. **Supporting commerce**
   - reviews, variations/swatches, wishlist/compare, email, advanced coupon rules.
7. **Advanced widgets/admin UX**
   - E and F slices.
8. **Performance**
   - measure first;
   - D2/D4/D5/D6/D8;
   - page cache;
   - critical CSS only after the render pipeline is stable.

### 19.1 Why this order is mandatory

- Checkout must not be built before money and inventory rules are stable.
- External payment gateways must not define the core order state model.
- Global style controls should share value types before many widgets create incompatible formats.
- Page caching must wait until personalisation and invalidation rules are known.
- Critical CSS and SSR optimisation should not obscure functional regressions during rapid builder development.

---

## 20. Recommended First Hardening Tickets

Before asking Claude Code to build large roadmap items, complete these small tickets.

### Ticket H1 — Baseline health report

Deliverables:

- framework/package version inventory;
- route inventory;
- migrations status;
- existing test list and pass/fail status;
- TypeScript/static-analysis status;
- current working tree status;
- architecture mismatches against this document.

No feature code changes.

### Ticket H2 — Builder schema validator

Deliverables:

- server-side validator for `PageSchema`;
- maximum nesting depth and component count;
- type/version/settings/styles/children checks;
- feature tests for valid, invalid, oversized, and malicious payloads;
- no change to existing valid content.

### Ticket H3 — Widget migration registry

Deliverables:

- pure migration runner;
- legacy JSON fixtures;
- unknown widget fallback;
- unit tests;
- no automatic destructive rewrite of stored JSON.

### Ticket H4 — Money and order calculation contract

Deliverables:

- integer minor-unit `Money` value object or confirmed existing equivalent;
- calculation DTO/result with subtotal, discounts, shipping, tax, total;
- rounding rules;
- unit tests;
- no checkout UI yet.

### Ticket H5 — Idempotency infrastructure

Deliverables:

- reusable idempotency record/service;
- request fingerprinting;
- conflict/replay behaviour;
- cleanup policy;
- tests for concurrent duplicate requests.

### Ticket H6 — Inventory reservation service

Deliverables:

- on-hand/reserved/available contract;
- atomic reserve/release/commit operations;
- immutable movement/audit trail;
- concurrent stock test;
- no payment integration yet.

---

## 21. Example Safe Implementation Request

Use requests shaped like this instead of “build all WooCommerce features”:

```md
Implement Phase B1 cart backend only.

Scope:
- Guest session cart and authenticated cart.
- Add, update quantity, remove, clear.
- Product/variation and stock validation.
- Typed cart resource returned through Inertia shared props.
- Merge guest cart on login.
- Feature and unit tests.

Do not implement:
- Checkout UI.
- Coupons.
- Shipping calculation.
- Payment gateways.
- Mini-cart animation.

Safety requirements:
- Preserve existing routes.
- Use server-authoritative prices in minor units.
- Use one transaction for merge.
- Do not reduce stock when adding to cart.
- Run focused tests, PHPStan, Pint check, and report all results.
```

---

## 22. Final Instruction to Claude Code

When uncertain, do not guess and rewrite. Inspect the repository, preserve existing behaviour, choose the smallest reversible change, add a failing test that proves the requirement, implement until it passes, run regression checks, and report exactly what happened.
