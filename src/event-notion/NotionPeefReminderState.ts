import fs from 'fs';
import Logger from '../utils/Logger';

const DEFAULT_PEEF_REMINDER_STATE_PATH = 'peefReminderState.json';

export interface PeefReminderMilestones {
  postEventReminderSentAt?: string;
  preDeadlineReminderSentAt?: string;
  completionAlertSentAt?: string;
  wasPeefWritten?: boolean;
}

type PeefReminderState = Record<string, PeefReminderMilestones>;

/**
 * Handles persistence and retrieval of PEEF reminder milestones.
 *
 * This class stores per-event reminder state on disk so cron-based checks are idempotent
 * across process restarts. Each event is keyed by its Notion page ID and tracks whether
 * post-event reminders, pre-deadline reminders, and completion alerts were already sent.
 */
export default class NotionPeefReminderState {
  private state: PeefReminderState;

  constructor(private readonly filePath = DEFAULT_PEEF_REMINDER_STATE_PATH) {
    this.state = this.load();
  }

  /**
   * Returns stored milestones for a Notion event.
   *
   * @param eventId Notion page ID for the hosted event.
   * @returns Persisted milestone data, or an empty object if this event has never been seen.
   */
  public get(eventId: string): PeefReminderMilestones {
    return { ...(this.state[eventId] || {}) };
  }

  /**
   * Persists milestones for a Notion event immediately.
   *
   * This method performs a no-op when data is unchanged, which helps avoid unnecessary
   * filesystem writes on every cron run.
   *
   * @param eventId Notion page ID for the hosted event.
   * @param milestones Updated milestone values to persist.
   */
  public set(eventId: string, milestones: PeefReminderMilestones): void {
    const existingMilestones = this.state[eventId];
    if (JSON.stringify(existingMilestones || {}) === JSON.stringify(milestones || {})) {
      return;
    }

    this.state[eventId] = { ...milestones };

    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
    } catch (err) {
      Logger.error(`Error saving PEEF reminder state: ${err}`);
    }
  }

  /**
   * Loads the persisted reminder state file from disk.
   *
   * If the file does not exist yet, an empty JSON object is initialized to establish
   * a valid baseline for subsequent reads and writes.
   */
  private load(): PeefReminderState {
    try {
      if (!fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, '{}');
        return {};
      }

      const contents = fs.readFileSync(this.filePath, { encoding: 'utf-8' }).trim();
      if (contents === '') {
        return {};
      }

      return JSON.parse(contents) as PeefReminderState;
    } catch (err) {
      Logger.error(`Error loading PEEF reminder state, using empty state: ${err}`);
      return {};
    }
  }
}
