import { defineConfig } from "@terrazzo/cli"
import css from "@terrazzo/plugin-css"
import figmaJson from "terrazzo-plugin-figma-json"

export default defineConfig({
  // Use the resolver file as the entry point for tokens
  tokens: ["./json/tokens/canonical/apps.resolver.json"],

  // Output directory for generated files
  outDir: "./dist/",

  plugins: [
    css({
      filename: "tokens.css",
      permutations: [
        {
          input: { theme: "light", breakpoint: "small" },
          prepare: (css) => `:root {\n  color-scheme: light;\n  ${css}\n}`,
        },
        {
          input: { theme: "dark" },
          include: ["semantic.color.**"],
          prepare: (css) =>
            `@media (prefers-color-scheme: dark) {\n  :root {\n    color-scheme: dark;\n    ${css}\n  }\n}\n\n[data-theme="dark"] {\n  color-scheme: dark;\n  ${css}\n}`,
        },
        {
          input: { breakpoint: "medium" },
          include: ["semantic.dimension.**"],
          prepare: (css) =>
            `@media (min-width: 640px) {\n  :root {\n    ${css}\n  }\n}`,
        },
        {
          input: { breakpoint: "large" },
          include: ["semantic.dimension.**"],
          prepare: (css) =>
            `@media (min-width: 1024px) {\n  :root {\n    ${css}\n  }\n}`,
        },
        {
          input: { breakpoint: "xLarge" },
          include: ["semantic.dimension.**"],
          prepare: (css) =>
            `@media (min-width: 1440px) {\n  :root {\n    ${css}\n  }\n}`,
        },
      ],
    }),
    figmaJson({
      // Output filename suffix (plugin will split by resolver sets/contexts)
      filename: "tokens.figma.json",

      // Base pixel value for rem to px conversion
      remBasePx: 16,

      // Preserve token aliases in output for Figma variable references
      preserveReferences: true,

      // Log warnings for unsupported token types (shadow, border, gradient, etc.)
      warnOnUnsupported: true,
    }),
  ],

  // Optional: Ignore specific tokens or deprecated tokens
  ignore: {
    deprecated: true,
  },
})
