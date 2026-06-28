/**
 * Widget migration registry.
 *
 * When a widget's `settings` shape changes, its `WidgetDefinition.version` is
 * incremented and a pure migration is registered here that upgrades a component
 * from one version to the next. `runMigrations` chains these to bring older
 * persisted builder JSON up to each widget's current version at load time.
 *
 * A migration must be:
 *  - pure (no side effects, no Date/Math.random),
 *  - deterministic, and
 *  - idempotent for its target version (running it on already-migrated data,
 *    or running the whole chain twice, must not change the result).
 *
 * It receives a component AT `fromVersion` and returns the equivalent component
 * AT `fromVersion + 1`. It should preserve unknown/unrelated settings.
 */

import type { PageComponent } from '../types';

export type WidgetMigration = (component: PageComponent) => PageComponent;

/** widgetMigrations[type][fromVersion] upgrades a component from fromVersion → fromVersion+1. */
const widgetMigrations: Record<string, Record<number, WidgetMigration>> = {};

export function registerWidgetMigration(
    type: string,
    fromVersion: number,
    migration: WidgetMigration,
): void {
    (widgetMigrations[type] ??= {})[fromVersion] = migration;
}

/** Return the migration that upgrades `type` from `fromVersion`, if any. */
export function getWidgetMigration(type: string, fromVersion: number): WidgetMigration | undefined {
    return widgetMigrations[type]?.[fromVersion];
}

/** Test-only: clear all registered migrations. */
export function _resetWidgetMigrations(): void {
    for (const key of Object.keys(widgetMigrations)) {
        delete widgetMigrations[key];
    }
}
