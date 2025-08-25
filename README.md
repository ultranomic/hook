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

## Usage

### Async Hooks

```typescript
import { createAsyncHookRegistry } from '@ultranomic/hook';

// Define your hook types
type MyHooks = {
  beforeSave: [data: string, userId: number];
  afterSave: [result: { id: string }];
};

// Create hook registry
const hooks = createAsyncHookRegistry<MyHooks>();

// Register actions
hooks.register('beforeSave', async (data, userId) => {
  console.log(`Saving data for user ${userId}: ${data}`);
});

// Fire hooks
await hooks.fire('beforeSave', 'my data', 123);
```

### Sync Hooks

```typescript
import { createSyncHookRegistry } from '@ultranomic/hook';

type MyHooks = {
  onClick: [event: MouseEvent];
};

const hooks = createSyncHookRegistry<MyHooks>();

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

### Error Handling

Both sync and async hooks use fast-fail behavior:

```typescript
const hooks = createAsyncHookRegistry<MyHooks>({
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

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm run build

# Type check
pnpm run typecheck
```

## CI/CD Setup

This repository includes GitHub Actions workflows for:

- **CI**: Runs tests on all pull requests
- **Publishing**: Automatically publishes to npm when changes are pushed to main

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

3. Update package version:
   - The workflow only publishes when the version in `package.json` changes
   - Update the version before pushing to main: `pnpm version patch/minor/major`

The workflow will automatically:

- Run tests
- Build the package
- Check if the version is already published
- Publish to npm if it's a new version
- Create a GitHub release

## License

MIT
