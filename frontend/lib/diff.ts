/**
 * @file diff.ts
 * @description Logic for text diffing using diff-match-patch
 * @module frontend/lib
 */

import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from 'diff-match-patch';

export interface DiffPart {
    type: 'added' | 'removed' | 'equal';
    value: string;
}

/**
 * Computes the difference between two strings and returns an array of typed parts.
 */
export function computeDiff(original: string, revised: string): DiffPart[] {
    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(original, revised);
    dmp.diff_cleanupSemantic(diffs);

    return diffs.map(([type, value]) => ({
        type: type === DIFF_INSERT ? 'added' : type === DIFF_DELETE ? 'removed' : 'equal',
        value
    }));
}
