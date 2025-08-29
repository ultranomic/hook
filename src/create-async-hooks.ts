import { createBaseHooks } from './create-base-hooks.ts';
import type { Logger } from './logger.ts';

/**
 * Creates an asynchronous hook registry for managing ordered async actions.
 * Actions within the same order execute in parallel, but orders execute sequentially.
 * @template THooks - Record type where keys are hook names and values are argument tuples
 * @param options - Configuration options
 * @param options.logger - Optional logger instance for debugging and error reporting
 * @returns Async hook registry with methods for registration, firing, and management
 */
export const createAsyncHooks = <THooks extends Record<string, unknown[]>>(options?: { logger?: Logger }) => {
  const base = createBaseHooks<THooks>(options);

  /**
   * Fires all registered actions for a hook asynchronously.
   * Actions are executed in order batches - each batch runs in parallel, batches run sequentially.
   * Execution stops immediately if any action throws an error (fast-fail).
   * @template T - Hook name type constrained to keys of THooks
   * @param hookName - Name of the hook to fire
   * @param payload - Arguments to pass to the hook actions
   * @returns Promise that resolves when all actions complete successfully
   * @throws Error from the first failing action
   */
  const fire = async <T extends keyof THooks & string>(hookName: T, ...payload: THooks[T]) => {
    const actionsBatch = base.getActionsBatch(hookName);
    const logger = base.getLogger();
    for (const actions of actionsBatch) {
      logger?.debug(
        `Fired hook ${hookName} with actions: ${actions.map((action) => action.name || 'anonymous').join(', ')}`,
      );

      try {
        await Promise.all(actions.map((action) => Promise.try(action, ...payload)));
      } catch (error) {
        logger?.error(
          { error },
          `Hook action '${actions.map((action) => action.name || 'anonymous').join(', ')}' for '${hookName}' failed`,
        );

        throw error;
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
