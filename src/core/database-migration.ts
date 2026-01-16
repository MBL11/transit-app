/**
 * Database Migration Utilities
 * Handles automatic fixes and updates to existing data
 */

import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Fix route colors that are missing the # prefix
 * This handles data imported before the parser normalization was added
 */
export async function fixRouteColors(db: SQLiteDatabase): Promise<number> {
  console.log('[Migration] Checking for routes with colors missing # prefix...');

  try {
    // Get all routes with colors that don't start with #
    const result = await db.getAllAsync<{ id: string; color: string; textColor: string }>(
      `SELECT id, color, textColor FROM routes
       WHERE (color IS NOT NULL AND color != '' AND color NOT LIKE '#%')
          OR (textColor IS NOT NULL AND textColor != '' AND textColor NOT LIKE '#%')`
    );

    if (result.length === 0) {
      console.log('[Migration] ✅ All route colors already have # prefix');
      return 0;
    }

    console.log(`[Migration] Found ${result.length} routes with colors missing # prefix`);

    // Fix each route
    let fixedCount = 0;
    for (const route of result) {
      const newColor = route.color && !route.color.startsWith('#')
        ? '#' + route.color
        : route.color;

      const newTextColor = route.textColor && !route.textColor.startsWith('#')
        ? '#' + route.textColor
        : route.textColor;

      await db.runAsync(
        'UPDATE routes SET color = ?, textColor = ? WHERE id = ?',
        [newColor, newTextColor, route.id]
      );

      console.log(`[Migration] Fixed route ${route.id}: ${route.color} → ${newColor}`);
      fixedCount++;
    }

    console.log(`[Migration] ✅ Fixed ${fixedCount} route colors`);
    return fixedCount;
  } catch (error) {
    console.error('[Migration] ❌ Error fixing route colors:', error);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  console.log('[Migration] Running database migrations...');

  try {
    await fixRouteColors(db);
    console.log('[Migration] ✅ All migrations completed');
  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error);
    // Don't throw - let app continue even if migration fails
  }
}
