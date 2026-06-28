import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import '@/pageBuilder/registerAll';
import { runMigrations } from './runMigrations';
import { registerWidgetMigration, _resetWidgetMigrations } from './registry';
import type { PageComponent, PageSchema } from '@/pageBuilder/types';

function loadFixture(name: string): PageSchema {
    const path = resolve(process.cwd(), 'resources/js/pageBuilder/migrations/__fixtures__', name);
    return JSON.parse(readFileSync(path, 'utf-8')) as PageSchema;
}

function component(overrides: Partial<PageComponent> = {}): PageComponent {
    return {
        id: 'c1',
        type: 'heading',
        version: 1,
        settings: {},
        styles: {},
        ...overrides,
    };
}

afterEach(() => {
    _resetWidgetMigrations();
});

describe('runMigrations', () => {
    it('is a no-op for an already-current schema (does not corrupt valid data)', () => {
        const fixture = loadFixture('current-heading-schema.json');

        expect(runMigrations(fixture)).toEqual(fixture);
    });

    it('is idempotent — running twice equals running once', () => {
        const fixture = loadFixture('current-heading-schema.json');

        const once = runMigrations(fixture);
        const twice = runMigrations(once);

        expect(twice).toEqual(once);
    });

    it('passes unknown widget types through unchanged', () => {
        const schema: PageSchema = {
            schemaVersion: 1,
            components: [component({ id: 'x', type: 'no-such-widget', version: 3, settings: { keep: 'me' } })],
        };

        const result = runMigrations(schema);

        expect(result.components[0]).toEqual(schema.components[0]);
    });

    it('upgrades a component to its widget version, preserving unrelated settings', () => {
        // 'heading' is registered at version 1; simulate legacy data at version 0.
        registerWidgetMigration('heading', 0, (c) => ({
            ...c,
            version: 1,
            settings: { ...c.settings, migrated: true },
        }));

        const schema: PageSchema = {
            schemaVersion: 1,
            components: [component({ version: 0, settings: { text: 'Hi', existing: 'value' } })],
        };

        const result = runMigrations(schema);
        const upgraded = result.components[0]!;

        expect(upgraded.version).toBe(1);
        expect(upgraded.settings).toMatchObject({ text: 'Hi', existing: 'value', migrated: true });
    });

    it('migrates nested children', () => {
        registerWidgetMigration('text', 0, (c) => ({ ...c, version: 1, settings: { ...c.settings, touched: true } }));

        const schema: PageSchema = {
            schemaVersion: 1,
            components: [
                component({
                    id: 'sec',
                    type: 'section',
                    version: 1,
                    children: [component({ id: 'kid', type: 'text', version: 0, settings: { content: 'x' } })],
                }),
            ],
        };

        const result = runMigrations(schema);
        const child = result.components[0]!.children![0]!;

        expect(child.version).toBe(1);
        expect(child.settings).toMatchObject({ content: 'x', touched: true });
    });

    it('still advances and terminates when a migration forgets to bump the version', () => {
        // Migration returns the component without changing version; runner must
        // force forward progress to the widget target version and not loop forever.
        registerWidgetMigration('heading', 0, (c) => ({ ...c, settings: { ...c.settings, ran: true } }));

        const schema: PageSchema = {
            schemaVersion: 1,
            components: [component({ version: 0 })],
        };

        const result = runMigrations(schema);

        expect(result.components[0]!.version).toBe(1);
        expect(result.components[0]!.settings).toMatchObject({ ran: true });
    });
});
