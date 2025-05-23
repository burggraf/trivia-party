Only use the contents of this file for reference. It contains information about our stack and coding guidelines. Refer to this during our session as necessary. I must stress that you are only to write Svelte 5 code using runes and the latest syntax. Do not generate code using any previous versions of Svelte, and do not generate any server side code.

You are an expert in Svelte 5, SvelteKit, TypeScript, and modern web development.

Read this guide to make sure you are writing proper Svelte 5 code: https://svelte.dev/docs/svelte/v5-migration-guide

Key Principles

- Write concise, technical code with accurate Svelte 5 and SvelteKit examples.
- Use only client-side code and no server-side code or SSR.
- Prioritize performance optimization and minimal JavaScript for optimal user experience.
- Use descriptive variable names and follow Svelte and SvelteKit conventions.
- Organize files using SvelteKit's file-based routing system.

Code Style and Structure

- Write concise, technical TypeScript or JavaScript code with accurate examples.
- Use functional and declarative programming patterns; avoid unnecessary classes except for state machines.
- Prefer iteration and modularization over code duplication.
- Structure files: component logic, markup, styles, helpers, types.
- Follow Svelte's official documentation for setup and configuration: https://svelte.dev/docs/svelte

Naming Conventions

- Use lowercase with hyphens for component files (e.g., `components/auth-form.svelte`).
- Use PascalCase for component names in imports and usage.
- Use camelCase for variables, functions, and props.

TypeScript Usage

- Use TypeScript for all code; prefer interfaces over types.
- Avoid enums; use const objects instead.
- Use functional components with TypeScript interfaces for props.
- Enable strict mode in TypeScript for better type safety.

Read the Svelte documentation for more information on Svelte here: https://svelte.dev/docs/svelte/overview

Very important: Use Svelte 5 syntax and do not use older Svelte 4 patterns:
https://svelte.dev/docs/svelte/v5-migration-guide

Svelte Runes

- `$state`: Declare reactive state
  ```typescript
  let count = $state(0);
  ```
- `$derived`: Compute derived values
  ```typescript
  let doubled = $derived(count * 2);
  ```
- `$effect`: Manage side effects and lifecycle
  ```typescript
  $effect(() => {
    console.log(`Count is now ${count}`);
  });
  ```
- `$props`: Declare component props
  ```typescript
  let { optionalProp = 42, requiredProp } = $props();
  ```
- `$bindable`: Create two-way bindable props
  ```typescript
  let { bindableProp = $bindable() } = $props();
  ```
- `$inspect`: Debug reactive state (development only)
  ```typescript
  $inspect(count);
  ```

UI and Styling

- Use Tailwind CSS for utility-first styling approach.
- Leverage Shadcn components for pre-built, customizable UI elements.
- Import Shadcn components from `$lib/components/ui`.
- Organize Tailwind classes using the `cn()` utility from `$lib/utils`.
- Use Svelte's built-in transition and animation features.

Shadcn Color Conventions

- Use `background` and `foreground` convention for colors.
- Define CSS variables without color space function:
  ```css
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  ```
- Usage example:
  ```svelte
  <div class="bg-primary text-primary-foreground">Hello</div>
  ```
- Key color variables:
  - `--background`, `--foreground`: Default body colors
  - `--muted`, `--muted-foreground`: Muted backgrounds
  - `--card`, `--card-foreground`: Card backgrounds
  - `--popover`, `--popover-foreground`: Popover backgrounds
  - `--border`: Default border color
  - `--input`: Input border color
  - `--primary`, `--primary-foreground`: Primary button colors
  - `--secondary`, `--secondary-foreground`: Secondary button colors
  - `--accent`, `--accent-foreground`: Accent colors
  - `--destructive`, `--destructive-foreground`: Destructive action colors
  - `--ring`: Focus ring color
  - `--radius`: Border radius for components

SvelteKit Project Structure

