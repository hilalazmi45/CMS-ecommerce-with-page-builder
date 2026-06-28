/**
 * Migration runner.
 *
 * Walks a PageSchema and upgrades every component to its widget definition's
 * current `version` by chaining the registered per-version migrations. This is
 * a *normalisation* step run when content is loaded into the editor or the
 * storefront renderer — it does not mutate the server response in place and the
 * upgraded schema is only persisted on the next user save.
 *
 * Guarantees:
 *  - Pure & deterministic (no I/O, no Date/Math.random).
 *  - Idempotent: running it again on its own output returns deep-equal data.
 *  - Unknown widget types pass through untouched (PageRenderer renders a safe
 *    placeholder for them; their raw settings are preserved for recovery).
 */

import { getWidget } from '../registry';
import { getWidgetMigration } from './registry';
import type { PageComponent, PageSchema } from '../types';

/** Safety bound: never apply more than this many migrations to one component. */
const MAX_MIGRATION_STEPS = 100;

function migrateComponent(component: PageComponent): PageComponent {
    let current = component;

    const def = getWidget(current.type);

    // Only migrate widgets we recognise; unknown widgets are preserved as-is.
    if (def) {
        const target = def.version;
        let steps = 0;
        let migration = getWidgetMigration(current.type, current.version);

        while (current.version < target && migration && steps < MAX_MIGRATION_STEPS) {
            const next = migration(current);

            // Guarantee forward progress even if a migration forgets to bump version.
            const nextVersion = next.version > current.version ? next.version : current.version + 1;
            current = { ...next, version: nextVersion };

            steps++;
            migration = getWidgetMigration(current.type, current.version);
        }
    }

    // Recurse into children regardless of whether this node had a migration.
    if (current.children && current.children.length > 0) {
        current = { ...current, children: current.children.map(migrateComponent) };
    }

    return current;
}

export function runMigrations(schema: PageSchema): PageSchema {
    if (!schema?.components?.length) {
        return schema;
    }

    return { ...schema, components: schema.components.map(migrateComponent) };
}
