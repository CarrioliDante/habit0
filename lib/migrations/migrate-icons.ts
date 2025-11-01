/**
 * Migration script: emoji → lucide icons
 *
 * Migrates all habit icons from emoji format to lucide-react icon names.
 * Includes dry-run mode for safe testing.
 *
 * Usage:
 *   pnpm tsx lib/migrations/migrate-icons.ts [--dry-run]
 */

import { db } from "@/lib/db";
import { habits } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Emoji to lucide-react icon mapping
 * Covers common habit emojis
 */
const EMOJI_TO_LUCIDE: Record<string, string> = {
  "💪": "Dumbbell",
  "🏃": "PersonStanding",
  "🏃‍♂️": "PersonStanding",
  "🏃‍♀️": "PersonStanding",
  "📚": "Book",
  "📖": "BookOpen",
  "✍️": "Pencil",
  "🎯": "Target",
  "🧘": "CircleDot",
  "🧘‍♂️": "CircleDot",
  "🧘‍♀️": "CircleDot",
  "💧": "Droplet",
  "🥗": "Apple",
  "🍎": "Apple",
  "☕": "Coffee",
  "🍵": "Coffee",
  "💊": "Pill",
  "😴": "Moon",
  "🌙": "Moon",
  "☀️": "Sun",
  "🎨": "Palette",
  "🎵": "Music",
  "🎸": "Music",
  "🎹": "Music",
  "💼": "Briefcase",
  "📝": "FileText",
  "📋": "ClipboardList",
  "🏠": "Home",
  "🧹": "Sparkles",
  "🌱": "Sprout",
  "🔥": "Flame",
  "⭐": "Star",
  "✨": "Sparkles",
  "❤️": "Heart",
  "💛": "Heart",
  "💚": "Heart",
  "💙": "Heart",
  "💜": "Heart",
  "🧠": "Brain",
  "👨‍💻": "Code",
  "👩‍💻": "Code",
  "💻": "Laptop",
  "🎓": "GraduationCap",
  "🔔": "Bell",
  "📱": "Smartphone",
  "✅": "CheckCircle",
};

/**
 * Normalize icon value: emoji → lucide name
 * Falls back to "Circle" if no mapping found
 */
function normalizeIconValue(icon: string): string {
  if (!icon || icon.trim() === "") return "Circle";

  // Already a lucide icon name (starts with capital letter)
  if (/^[A-Z][a-zA-Z]*$/.test(icon.trim())) {
    return icon.trim();
  }

  // Map emoji to lucide
  const lucideName = EMOJI_TO_LUCIDE[icon.trim()];
  if (lucideName) return lucideName;

  // Default fallback
  console.warn(`No mapping found for icon: "${icon}" - using Circle`);
  return "Circle";
}

async function migrateIcons(dryRun: boolean = false) {
  console.log(`\n🔄 Starting icon migration${dryRun ? " (DRY RUN)" : ""}...\n`);

  try {
    // Fetch all habits
    const allHabits = await db.select().from(habits);
    console.log(`📊 Found ${allHabits.length} habits\n`);

    if (allHabits.length === 0) {
      console.log("✅ No habits to migrate");
      return;
    }

    let migratedCount = 0;
    let unchangedCount = 0;
    const updates: Array<{ id: number; oldIcon: string; newIcon: string }> = [];

    // Check which habits need migration
    for (const habit of allHabits) {
      const currentIcon = habit.icon || "Circle";
      const newIcon = normalizeIconValue(currentIcon);

      if (currentIcon !== newIcon) {
        updates.push({ id: habit.id, oldIcon: currentIcon, newIcon });
        console.log(`  ${habit.title}`);
        console.log(`    ${currentIcon} → ${newIcon}`);
        migratedCount++;
      } else {
        unchangedCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`  - To migrate: ${migratedCount}`);
    console.log(`  - Unchanged: ${unchangedCount}`);

    if (migratedCount === 0) {
      console.log("\n✅ All habits already have lucide icons!");
      return;
    }

    if (dryRun) {
      console.log("\n🔍 DRY RUN - No changes made to database");
      console.log("   Run without --dry-run to apply changes");
      return;
    }

    // Apply updates
    console.log("\n⚙️  Applying updates...");
    for (const { id, newIcon } of updates) {
      await db.update(habits).set({ icon: newIcon }).where(eq(habits.id, id));
    }

    console.log(`\n✅ Migration complete! Updated ${migratedCount} habits\n`);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  const isDryRun = process.argv.includes("--dry-run");

  migrateIcons(isDryRun)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export { migrateIcons, normalizeIconValue };
