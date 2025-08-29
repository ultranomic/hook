import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createAsyncHooks } from './create-async-hooks.ts';
import type { Logger } from './logger.ts';

describe('Async Hook', () => {
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

  test('should register and fire async hooks', async () => {
    const hook = createAsyncHooks<{ test: [string] }>();
    let result = '';

    hook.register('test', async (value) => {
      result = value;
    });

    await hook.fire('test', 'hello');
    assert.strictEqual(result, 'hello');
  });

  test('should handle multiple async actions in order', async () => {
    const hook = createAsyncHooks<{ test: [number] }>();
    const results: number[] = [];

    hook.register(
      'test',
      async (value) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(value * 2);
      },
      1,
    );

    hook.register(
      'test',
      async (value) => {
        results.push(value * 3);
      },
      0,
    );

    hook.register(
      'test',
      async (value) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        results.push(value * 4);
      },
      2,
    );

    await hook.fire('test', 5);
    assert.deepStrictEqual(results, [15, 10, 20]); // order 0, 1, 2
  });

  test('should handle sync actions in async hook', async () => {
    const hook = createAsyncHooks<{ test: [string] }>();
    let result = '';

    hook.register('test', (value) => {
      result = value;
      return value; // sync return
    });

    await hook.fire('test', 'sync-test');
    assert.strictEqual(result, 'sync-test');
  });

  test('should handle mixed sync and async actions', async () => {
    const hook = createAsyncHooks<{ test: [number] }>();
    const results: number[] = [];

    hook.register('test', (value) => {
      results.push(value * 2); // sync
    });

    hook.register('test', async (value) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      results.push(value * 3); // async
    });

    await hook.fire('test', 5);
    assert.deepStrictEqual(results, [10, 15]);
  });

  test('should log debug messages when logger provided', async () => {
    const hook = createAsyncHooks<{ test: [string] }>({ logger: mockLogger });

    const namedAction = async function testAction(value: string) {
      return value;
    };

    hook.register('test', namedAction);
    hook.register('test', async (value) => value);

    await hook.fire('test', 'hello');

    assert.strictEqual(debugLogs.length, 1);
    assert(debugLogs[0].includes('Fired hook test with actions: testAction, anonymous'));
  });

  test('should handle errors and log them', async () => {
    const hook = createAsyncHooks<{ test: [string] }>({ logger: mockLogger });
    const testError = new Error('Test error');

    const errorAction = async function errorAction() {
      throw testError;
    };

    hook.register('test', errorAction);

    await assert.rejects(async () => {
      await hook.fire('test', 'hello');
    }, testError);

    assert.strictEqual(errorLogs.length, 1);
    // @ts-expect-error - errorLogs[0].object is unknown
    assert.strictEqual(errorLogs[0].object.error, testError);
    assert(errorLogs[0].message.includes("Hook action 'errorAction' for 'test' failed"));
  });

  test('should handle sync errors in async hook', async () => {
    const hook = createAsyncHooks<{ test: [] }>({ logger: mockLogger });
    const testError = new Error('Sync error');

    hook.register('test', () => {
      throw testError; // sync error
    });

    await assert.rejects(async () => {
      await hook.fire('test');
    }, testError);
  });

  test('should handle errors without logger', async () => {
    const hook = createAsyncHooks<{ test: [] }>();
    const testError = new Error('Test error');

    hook.register('test', async () => {
      throw testError;
    });

    await assert.rejects(async () => {
      await hook.fire('test');
    }, testError);
  });

  test('should allow setting logger after initialization', async () => {
    const hook = createAsyncHooks<{ test: [string] }>();
    let result = '';

    hook.register('test', async (value) => {
      result = value;
    });

    await hook.fire('test', 'hello');
    assert.strictEqual(debugLogs.length, 0);

    hook.setLogger(mockLogger);
    await hook.fire('test', 'world');

    assert.strictEqual(result, 'world');
    assert.strictEqual(debugLogs.length, 1);
    assert.strictEqual(debugLogs[0], 'Fired hook test with actions: anonymous');
  });

  test('should allow updating logger after initialization', async () => {
    const hook = createAsyncHooks<{ test: [string] }>({ logger: mockLogger });
    let result = '';

    hook.register('test', async (value) => {
      result = value;
    });

    await hook.fire('test', 'hello');
    assert.strictEqual(debugLogs.length, 1);

    const newMockLogger = {
      debug: (objectOrMessage: unknown, message?: string) => {
        debugLogs.push('NEW_LOGGER: ' + (message || objectOrMessage));
      },
      error: mockLogger.error,
    };

    hook.setLogger(newMockLogger);
    await hook.fire('test', 'world');

    assert.strictEqual(result, 'world');
    assert.strictEqual(debugLogs.length, 2);
    assert.strictEqual(debugLogs[1], 'NEW_LOGGER: Fired hook test with actions: anonymous');
  });

  test('should clear all hooks', async () => {
    const hook = createAsyncHooks<{ test: [string] }>();
    let called = false;

    hook.register('test', async () => {
      called = true;
    });

    hook.clear();
    await hook.fire('test', 'hello');

    assert.strictEqual(called, false);
  });

  test('should handle hooks with no actions', async () => {
    const hook = createAsyncHooks<{ test: [string] }>();

    // Should not throw
    await assert.doesNotThrow(async () => {
      await hook.fire('test', 'hello');
    });
  });

  test('should handle complex payloads', async () => {
    const hook = createAsyncHooks<{
      complex: [string, number, { data: boolean }];
    }>();

    let receivedArgs: any[] = [];

    hook.register('complex', async (str, num, obj) => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      receivedArgs = [str, num, obj];
    });

    const testObj = { data: true };
    await hook.fire('complex', 'test', 42, testObj);

    assert.deepStrictEqual(receivedArgs, ['test', 42, testObj]);
  });

  test('should execute actions in batches by order', async () => {
    const hook = createAsyncHooks<{ test: [string] }>();
    const executionOrder: string[] = [];

    // Order 0 - should execute first
    hook.register(
      'test',
      async (value) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        executionOrder.push(`0-slow-${value}`);
      },
      0,
    );

    hook.register(
      'test',
      async (value) => {
        executionOrder.push(`0-fast-${value}`);
      },
      0,
    );

    // Order 1 - should execute after order 0 completes
    hook.register(
      'test',
      async (value) => {
        executionOrder.push(`1-${value}`);
      },
      1,
    );

    await hook.fire('test', 'test');

    // Actions with same order should be parallel, different orders sequential
    assert.strictEqual(executionOrder.length, 3);
    assert.strictEqual(executionOrder[2], '1-test'); // Order 1 should be last
    // Order 0 actions can complete in any order since they're parallel
    assert(executionOrder.includes('0-slow-test'));
    assert(executionOrder.includes('0-fast-test'));
  });

  test('should handle Promise.try functionality', async () => {
    const hook = createAsyncHooks<{ test: [] }>();
    let syncCalled = false;
    let asyncCalled = false;

    hook.register('test', () => {
      syncCalled = true;
    });

    hook.register('test', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      asyncCalled = true;
    });

    await hook.fire('test');

    assert.strictEqual(syncCalled, true);
    assert.strictEqual(asyncCalled, true);
  });

  test('should fail fast when an action throws an error', async () => {
    const hook = createAsyncHooks<{ test: [string] }>({ logger: mockLogger });
    const results: string[] = [];
    const testError = new Error('Action 2 error');

    hook.register(
      'test',
      async (value) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(`action1-${value}`);
      },
      0,
    );

    hook.register(
      'test',
      async () => {
        throw testError;
      },
      0,
    );

    hook.register(
      'test',
      async (value) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(`action3-${value}`);
      },
      0,
    );

    await assert.rejects(async () => {
      await hook.fire('test', 'fast-fail');
    }, testError);

    // With fast-fail, action1 and action3 may or may not complete
    // depending on timing, but we know the error is thrown immediately
    assert.strictEqual(errorLogs.length, 1);
    assert(errorLogs[0].message.includes('Hook action'));
  });

  test('should stop at first batch that fails', async () => {
    const hook = createAsyncHooks<{ test: [] }>({ logger: mockLogger });
    const executionOrder: string[] = [];
    const testError = new Error('Batch error');

    hook.register(
      'test',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        executionOrder.push('slow-action');
      },
      0,
    );

    hook.register(
      'test',
      () => {
        throw testError;
      },
      0,
    );

    hook.register(
      'test',
      () => {
        executionOrder.push('fast-action');
      },
      0,
    );

    hook.register(
      'test',
      () => {
        executionOrder.push('order-1-action');
      },
      1,
    );

    await assert.rejects(async () => {
      await hook.fire('test');
    }, testError);

    // Order 1 should never execute since order 0 batch failed
    assert(!executionOrder.includes('order-1-action'));
  });

  test('should log the first error that occurs', async () => {
    const hook = createAsyncHooks<{ test: [] }>({ logger: mockLogger });
    const error1 = new Error('Error 1');
    const error2 = new Error('Error 2');

    hook.register(
      'test',
      function namedErrorAction() {
        throw error1;
      },
      0,
    );

    hook.register(
      'test',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw error2;
      },
      0,
    );

    hook.register(
      'test',
      () => {
        // This may not execute due to fast-fail
      },
      0,
    );

    await assert.rejects(async () => {
      await hook.fire('test');
    }, error1);

    // Only the first error should be logged
    assert.strictEqual(errorLogs.length, 1);
    assert(errorLogs[0].message.includes('namedErrorAction'));
  });
});
