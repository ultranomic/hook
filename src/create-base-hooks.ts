import type { Logger } from './logger.ts';

export const createBaseHooks = <THooks extends Record<string, unknown[]>>(options?: { logger?: Logger }) => {
  const hooks = new Map<string, Map<number, ((...args: any[]) => unknown)[]>>();

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

  const clear = () => {
    hooks.clear();
  };

  return {
    getActionsBatch,
    register,
    clear,
  };
};
