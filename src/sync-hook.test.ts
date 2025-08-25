import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createSyncHookRegistry } from './sync-hook.ts';
import type { Logger } from './logger.ts';

describe('Sync Hook', () => {
  let mockLogger: Logger;
  let debugLogs: string[];
  let errorLogs: Array<{ error: unknown; message: string }>;

  beforeEach(() => {
    debugLogs = [];
    errorLogs = [];
    mockLogger = {
      debug: (message: string) => {
        debugLogs.push(message);
      },
      error: (objectOrMessage: unknown, message?: string) => {
        if (typeof objectOrMessage === 'string') {
          errorLogs.push({ error: undefined, message: objectOrMessage });
        } else if (message) {
          errorLogs.push({ error: objectOrMessage, message });
        }
      },
    };
  });

  test('should register and fire hooks', () => {
    const hook = createSyncHookRegistry<{ test: [string] }>();
    let result = '';

    hook.register('test', (value) => {
      result = value;
    });

    hook.fire('test', 'hello');
    assert.strictEqual(result, 'hello');
  });

  test('should handle multiple actions in order', () => {
    const hook = createSyncHookRegistry<{ test: [number] }>();
    const results: number[] = [];

    hook.register('test', (value) => results.push(value * 2), 1);
    hook.register('test', (value) => results.push(value * 3), 0);
    hook.register('test', (value) => results.push(value * 4), 2);

    hook.fire('test', 5);
    assert.deepStrictEqual(results, [15, 10, 20]); // order 0, 1, 2
  });

  test('should handle multiple actions with same order', () => {
    const hook = createSyncHookRegistry<{ test: [string] }>();
    const results: string[] = [];

    hook.register('test', (value) => results.push(`a-${value}`));
    hook.register('test', (value) => results.push(`b-${value}`));

    hook.fire('test', 'test');
    assert.deepStrictEqual(results, ['a-test', 'b-test']);
  });

  test('should log debug messages when logger provided', () => {
    const hook = createSyncHookRegistry<{ test: [string] }>({ logger: mockLogger });

    const namedAction = function testAction(value: string) {
      return value;
    };

    hook.register('test', namedAction);
    hook.register('test', (value) => value);

    hook.fire('test', 'hello');

    assert.strictEqual(debugLogs.length, 1);
    assert(debugLogs[0].includes('Fired hook test with actions: testAction, anonymous'));
  });

  test('should handle errors and log them', () => {
    const hook = createSyncHookRegistry<{ test: [string] }>({ logger: mockLogger });
    const testError = new Error('Test error');

    const errorAction = function errorAction() {
      throw testError;
    };

    hook.register('test', errorAction);

    assert.throws(() => {
      hook.fire('test', 'hello');
    }, testError);

    assert.strictEqual(errorLogs.length, 1);
    assert.strictEqual(errorLogs[0].error.error, testError);
    assert(errorLogs[0].message.includes("Hook action 'errorAction' for 'test' failed"));
  });

  test('should handle errors without logger', () => {
    const hook = createSyncHookRegistry<{ test: [] }>();
    const testError = new Error('Test error');

    hook.register('test', () => {
      throw testError;
    });

    assert.throws(() => {
      hook.fire('test');
    }, testError);
  });

  test('should clear all hooks', () => {
    const hook = createSyncHookRegistry<{ test: [string] }>();
    let called = false;

    hook.register('test', () => {
      called = true;
    });

    hook.clear();
    hook.fire('test', 'hello');

    assert.strictEqual(called, false);
  });

  test('should handle hooks with no actions', () => {
    const hook = createSyncHookRegistry<{ test: [string] }>();

    // Should not throw
    assert.doesNotThrow(() => {
      hook.fire('test', 'hello');
    });
  });

  test('should handle complex payloads', () => {
    const hook = createSyncHookRegistry<{
      complex: [string, number, { data: boolean }];
    }>();

    let receivedArgs: any[] = [];

    hook.register('complex', (str, num, obj) => {
      receivedArgs = [str, num, obj];
    });

    const testObj = { data: true };
    hook.fire('complex', 'test', 42, testObj);

    assert.deepStrictEqual(receivedArgs, ['test', 42, testObj]);
  });
});
