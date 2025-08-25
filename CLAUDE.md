# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build and Development

```bash
npm run build        # Build TypeScript using tsgo (experimental TypeScript compiler)
npm run clean        # Remove dist directory
npm test            # Run all tests using Node.js built-in test runner
npm run prepublishOnly  # Full pipeline: clean → build → test

# Run specific test file
node --test src/async-hook.test.ts
node --test src/sync-hook.test.ts
```

### Publishing

```bash
npm version patch|minor|major  # Update version before pushing to main
# Push to main branch - GitHub Actions will auto-publish if version changed
```

## Architecture

This is a TypeScript library for managing synchronous and asynchronous hooks with ordered execution. The codebase follows a factory pattern where registry functions create typed hook instances.

### Core Design Patterns

1. **Hook Registry Pattern**: Both `createAsyncHookRegistry` and `createSyncHookRegistry` return objects with `register`, `fire`, and `clear` methods. The registries use nested Maps internally: `Map<hookName, Map<order, actions[]>>`.

2. **Type-Safe Generics**: Hook types are defined as `Record<string, unknown[]>` where keys are hook names and values are argument tuples. This enables full TypeScript inference for hook payloads.

3. **Ordered Execution**: Actions are grouped by order number and executed in batches. Within each batch:
   - **Sync hooks**: Execute sequentially, stop on first error
   - **Async hooks**: Execute in parallel using `Promise.all`, fast-fail on first error

4. **Fast-Fail Behavior**: Both sync and async hooks stop execution immediately when an error occurs. In async hooks, `Promise.all` ensures that the first rejection stops the batch.

### Key Implementation Details

- **No Runtime Dependencies**: Library is zero-dependency by design
- **ESM-Only**: Uses `"type": "module"` with `.ts` extensions in imports
- **Experimental TypeScript Compiler**: Uses `@typescript/native-preview` (tsgo) instead of standard tsc
- **Node.js Built-in Test Runner**: Tests use `node:test` and `node:assert`, no external test framework

### Testing Approach

Tests comprehensively cover:

- Basic registration and firing
- Order-based execution with multiple priorities
- Error handling and isolation
- Logger integration
- Mixed sync/async actions (async hooks)
- Complex payload handling

Mock loggers follow the interface: `{ debug: (obj, msg?) => void, error: (obj, msg?) => void }`

## CI/CD

- **PR Checks**: Tests run on Node 18, 20, 22
- **Auto-publish**: Pushing to main with version bump triggers npm publish
- **Required Secret**: `NPM_TOKEN` must be set in GitHub secrets for publishing

## Important Notes

- Always use `createAsyncHookRegistry` and `createSyncHookRegistry` (not the old names)
- When modifying tests, ensure logger mocks handle both `(message)` and `(object, message)` signatures
- The `|| "anonymous"` fallback in action name logging is intentional (empty string functions)
- Test files use `.test.ts` suffix and are excluded from npm package
