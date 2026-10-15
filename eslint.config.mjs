import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Emoji render differently on every device and read aloud literally, so the
// interface uses <Icon name="…" /> (src/components/ui/Icon.tsx) instead.
// Emoji typed by people (chat messages) are data, not source, and unaffected.
const EMOJI = /\p{Extended_Pictographic}/u;
const noEmoji = {
  meta: {
    type: "problem",
    docs: { description: "Disallow emoji in strings and JSX text; use the Icon component" },
    messages: { emoji: "Emoji aren't allowed in the interface. Use <Icon name=\"…\" /> from @/components/ui/Icon instead." },
    schema: [],
  },
  create(context) {
    const check = (node, text) => {
      if (typeof text === "string" && EMOJI.test(text)) context.report({ node, messageId: "emoji" });
    };
    return {
      Literal: (node) => check(node, node.value),
      TemplateElement: (node) => check(node, node.value.cooked),
      JSXText: (node) => check(node, node.value),
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { togetherfit: { rules: { "no-emoji": noEmoji } } },
    rules: { "togetherfit/no-emoji": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
