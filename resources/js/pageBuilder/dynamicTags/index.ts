/**
 * pageBuilder/dynamicTags — public API barrel.
 *
 * Widget code should import from this barrel, not from individual internal files.
 *
 * Usage in a widget Preview component:
 *
 *   import { useDynamicTagContext, resolveTags } from '@/pageBuilder/dynamicTags';
 *
 *   function Preview({ component }: WidgetPreviewProps) {
 *     const ctx = useDynamicTagContext();
 *     const text = resolveTags(component.settings.text as string, ctx);
 *     return <h2>{text}</h2>;
 *   }
 */

// Ensure built-in tags are registered on first import of this barrel.
import './registry';

export { resolveTags, hasTags } from './resolveTags';
export { getAllTags, getTagsByCategory, registerTag } from './registry';
export { useDynamicTagContext } from './useDynamicTagContext';
export type { DynamicTag, DynamicTagContext } from './types';
