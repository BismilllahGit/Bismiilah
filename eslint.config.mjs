import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // These files only build @react-pdf/renderer JSX inside a server-only
    // Route Handler and call renderToBuffer() synchronously inside their
    // own try/catch — react-hooks' error-boundaries/purity rules assume
    // React DOM's reconciler, which doesn't apply to this rendering target.
    files: [
      "src/app/api/reports/pdf/route.tsx",
      "src/app/api/projects/*/boq/share-whatsapp/route.tsx",
    ],
    rules: {
      "react-hooks/error-boundaries": "off",
      "react-hooks/purity": "off",
    },
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
