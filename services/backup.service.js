const path = require("path");
const FILE = path.basename(__filename).split(".js")[0].toUpperCase();
const fs = require("fs").promises;
const { existsSync } = require("fs");

const eventService = require("./event.service");

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  autoBackup,
  scheduleAutoBackup,
};

/**
 * Create a timestamped backup of current data
 */
async function createBackup(description = "") {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = BACKUP_DIR;

    // Create backups directory if it doesn't exist
    if (!existsSync(backupDir)) {
      await fs.mkdir(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `backup_${timestamp}.json`);

    const backupData = {
      timestamp: new Date().toISOString(),
      description,
      version: "1.0",
      data: {
        events: await eventService.getAllEvents(),
      },
    };

    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2), "utf8");

    logger.info(`[${FILE}] Backup created successfully: ${backupFile}`);
    return { success: true, file: backupFile, timestamp };
  } catch (error) {
    logger.error(`[${FILE}] Failed to create backup: ${error.message}`);
    throw error;
  }
}

/**
 * Restore data from a backup file
 */
async function restoreBackup(backupFile) {
  try {
    const backupPath = path.join(BACKUP_DIR, backupFile);

    if (!existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    const backupData = JSON.parse(await fs.readFile(backupPath, "utf8"));

    // Validate backup structure
    if (!backupData.data || !backupData.data.events) {
      throw new Error("Invalid backup file structure");
    }

    // Create a backup before restoring
    await createBackup(`Before restore from ${backupFile}`);

    // Restore events
    await eventService.loadFromArray(backupData.data.events);

    logger.info(`[${FILE}] Successfully restored from backup: ${backupFile}`);
    return { success: true, restored: backupData.timestamp };
  } catch (error) {
    logger.error(`[${FILE}] Failed to restore backup: ${error.message}`);
    throw error;
  }
}

/**
 * List available backup files
 */
async function listBackups() {
  try {
    const backupDir = BACKUP_DIR;

    if (!existsSync(backupDir)) {
      return [];
    }

    const files = await fs.readdir(backupDir);
    const backups = [];

    for (const file of files.filter((f) => f.endsWith(".json"))) {
      try {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        const content = JSON.parse(await fs.readFile(filePath, "utf8"));

        backups.push({
          filename: file,
          timestamp: content.timestamp,
          description: content.description || "",
          size: stats.size,
          eventCount: content.data?.events?.length || 0,
        });
      } catch (error) {
        logger.warn(`[${FILE}] Skipping invalid backup file: ${file}`);
      }
    }

    return backups.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  } catch (error) {
    logger.error(`[${FILE}] Failed to list backups: ${error.message}`);
    throw error;
  }
}

/**
 * Create automatic backup
 */
async function autoBackup() {
  try {
    const result = await createBackup("Automatic backup");

    // Clean up old backups (keep last 10)
    const backups = await listBackups();
    if (backups.length > 10) {
      const toDelete = backups.slice(10);
      for (const backup of toDelete) {
        try {
          await fs.unlink(path.join(BACKUP_DIR, backup.filename));
          logger.info(`[${FILE}] Deleted old backup: ${backup.filename}`);
        } catch (error) {
          logger.warn(
            `[${FILE}] Failed to delete old backup: ${backup.filename}`
          );
        }
      }
    }

    return result;
  } catch (error) {
    logger.error(`[${FILE}] Auto backup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Schedule automatic backups
 */
function scheduleAutoBackup() {
  // Create backup every 6 hours
  setInterval(async () => {
    try {
      await autoBackup();
    } catch (error) {
      logger.error(`[${FILE}] Scheduled backup failed: ${error.message}`);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours

  logger.info(`[${FILE}] Automatic backup scheduled every 6 hours`);
}
