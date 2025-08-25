import { createBaseHooks } from './create-base-hooks.ts';
import type { Logger } from './logger.ts';

export const createSyncHooks = <THooks extends Record<string, unknown[]>>(options?: { logger?: Logger }) => {
  const base = createBaseHooks<THooks>(options);

  const fire = <T extends keyof THooks & string>(hookName: T, ...payload: THooks[T]) => {
    const actionsBatch = base.getActionsBatch(hookName);
    for (const actions of actionsBatch) {
      options?.logger?.debug(
        `Fired hook ${hookName} with actions: ${actions.map((action) => action.name || 'anonymous').join(', ')}`,
      );

      for (const action of actions) {
        try {
          action(...payload);
        } catch (error) {
          const actionName = action.name || 'anonymous';
          options?.logger?.error({ error }, `Hook action '${actionName}' for '${hookName}' failed`);
          throw error;
        }
      }
    }
  };

  return {
    fire,
    register: base.register,
    clear: base.clear,
  };
};
