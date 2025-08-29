# @ultranomic/hook

A lightweight TypeScript library for managing synchronous and asynchronous hooks with ordered execution.

## Installation

```bash
pnpm add @ultranomic/hook
npm install @ultranomic/hook
```

## Features

- ✨ Synchronous and asynchronous hook registries
- 🎯 Ordered execution with priority support
- ⚡ Fast-fail behavior on errors
- 📝 Optional logging support
- 💪 Full TypeScript support with strong typing
- 🚀 Zero runtime dependencies
- 📦 ESM-only with modern TypeScript

## Usage

### Async Hooks

```typescript
import { createAsyncHooks } from '@ultranomic/hook';

// Define your hook types
type MyHooks = {
  beforeSave: [data: string, userId: number];
  afterSave: [result: { id: string }];
};

// Create hook registry
const hooks = createAsyncHooks<MyHooks>();

// Register actions
hooks.register('beforeSave', async (data, userId) => {
  console.log(`Saving data for user ${userId}: ${data}`);
});

// Fire hooks
await hooks.fire('beforeSave', 'my data', 123);
```

### Sync Hooks

```typescript
import { createSyncHooks } from '@ultranomic/hook';

type MyHooks = {
  onClick: [event: MouseEvent];
};

const hooks = createSyncHooks<MyHooks>();

hooks.register('onClick', (event) => {
  console.log('Button clicked!', event);
});

hooks.fire('onClick', mouseEvent);
```

### Ordered Execution

Actions can be registered with an order parameter (default is 0). Lower numbers execute first:

```typescript
hooks.register('beforeSave', action1, 0); // Executes first
hooks.register('beforeSave', action2, 10); // Executes second
hooks.register('beforeSave', action3, 5); // Executes between action1 and action2
```

### Logger Management

You can provide a logger during initialization or set it later:

```typescript
// Option 1: Initialize with logger
const hooks = createAsyncHooks<MyHooks>({
  logger: console,
});

// Option 2: Set logger after initialization
const hooks = createAsyncHooks<MyHooks>();
hooks.setLogger(console);

// Update logger
hooks.setLogger(myCustomLogger);

// Remove logger
hooks.setLogger();
```

### Error Handling

Both sync and async hooks use fast-fail behavior:

```typescript
const hooks = createAsyncHooks<MyHooks>({
  logger: console, // Optional logger for debugging
});

// These all have the same priority (0)
hooks.register('test', async () => {
  /* action 1 */
});
hooks.register('test', async () => {
  throw new Error('Fails!');
});
hooks.register('test', async () => {
  /* action 3 - may not execute */
});

// The hook will throw immediately when the first error occurs
await hooks.fire('test');
```

## API Reference

### `createAsyncHooks<T>(options?)`

Creates a new asynchronous hook registry.

**Parameters:**

- `options.logger` (optional): Logger instance with `debug` and `error` methods

**Returns:** Hook registry with methods:

- `register(hookName, action, order?)`: Register an async action
- `fire(hookName, ...args)`: Execute all registered actions for a hook
- `clear(hookName?)`: Clear actions for a hook (or all hooks)
- `setLogger(logger?)`: Set or update the logger after initialization

### `createSyncHooks<T>(options?)`

Creates a new synchronous hook registry.

**Parameters:**

- `options.logger` (optional): Logger instance with `debug` and `error` methods

**Returns:** Hook registry with methods:

- `register(hookName, action, order?)`: Register a sync action
- `fire(hookName, ...args)`: Execute all registered actions for a hook
- `clear(hookName?)`: Clear actions for a hook (or all hooks)
- `setLogger(logger?)`: Set or update the logger after initialization

## Development

**Requirements:**

- Node.js ≥24.0.0
- pnpm 10.15.0+

```bash
# Install dependencies
pnpm install

# Run tests (using Node.js built-in test runner)
pnpm test

# Build (uses experimental TypeScript compiler @typescript/native-preview)
pnpm run build

# Format code
pnpm run format

# Clean build artifacts
pnpm run clean

# Full pipeline (clean → build → test)
pnpm run prepublishOnly
```

## Architecture

This library follows a factory pattern where registry functions create typed hook instances. Key design patterns:

- **Hook Registry Pattern**: Registries use nested Maps: `Map<hookName, Map<order, actions[]>>`
- **Type-Safe Generics**: Hook types defined as `Record<string, unknown[]>` for full TypeScript inference
- **Ordered Execution**: Actions grouped by order number, executed in batches
- **Fast-Fail Behavior**: Execution stops immediately on first error

## CI/CD Setup

This repository includes GitHub Actions workflows for:

- **CI**: Runs tests on Node.js 24 for all pull requests
- **Publishing**: Automatically publishes to npm with auto-versioning when changes are pushed to main

### Setting up npm Publishing

1. Generate an npm access token:
   - Go to [npmjs.com](https://www.npmjs.com/)
   - Sign in to your account
   - Go to Access Tokens (Account Settings → Access Tokens)
   - Generate a new token with "Automation" type

2. Add the token to GitHub repository secrets:
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your npm token

3. Auto-versioning (optional):
   - The workflow includes intelligent auto-versioning based on commit analysis
   - Alternatively, manually update version: `pnpm version patch/minor/major`
   - Requires `GEMINI_API_KEY` secret for AI-powered version analysis

The workflow will automatically:

- Analyze commits for version bumping (if `GEMINI_API_KEY` is configured)
- Run the full test pipeline on Node.js 24
- Build the package using experimental TypeScript compiler
- Check if the version is already published
- Publish to npm if it's a new version
- Create a GitHub release with changelog

## License

MIT
