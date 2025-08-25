import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createBaseHooks } from './create-base-hooks.ts';
import type { Logger } from './logger.ts';

describe('Base Hook Registry', () => {
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

  test('should register actions for a hook', () => {
    const base = createBaseHooks<{ test: [string] }>();
    const action = (value: string) => value;

    base.register('test', action);
    
    const batches = base.getActionsBatch('test');
    assert.strictEqual(batches.length, 1);
    assert.strictEqual(batches[0].length, 1);
    assert.strictEqual(batches[0][0], action);
  });

  test('should register multiple actions for same hook with default order', () => {
    const base = createBaseHooks<{ test: [string] }>();
    const action1 = (value: string) => value;
    const action2 = (value: string) => value.toUpperCase();

    base.register('test', action1);
    base.register('test', action2);
    
    const batches = base.getActionsBatch('test');
    assert.strictEqual(batches.length, 1);
    assert.strictEqual(batches[0].length, 2);
    assert.strictEqual(batches[0][0], action1);
    assert.strictEqual(batches[0][1], action2);
  });

  test('should register actions with different orders', () => {
    const base = createBaseHooks<{ test: [number] }>();
    const action1 = (value: number) => value * 1;
    const action2 = (value: number) => value * 2;
    const action3 = (value: number) => value * 3;

    base.register('test', action2, 1);
    base.register('test', action1, 0);
    base.register('test', action3, 2);
    
    const batches = base.getActionsBatch('test');
    assert.strictEqual(batches.length, 3);
    assert.strictEqual(batches[0].length, 1);
    assert.strictEqual(batches[1].length, 1);
    assert.strictEqual(batches[2].length, 1);
    assert.strictEqual(batches[0][0], action1); // order 0
    assert.strictEqual(batches[1][0], action2); // order 1
    assert.strictEqual(batches[2][0], action3); // order 2
  });

  test('should group actions with same order into same batch', () => {
    const base = createBaseHooks<{ test: [string] }>();
    const action1 = (value: string) => `${value}-1`;
    const action2 = (value: string) => `${value}-2`;
    const action3 = (value: string) => `${value}-3`;
    const action4 = (value: string) => `${value}-4`;

    base.register('test', action1, 0);
    base.register('test', action2, 1);
    base.register('test', action3, 0);
    base.register('test', action4, 1);
    
    const batches = base.getActionsBatch('test');
    assert.strictEqual(batches.length, 2);
    
    // Order 0 batch
    assert.strictEqual(batches[0].length, 2);
    assert.strictEqual(batches[0][0], action1);
    assert.strictEqual(batches[0][1], action3);
    
    // Order 1 batch
    assert.strictEqual(batches[1].length, 2);
    assert.strictEqual(batches[1][0], action2);
    assert.strictEqual(batches[1][1], action4);
  });

  test('should handle negative order values', () => {
    const base = createBaseHooks<{ test: [string] }>();
    const action1 = (value: string) => `${value}-neg`;
    const action2 = (value: string) => `${value}-zero`;
    const action3 = (value: string) => `${value}-pos`;

    base.register('test', action2, 0);
    base.register('test', action1, -1);
    base.register('test', action3, 1);
    
    const batches = base.getActionsBatch('test');
    assert.strictEqual(batches.length, 3);
    assert.strictEqual(batches[0][0], action1); // order -1
    assert.strictEqual(batches[1][0], action2); // order 0
    assert.strictEqual(batches[2][0], action3); // order 1
  });

  test('should return empty array for non-existent hook', () => {
    const base = createBaseHooks<{ test: [string] }>();
    
    const batches = base.getActionsBatch('test');
    assert.deepStrictEqual(batches, []);
  });

  test('should handle multiple different hooks', () => {
    const base = createBaseHooks<{ hook1: [string]; hook2: [number] }>();
    const action1 = (value: string) => value;
    const action2 = (value: number) => value;

    base.register('hook1', action1);
    base.register('hook2', action2);
    
    const batches1 = base.getActionsBatch('hook1');
    const batches2 = base.getActionsBatch('hook2');
    
    assert.strictEqual(batches1.length, 1);
    assert.strictEqual(batches1[0][0], action1);
    
    assert.strictEqual(batches2.length, 1);
    assert.strictEqual(batches2[0][0], action2);
  });

  test('should clear all hooks', () => {
    const base = createBaseHooks<{ hook1: [string]; hook2: [number] }>();
    const action1 = (value: string) => value;
    const action2 = (value: number) => value;

    base.register('hook1', action1);
    base.register('hook2', action2);
    
    // Verify hooks are registered
    assert.strictEqual(base.getActionsBatch('hook1').length, 1);
    assert.strictEqual(base.getActionsBatch('hook2').length, 1);
    
    base.clear();
    
    // Verify hooks are cleared
    assert.deepStrictEqual(base.getActionsBatch('hook1'), []);
    assert.deepStrictEqual(base.getActionsBatch('hook2'), []);
  });

  test('should handle complex type signatures', () => {
    const base = createBaseHooks<{
      complex: [string, number, { data: boolean }, string[]];
      simple: [];
    }>();
    
    const complexAction = (str: string, num: number, obj: { data: boolean }, arr: string[]) => {
      return { str, num, obj, arr };
    };
    
    const simpleAction = () => 'simple';

    base.register('complex', complexAction);
    base.register('simple', simpleAction);
    
    const complexBatches = base.getActionsBatch('complex');
    const simpleBatches = base.getActionsBatch('simple');
    
    assert.strictEqual(complexBatches.length, 1);
    assert.strictEqual(complexBatches[0][0], complexAction);
    
    assert.strictEqual(simpleBatches.length, 1);
    assert.strictEqual(simpleBatches[0][0], simpleAction);
  });

  test('should preserve registration order within same order group', () => {
    const base = createBaseHooks<{ test: [string] }>();
    const results: string[] = [];
    
    const action1 = () => results.push('first');
    const action2 = () => results.push('second');
    const action3 = () => results.push('third');

    base.register('test', action1);
    base.register('test', action2);
    base.register('test', action3);
    
    const batches = base.getActionsBatch('test');
    assert.strictEqual(batches.length, 1);
    assert.strictEqual(batches[0].length, 3);
    assert.strictEqual(batches[0][0], action1);
    assert.strictEqual(batches[0][1], action2);
    assert.strictEqual(batches[0][2], action3);
  });

  test('should sort batches numerically not lexicographically', () => {
    const base = createBaseHooks<{ test: [string] }>();
    const action1 = () => '1';
    const action2 = () => '2';
    const action10 = () => '10';
    const action20 = () => '20';

    // Register in non-sorted order
    base.register('test', action20, 20);
    base.register('test', action2, 2);
    base.register('test', action10, 10);
    base.register('test', action1, 1);
    
    const batches = base.getActionsBatch('test');
    assert.strictEqual(batches.length, 4);
    assert.strictEqual(batches[0][0], action1);  // order 1
    assert.strictEqual(batches[1][0], action2);  // order 2
    assert.strictEqual(batches[2][0], action10); // order 10
    assert.strictEqual(batches[3][0], action20); // order 20
  });

  test('should work without logger option', () => {
    const base = createBaseHooks<{ test: [string] }>();
    const action = (value: string) => value;

    // Should not throw
    assert.doesNotThrow(() => {
      base.register('test', action);
    });
    
    const batches = base.getActionsBatch('test');
    assert.strictEqual(batches.length, 1);
    assert.strictEqual(batches[0][0], action);
  });

  test('should work with logger option', () => {
    const base = createBaseHooks<{ test: [string] }>({ logger: mockLogger });
    const action = (value: string) => value;

    // Should not throw and should not log (since register logging was removed)
    assert.doesNotThrow(() => {
      base.register('test', action);
    });
    
    assert.strictEqual(debugLogs.length, 0);
    assert.strictEqual(errorLogs.length, 0);
  });

  test('should handle async and sync actions equally in registration', () => {
    const base = createBaseHooks<{ test: [string] }>();
    const syncAction = (value: string) => value;
    const asyncAction = async (value: string) => Promise.resolve(value);

    base.register('test', syncAction);
    base.register('test', asyncAction);
    
    const batches = base.getActionsBatch('test');
    assert.strictEqual(batches.length, 1);
    assert.strictEqual(batches[0].length, 2);
    assert.strictEqual(batches[0][0], syncAction);
    assert.strictEqual(batches[0][1], asyncAction);
  });
});