- Use the recommended SvelteKit project structure:
  ```
  - src/
    - lib/
      - lib/components/
        - lib/components/ui/
      - lib/hooks/
      - lib/i18n/
      - lib/utils/
    - routes/
    - app.html
    - app.css
    - app.d.ts
  - static/
  - svelte.config.js
  - vite.config.js
  ```

Component Development

- Create .svelte files for Svelte components.
- Use .svelte.ts files for component logic and state machines.
- Implement proper component composition and reusability.
- Use Svelte's props for data passing.
- Leverage Svelte's reactive declarations for local state management.

State Management

- Use classes for complex state management (state machines):

  ```typescript
  // counter.svelte.ts
  class Counter {
    count = $state(0);
    incrementor = $state(1);

    increment() {
      this.count += this.incrementor;
    }

    resetCount() {
      this.count = 0;
    }

    resetIncrementor() {
      this.incrementor = 1;
    }
  }

  export const counter = new Counter();
  ```

- Use in components:

  ```svelte
  <script lang="ts">
    import { counter } from "./counter.svelte.ts";
  </script>

  <button onclick={() => counter.increment()}>
    Count: {counter.count}
  </button>
  ```

Routing and Pages

- Utilize SvelteKit's file-based routing system in the src/routes/ directory.
- Implement dynamic routes using [slug] syntax.
- Use load functions for client-side data fetching calls to a database service (e.g. Supabase).
- Implement proper error handling with +error.svelte pages.

Do not use Server-Side Rendering (SSR) or Static Site Generation (SSG)

- Use the adapter-static for to generate a static site.

Performance Optimization

- Leverage Svelte's compile-time optimizations.
- Use `{#key}` blocks to force re-rendering of components when needed.
- Implement code splitting using dynamic imports for large applications.
- Profile and monitor performance using browser developer tools.
- Use `$effect.tracking()` to optimize effect dependencies.
- Minimize use of client-side JavaScript; leverage SvelteKit's SSR and SSG.
- Implement proper lazy loading for images and other assets.

Data Fetching and API Routes

- Use load functions for data fetching using a database service (e.g. Supabase).
- Implement proper error handling for data fetching operations.
- Create API routes in the src/routes/api/ directory.
- Implement proper request handling and response formatting in API routes.
- Use SvelteKit's hooks for global API middleware.

SEO and Meta Tags

- Use Svelte:head component for adding meta information.
- Implement canonical URLs for proper SEO.
- Create reusable SEO components for consistent meta tag management.

Forms and Actions

- Implement proper client-side form validation using Svelte's reactive declarations.
- Use progressive enhancement for JavaScript-optional form submissions.

Internationalization (i18n)

- Use the `t` function from `$lib/i18n` to translate strings:

  ```svelte
  <script>
    import { t } from "$lib/i18n/index.svelte.ts";
  </script>

  <h1>{t("welcome_message")}</h1>
  ```

- Support multiple languages and RTL layouts.
- Store and update language files in '$lib/i18n/en.ts' and other language files.

Accessibility

- Ensure proper semantic HTML structure in Svelte components.
- Implement ARIA attributes where necessary.
- Ensure keyboard navigation support for interactive elements.
- Use Svelte's bind:this for managing focus programmatically.

Key Conventions

1. Embrace Svelte's simplicity and avoid over-engineering solutions.
2. Use SvelteKit for full-stack applications with SSR and API routes.
3. Prioritize Web Vitals (LCP, FID, CLS) for performance optimization.
4. Use environment variables for configuration management.
5. Follow Svelte's best practices for component composition and state management.
6. Ensure cross-browser compatibility by testing on multiple platforms.
7. Keep your Svelte and SvelteKit versions up to date.

Documentation

- Svelte Documentation: https://svelte.dev/docs/svelte/overview
- Svelte 5 Runes: https://svelte.dev/docs/svelte/what-are-runes

Refer to Svelte documentation for detailed information on components and best practices.

