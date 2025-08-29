import type { Logger } from './logger.ts';

/**
 * Creates a base hook registry with core functionality for managing hook actions.
 * This is used internally by createAsyncHooks and createSyncHooks.
 * @template THooks - Record type where keys are hook names and values are argument tuples
 * @param options - Configuration options
 * @param options.logger - Optional logger instance for debugging and error reporting
 * @returns Base hook registry with core methods
 */
export const createBaseHooks = <THooks extends Record<string, unknown[]>>(options?: { logger?: Logger }) => {
  const hooks = new Map<string, Map<number, ((...args: any[]) => unknown)[]>>();
  let logger = options?.logger;

  /**
   * Gets all action batches for a hook, sorted by execution order.
   * @template T - Hook name type constrained to keys of THooks
   * @param hookName - Name of the hook to get actions for
   * @returns Array of action arrays, sorted by order (lower numbers first)
   */
  const getActionsBatch = <T extends keyof THooks & string>(hookName: T) => {
    const actionMap = hooks.get(hookName);
    if (!actionMap) return [];

    return actionMap
      .entries()
      .toArray()
      .toSorted(([orderA], [orderB]) => Number(orderA) - Number(orderB))
      .map(([_, actions]) => actions);
  };

  /**
   * Registers an action for a specific hook with optional execution order.
   * @template T - Hook name type constrained to keys of THooks
   * @param hookName - Name of the hook to register the action for
   * @param action - Function to execute when the hook fires
   * @param order - Execution order (lower numbers execute first, default: 0)
   */
  const register = <T extends keyof THooks & string>(
    hookName: T,
    action: (...args: THooks[T]) => Promise<unknown> | unknown,
    order = 0,
  ) => {
    if (!hooks.has(hookName)) hooks.set(hookName, new Map([[order, [action]]]));
    else {
      const actionMap = hooks.get(hookName);
      if (actionMap) {
        if (actionMap.has(order)) actionMap.get(order)?.push(action);
        else actionMap.set(order, [action]);
      }
    }
  };

  /**
   * Clears all registered actions for all hooks.
   */
  const clear = () => {
    hooks.clear();
  };

  /**
   * Sets or updates the logger instance used for debugging and error reporting.
   * @param newLogger - New logger instance, or undefined to remove logging
   */
  const setLogger = (newLogger?: Logger) => {
    logger = newLogger;
  };

  /**
   * Gets the currently configured logger instance.
   * @returns Current logger instance or undefined if no logger is set
   */
  const getLogger = () => logger;

  return {
    getActionsBatch,
    register,
    clear,
    setLogger,
    getLogger,
  };
};
