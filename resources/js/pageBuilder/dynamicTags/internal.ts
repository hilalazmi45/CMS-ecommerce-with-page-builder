/**
 * Internal module — exposes the tag map to `resolveTags` without making it
 * part of the public API surface of the dynamicTags package.
 *
 * Do not import this from widget code; use the public `registry.ts` API.
 */

import type { DynamicTag } from './types';

// Shared mutable map — populated by registry.ts on module load.
export const tagMap = new Map<string, DynamicTag>();
