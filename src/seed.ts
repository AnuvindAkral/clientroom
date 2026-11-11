import { config } from './config.js';
import { logger } from './lib/logger.js';
import { hashPassword } from './lib/password.js';
import { createUser, findUserByEmail } from './services/users.js';
import { createProject } from './services/projects.js';
import { createItem } from './services/items.js';

/**
 * Creates a labelled sample account when SEED_DEMO=1. Used for the evaluator
 * account. The project name says "Sample" so nothing in it reads as real
 * customer activity.
 */
export async function seedDemo(): Promise<void> {
  if (!config.seedDemo) return;
  if (config.seedPassword.length < 8) {
    logger.warn('seed skipped: SEED_PASSWORD must be at least 8 characters');
    return;
  }
  if (findUserByEmail(config.seedEmail)) {
    return;
  }

  const user = createUser(config.seedEmail, await hashPassword(config.seedPassword));
  const project = createProject(
    user.id,
    'Sample project: Acme brand refresh',
    'Sample project for evaluation. Everything here can be edited or removed.',
  );

  const today = new Date();
  const day = (offset: number) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };

  createItem(user.id, project.id, { title: 'Logo', status: 'done', dueDate: day(-6) });
  createItem(user.id, project.id, { title: 'Brand guide', status: 'in_progress', dueDate: day(4) });
  createItem(user.id, project.id, { title: 'Social kit', status: 'not_started', dueDate: day(11) });
  createItem(user.id, project.id, { title: 'Print pack', status: 'blocked', dueDate: day(2) });

  logger.info('demo account seeded', { email: config.seedEmail });
}
