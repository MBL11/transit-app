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
  console.log('[Migration] 🔍 Checking for routes with colors missing # prefix...');

  try {
    // First, let's see ALL routes to understand what we have
    const allRoutes = await db.getAllAsync<{ id: string; color: string; text_color: string }>(
      'SELECT id, color, text_color FROM routes'
    );
    console.log(`[Migration] Total routes in database: ${allRoutes.length}`);
    allRoutes.forEach(r => {
      console.log(`[Migration]   Route ${r.id}: color="${r.color || 'NULL'}" text_color="${r.text_color || 'NULL'}"`);
    });

    // Get all routes with colors that don't start with #
    const result = await db.getAllAsync<{ id: string; color: string; text_color: string }>(
      `SELECT id, color, text_color FROM routes
       WHERE (color IS NOT NULL AND color != '' AND color NOT LIKE '#%')
          OR (text_color IS NOT NULL AND text_color != '' AND text_color NOT LIKE '#%')`
    );

    if (result.length === 0) {
      console.log('[Migration] ✅ All route colors already have # prefix (or are NULL)');
      return 0;
    }

    console.log(`[Migration] 🔧 Found ${result.length} routes with colors missing # prefix`);

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
  console.log('');
  console.log('========================================');
  console.log('[Migration] 🚀 Running database migrations...');
  console.log('========================================');

  try {
    await fixRouteColors(db);
    console.log('========================================');
    console.log('[Migration] ✅ All migrations completed');
    console.log('========================================');
    console.log('');
  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error);
    // Don't throw - let app continue even if migration fails
  }
}
