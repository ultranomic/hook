import { createBaseHooks } from './create-base-hooks.ts';
import type { Logger } from './logger.ts';

/**
 * Creates a synchronous hook registry for managing ordered sync actions.
 * Actions execute sequentially within each order, and orders execute sequentially.
 * @template THooks - Record type where keys are hook names and values are argument tuples
 * @param options - Configuration options
 * @param options.logger - Optional logger instance for debugging and error reporting
 * @returns Sync hook registry with methods for registration, firing, and management
 */
export const createSyncHooks = <THooks extends Record<string, unknown[]>>(options?: { logger?: Logger }) => {
  const base = createBaseHooks<THooks>(options);

  /**
   * Fires all registered actions for a hook synchronously.
   * Actions execute sequentially within each order batch, and order batches execute sequentially.
   * Execution stops immediately if any action throws an error (fast-fail).
   * @template T - Hook name type constrained to keys of THooks
   * @param hookName - Name of the hook to fire
   * @param payload - Arguments to pass to the hook actions
   * @throws Error from the first failing action
   */
  const fire = <T extends keyof THooks & string>(hookName: T, ...payload: THooks[T]) => {
    const actionsBatch = base.getActionsBatch(hookName);
    const logger = base.getLogger();
    for (const actions of actionsBatch) {
      logger?.debug(
        `Fired hook ${hookName} with actions: ${actions.map((action) => action.name || 'anonymous').join(', ')}`,
      );

      for (const action of actions) {
        try {
          action(...payload);
        } catch (error) {
          const actionName = action.name || 'anonymous';
          logger?.error({ error }, `Hook action '${actionName}' for '${hookName}' failed`);
          throw error;
        }
      }
    }
  };

  return {
    fire,
    register: base.register,
    clear: base.clear,
    setLogger: base.setLogger,
  };
};
