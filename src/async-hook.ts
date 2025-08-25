import type { Logger } from './logger.ts';

export const createAsyncHookRegistry = <THooks extends Record<string, unknown[]>>(options?: { logger?: Logger }) => {
  const hooks = new Map<string, Map<number, ((...args: any[]) => Promise<unknown> | unknown)[]>>();

  const getActionsBatch = <T extends keyof THooks & string>(hookName: T) => {
    const actionMap = hooks.get(hookName);
    if (!actionMap) return [];

    return actionMap
      .entries()
      .toArray()
      .toSorted(([orderA], [orderB]) => Number(orderA) - Number(orderB))
      .map(([_, actions]) => actions);
  };

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

  const fire = async <T extends keyof THooks & string>(hookName: T, ...payload: THooks[T]) => {
    const actionsBatch = getActionsBatch(hookName);
    for (const actions of actionsBatch) {
      options?.logger?.debug(
        `Fired hook ${hookName} with actions: ${actions.map((action) => action.name || 'anonymous').join(', ')}`,
      );

      try {
        // Execute actions with fast-fail behavior
        await Promise.all(actions.map((action) => Promise.try(action, ...payload)));
      } catch (error) {
        // Find which action failed for logging
        if (options?.logger) {
          for (const action of actions) {
            try {
              await Promise.try(action, ...payload);
            } catch (actionError) {
              if (actionError === error) {
                const actionName = action.name || 'anonymous';
                options?.logger?.error({ error }, `Hook action '${actionName}' for '${hookName}' failed`);
                break;
              }
            }
          }
        }
        throw error;
      }
    }
  };

  const clear = () => {
    hooks.clear();
  };

  return {
    fire,
    register,
    clear,
  };
};
