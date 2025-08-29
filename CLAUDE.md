# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build and Development

```bash
pnpm run build        # Build TypeScript using tsgo (experimental TypeScript compiler)
pnpm run clean        # Remove dist directory
pnpm test            # Run all tests using Node.js built-in test runner
pnpm run test:coverage # Run tests with coverage using Node.js native coverage
pnpm run typecheck    # Type check without emitting files
pnpm run format      # Format code using Prettier
pnpm run prepublishOnly  # Full pipeline: clean → build → test

# Run specific test file
node --test src/create-async-hooks.test.ts
node --test src/create-sync-hooks.test.ts
node --test src/create-base-hooks.test.ts
```

### Publishing

```bash
pnpm version patch|minor|major  # Update version before pushing to main
# Push to main branch - GitHub Actions will auto-publish if version changed
```

## Architecture

This is a TypeScript library for managing synchronous and asynchronous hooks with ordered execution. The codebase follows a factory pattern where registry functions create typed hook instances.

### Core Design Patterns

1. **Hook Registry Pattern**: Both `createAsyncHooks` and `createSyncHooks` return objects with `register`, `fire`, `clear`, and `setLogger` methods. The registries use nested Maps internally: `Map<hookName, Map<order, actions[]>>`.

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
- Logger integration and post-initialization logger setting
- Mixed sync/async actions (async hooks)
- Complex payload handling

Mock loggers follow the interface: `{ debug: (obj, msg?) => void, error: (obj, msg?) => void }`

## CI/CD

- **PR Checks**: `validate` job runs type checking, tests with 100% coverage verification, and package validation on Node 24
- **Auto-publish**: Pushing to main with auto-versioning triggers npm publish
- **Dependabot**: Weekly dependency updates with auto-merge when CI passes
- **Claude AI Integration**: Automated code reviews and @claude assistance
- **Required Secrets**: `NPM_TOKEN` for publishing, `GEMINI_API_KEY` for auto-versioning, `CLAUDE_CODE_OAUTH_TOKEN` for Claude workflows

## Important Notes

- Always use `createAsyncHooks` and `createSyncHooks` (the correct export names)
- When modifying tests, ensure logger mocks handle both `(message)` and `(object, message)` signatures
- The `|| "anonymous"` fallback in action name logging is intentional (empty string functions)
- Test files use `.test.ts` suffix and are excluded from npm package
- **CRITICAL**: When making ANY changes to the project (code, configuration, workflows, dependencies, etc.), ALWAYS update both CLAUDE.md and README.md to reflect the changes. This ensures documentation stays in sync with the entire project state.
- **REQUIRED**: Always add JSDoc comments for all public methods and functions. Use clear descriptions and document parameters and return values.
- **REQUIRED**: Ensure 100% test coverage for all code changes. Every new method, function, and code path must have corresponding tests. Use `node --experimental-test-coverage --test src/*.test.ts` to verify coverage.
