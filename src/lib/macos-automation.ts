/**
 * macOS Native App Automation
 *
 * Provides access to native macOS applications via JXA (JavaScript for Automation)
 * and macOS Accessibility API. Enables air-cli to control Mail, Calendar, Finder,
 * and other native apps alongside web browser automation.
 */

import { execSync } from 'child_process';

import { run } from '@jxa/run';

export interface MailMessage {
  id: string
  subject: string
  from: string
  date: Date
  content: string
  read: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  startDate: Date
  endDate: Date
  location?: string
  notes?: string
}

export interface FinderItem {
  name: string
  path: string
  kind: string
  size: number
  created: Date
  modified: Date
}

/**
 * macOS Native Application Automation Service
 */
export class MacOSAutomation {
  /**
   * Get unread messages from Mail.app inbox
   */
  async getMailInbox(): Promise<MailMessage[]> {
    try {
      const messages = await run(() => {
        const Mail = Application('Mail');
        const unread = Mail.inbox.messages.whose({ readStatus: false });

        return unread().map((msg: any) => ({
          id: msg.id(),
          subject: msg.subject(),
          from: msg.sender(),
          date: msg.dateReceived(),
          content: msg.content(),
          read: msg.readStatus()
        }));
      });

      return messages as MailMessage[];
    } catch (error: any) {
      throw new Error(`Failed to access Mail.app: ${error.message}`);
    }
  }

  /**
   * Get all messages from Mail.app inbox (read and unread)
   */
  async getAllMailMessages(): Promise<MailMessage[]> {
    try {
      const messages = await run(() => {
        const Mail = Application('Mail');
        const allMessages = Mail.inbox.messages;

        return allMessages().map((msg: any) => ({
          id: msg.id(),
          subject: msg.subject(),
          from: msg.sender(),
          date: msg.dateReceived(),
          content: msg.content(),
          read: msg.readStatus()
        }));
      });

      return messages as MailMessage[];
    } catch (error: any) {
      throw new Error(`Failed to access Mail.app: ${error.message}`);
    }
  }

  /**
   * Get today's calendar events from Calendar.app
   */
  async getTodayCalendarEvents(): Promise<CalendarEvent[]> {
    try {
      const events = await run(() => {
        const Calendar = Application('Calendar');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get all calendars' events for today
        const allEvents: any[] = [];
        const calendars = Calendar.calendars();

        for (let i = 0; i < calendars.length; i++) {
          const cal = calendars[i];
          const events = cal.events();

          for (let j = 0; j < events.length; j++) {
            const evt = events[j];
            const startDate = evt.startDate();

            // Check if event is today
            if (startDate >= today && startDate < tomorrow) {
              allEvents.push({
                id: evt.id(),
                title: evt.summary(),
                startDate: evt.startDate(),
                endDate: evt.endDate(),
                location: evt.location ? evt.location() : '',
                notes: evt.description ? evt.description() : ''
              });
            }
          }
        }

        return allEvents;
      });

      return events as CalendarEvent[];
    } catch (error: any) {
      throw new Error(`Failed to access Calendar.app: ${error.message}`);
    }
  }

  /**
   * Get all calendar events from Calendar.app
   */
  async getAllCalendarEvents(): Promise<CalendarEvent[]> {
    try {
      const events = await run(() => {
        const Calendar = Application('Calendar');
        const allEvents = Calendar.defaultCalendar.events;

        return allEvents().map((evt: any) => ({
          id: evt.id(),
          title: evt.summary(),
          startDate: evt.startDate(),
          endDate: evt.endDate(),
          location: evt.location(),
          notes: evt.description()
        }));
      });

      return events as CalendarEvent[];
    } catch (error: any) {
      throw new Error(`Failed to access Calendar.app: ${error.message}`);
    }
  }

  /**
   * List files in a Finder directory
   */
  async listFinderDirectory(path: string): Promise<FinderItem[]> {
    try {
      const items = await run(
        (dirPath: string) => {
          const Finder = Application('Finder');
          const folder = Finder.folders.byName(dirPath);
          const files = folder.items;

          return files().map((item: any) => ({
            name: item.name(),
            path: item.posixPath ? item.posixPath() : dirPath + '/' + item.name(),
            kind: item.kind(),
            size: item.size(),
            created: item.creationDate(),
            modified: item.modificationDate()
          }));
        },
        path
      );

      return items as FinderItem[];
    } catch (error: any) {
      throw new Error(`Failed to access Finder: ${error.message}`);
    }
  }

  /**
   * Get UI element tree for any app using System Events
   * Useful for apps that don't have good AppleScript dictionaries
   */
  async getUITree(appName: string): Promise<any> {
    try {
      const script = `
      const app = Application('System Events').processes['${appName}'];

      if (!app.exists()) {
        throw new Error('Application ${appName} is not running');
      }

      const window = app.windows[0];

      function getElements(el) {
        try {
          return {
            role: el.role(),
            title: el.title ? el.title() : '',
            description: el.description ? el.description() : '',
            value: el.value ? el.value() : null,
            children: el.uiElements ? el.uiElements().map(getElements) : []
          };
        } catch (e) {
          return null;
        }
      }

      getElements(window);
      `;

      const result = execSync(`osascript -l JavaScript -e '${script}'`).toString();
      return JSON.parse(result);
    } catch (error: any) {
      throw new Error(`Failed to get UI tree for ${appName}: ${error.message}`);
    }
  }

  /**
   * Check if an application is running
   */
  async isAppRunning(appName: string): Promise<boolean> {
    try {
      const isRunning = await run(
        (name: string) => {
          const SysEvents = Application('System Events');
          return SysEvents.processes.whose({ name: name }).length > 0;
        },
        appName
      );

      return isRunning as boolean;
    } catch {
      return false;
    }
  }

  /**
   * Launch an application
   */
  async launchApp(appName: string): Promise<void> {
    try {
      await run((name: string) => {
        const app = Application(name);
        app.launch();
      }, appName);
    } catch (error: any) {
      throw new Error(`Failed to launch ${appName}: ${error.message}`);
    }
  }

  /**
   * Quit an application
   */
  async quitApp(appName: string): Promise<void> {
    try {
      await run((name: string) => {
        const app = Application(name);
        app.quit();
      }, appName);
    } catch (error: any) {
      throw new Error(`Failed to quit ${appName}: ${error.message}`);
    }
  }
}

// Export singleton instance
export const macOSAutomation = new MacOSAutomation();
