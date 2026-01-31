/**
 * Database Migration Utilities
 * Handles automatic fixes and updates to existing data
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { logger } from '../utils/logger';

/**
 * Fix route colors that are missing the # prefix
 * This handles data imported before the parser normalization was added
 */
export async function fixRouteColors(db: SQLiteDatabase): Promise<number> {
  try {
    // Get all routes with colors that don't start with #
    const result = await db.getAllAsync<{ id: string; color: string; text_color: string }>(
      `SELECT id, color, text_color FROM routes
       WHERE (color IS NOT NULL AND color != '' AND color NOT LIKE '#%')
          OR (text_color IS NOT NULL AND text_color != '' AND text_color NOT LIKE '#%')`
    );

    if (result.length === 0) {
      return 0;
    }

    logger.log(`[Migration] Fixing ${result.length} route colors...`);

    // Fix each route
    let fixedCount = 0;
    for (const route of result) {
      const newColor = route.color && !route.color.startsWith('#')
        ? '#' + route.color
        : route.color;

      const newTextColor = route.text_color && !route.text_color.startsWith('#')
        ? '#' + route.text_color
        : route.text_color;

      await db.runAsync(
        'UPDATE routes SET color = ?, text_color = ? WHERE id = ?',
        [newColor, newTextColor, route.id]
      );

      fixedCount++;
    }

    logger.log(`[Migration] ✅ Fixed ${fixedCount} route colors`);
    return fixedCount;
  } catch (error) {
    logger.error('[Migration] ❌ Error fixing route colors:', error);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  try {
    await fixRouteColors(db);
  } catch (error) {
    logger.error('[Migration] ❌ Migration failed:', error);
    // Don't throw - let app continue even if migration fails
  }
}
