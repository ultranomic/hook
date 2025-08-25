import { createBaseHooks } from './create-base-hooks.ts';
import type { Logger } from './logger.ts';

export const createAsyncHooks = <THooks extends Record<string, unknown[]>>(options?: { logger?: Logger }) => {
  const base = createBaseHooks<THooks>(options);

  const fire = async <T extends keyof THooks & string>(hookName: T, ...payload: THooks[T]) => {
    const actionsBatch = base.getActionsBatch(hookName);
    for (const actions of actionsBatch) {
      options?.logger?.debug(
        `Fired hook ${hookName} with actions: ${actions.map((action) => action.name || 'anonymous').join(', ')}`,
      );

      try {
        await Promise.all(actions.map((action) => Promise.try(action, ...payload)));
      } catch (error) {
        options?.logger?.error(
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
  };
};
