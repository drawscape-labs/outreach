# Catalyst UI Kit Components

This directory contains UI components that were sourced from the [Catalyst UI Kit](https://tailwindui.com/catalyst) by the Tailwind CSS team.

Catalyst is a starter kit for building your own component systems with React and Tailwind CSS. These components are designed to be production-ready, accessible, and easy to customize for your own needs.

## About Catalyst

Catalyst provides a collection of beautiful, production-ready UI components you can drop into your projects. It's built with React and Tailwind CSS, but is framework-agnostic and can be used with Next.js, Remix, Inertia, or any React project.

**Note:** Catalyst components are built around Tailwind's default theme configuration. If you've made significant changes to your Tailwind theme, you may need to adapt the components accordingly.

## Getting Started

1. **Install dependencies:**

   ```bash
   npm install @headlessui/react motion clsx
   npm install tailwindcss@latest
   ```

2. **(Optional) Install Heroicons:**

   ```bash
   npm install @heroicons/react
   ```

3. **(Optional) Use the Inter font:**

   Add to your HTML:

   ```html
   <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
   ```

   And update your theme variable:

   ```css
   @theme {
     --font-sans: Inter, sans-serif;
     --font-sans--font-feature-settings: 'cv11';
   }
   ```

## Client-side Router Integration

By default, the Catalyst `Link` component renders a plain `<a>` element. You should update this to use the link component provided by your routing library.

**For this project (Next.js App Router):**

Update your `Link` component to use the `Link` from `next/link`.

## Project Usage

Treat the files in `src/components/ui/` as vendor-sourced base primitives.

When the app needs project-specific styling, layout, or behavior, prefer wrapping a Catalyst component in `src/components/` instead of editing the file in `src/components/ui/` directly.
