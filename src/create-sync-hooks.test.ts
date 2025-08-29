import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createSyncHooks } from './create-sync-hooks.ts';
import type { Logger } from './logger.ts';

describe('Sync Hook', () => {
  let mockLogger: Logger;
  let debugLogs: string[];
  let errorLogs: Array<{ object: unknown; message: string }>;

  beforeEach(() => {
    debugLogs = [];
    errorLogs = [];
    mockLogger = {
      debug: (objectOrMessage: unknown, message?: string) => {
        if (typeof objectOrMessage === 'string') {
          debugLogs.push(objectOrMessage);
        } else if (message) {
          debugLogs.push(message);
        }
      },
      error: (objectOrMessage: unknown, message?: string) => {
        if (typeof objectOrMessage === 'string') {
          errorLogs.push({ object: undefined, message: objectOrMessage });
        } else if (message) {
          errorLogs.push({ object: objectOrMessage, message });
        }
      },
    };
  });

  test('should register and fire hooks', () => {
    const hook = createSyncHooks<{ test: [string] }>();
    let result = '';

    hook.register('test', (value) => {
      result = value;
    });

    hook.fire('test', 'hello');
    assert.strictEqual(result, 'hello');
  });

  test('should handle multiple actions in order', () => {
    const hook = createSyncHooks<{ test: [number] }>();
    const results: number[] = [];

    hook.register('test', (value) => results.push(value * 2), 1);
    hook.register('test', (value) => results.push(value * 3), 0);
    hook.register('test', (value) => results.push(value * 4), 2);

    hook.fire('test', 5);
    assert.deepStrictEqual(results, [15, 10, 20]); // order 0, 1, 2
  });

  test('should handle multiple actions with same order', () => {
    const hook = createSyncHooks<{ test: [string] }>();
    const results: string[] = [];

    hook.register('test', (value) => results.push(`a-${value}`));
    hook.register('test', (value) => results.push(`b-${value}`));

    hook.fire('test', 'test');
    assert.deepStrictEqual(results, ['a-test', 'b-test']);
  });

  test('should log debug messages when logger provided', () => {
    const hook = createSyncHooks<{ test: [string] }>({ logger: mockLogger });

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
    const hook = createSyncHooks<{ test: [string] }>({ logger: mockLogger });
    const testError = new Error('Test error');

    const errorAction = function errorAction() {
      throw testError;
    };

    hook.register('test', errorAction);

    assert.throws(() => {
      hook.fire('test', 'hello');
    }, testError);

    assert.strictEqual(errorLogs.length, 1);
    // @ts-expect-error - errorLogs[0].object is unknown
    assert.strictEqual(errorLogs[0].object.error, testError);
    assert(errorLogs[0].message.includes("Hook action 'errorAction' for 'test' failed"));
  });

  test('should handle errors without logger', () => {
    const hook = createSyncHooks<{ test: [] }>();
    const testError = new Error('Test error');

    hook.register('test', () => {
      throw testError;
    });

    assert.throws(() => {
      hook.fire('test');
    }, testError);
  });

  test('should clear all hooks', () => {
    const hook = createSyncHooks<{ test: [string] }>();
    let called = false;

    hook.register('test', () => {
      called = true;
    });

    hook.clear();
    hook.fire('test', 'hello');

    assert.strictEqual(called, false);
  });

  test('should handle hooks with no actions', () => {
    const hook = createSyncHooks<{ test: [string] }>();

    // Should not throw
    assert.doesNotThrow(() => {
      hook.fire('test', 'hello');
    });
  });

  test('should handle complex payloads', () => {
    const hook = createSyncHooks<{
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

  test('should allow setting logger after initialization', () => {
    const hook = createSyncHooks<{ test: [string] }>();
    let result = '';

    hook.register('test', (value) => {
      result = value;
    });

    hook.fire('test', 'hello');
    assert.strictEqual(debugLogs.length, 0);

    hook.setLogger(mockLogger);
    hook.fire('test', 'world');

    assert.strictEqual(result, 'world');
    assert.strictEqual(debugLogs.length, 1);
    assert.strictEqual(debugLogs[0], 'Fired hook test with actions: anonymous');
  });

  test('should allow updating logger after initialization', () => {
    const hook = createSyncHooks<{ test: [string] }>({ logger: mockLogger });
    let result = '';

    hook.register('test', (value) => {
      result = value;
    });

    hook.fire('test', 'hello');
    assert.strictEqual(debugLogs.length, 1);

    const newMockLogger = {
      debug: (objectOrMessage: unknown, message?: string) => {
        debugLogs.push('NEW_LOGGER: ' + (message || objectOrMessage));
      },
      error: mockLogger.error,
    };

    hook.setLogger(newMockLogger);
    hook.fire('test', 'world');

    assert.strictEqual(result, 'world');
    assert.strictEqual(debugLogs.length, 2);
    assert.strictEqual(debugLogs[1], 'NEW_LOGGER: Fired hook test with actions: anonymous');
  });
});
