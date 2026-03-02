import { defineConfig } from "@terrazzo/cli"
import css from "@terrazzo/plugin-css"

export default defineConfig({
  // Use the resolver file as the entry point for tokens
  tokens: ["./json/tokens/canonical/storybook.resolver.json"],

  // Output directory for generated files
  outDir: "./dist/",

  plugins: [
    css({
      filename: "tokens.css",
      permutations: [
        {
          input: { theme: "light" },
          prepare: (css) => `:root {\n  color-scheme: light;\n  ${css}\n}`,
        },
        {
          input: { theme: "dark" },
          include: ["semantic.color.**"],
          prepare: (css) =>
            `@media (prefers-color-scheme: dark) {\n  :root {\n    color-scheme: dark;\n    ${css}\n  }\n}\n\n[data-theme="dark"] {\n  color-scheme: dark;\n  ${css}\n}`,
        },
      ],
      exclude: "primitive.number.**",
    }),
  ],

  // Optional: Ignore specific tokens or deprecated tokens
  ignore: {
    deprecated: true,
  },
})
