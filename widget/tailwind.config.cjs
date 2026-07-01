// Tailwind config for the embeddable widget.
//
// Output is compiled to widget/dist/widget.css and injected into the Shadow DOM
// (never the host document). Design tokens are CSS variables declared on :host
// (see src/styles.css) so the same utility classes resolve to the configured theme in
// light + dark (prefers-color-scheme). `.cjs` keeps this CommonJS even though the
// package is ESM ("type":"module").
/** @type {import("tailwindcss").Config} */
module.exports = {
  // Honour the host's prefers-color-scheme for any `dark:` utilities. The color
  // tokens themselves also swap via a media query on :host in styles.css.
  darkMode: "media",
  content: [
    `${__dirname}/src/**/*.{ts,tsx}`,
    `${__dirname}/harness.html`,
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--cc-font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Display face falls back to the body font when --cc-font-display is unset,
        // so a host page can set a distinct heading/display font independently.
        display: ["var(--cc-font-display, var(--cc-font-sans))", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        "cc-pop": {
          from: { opacity: "0", transform: "translateY(12px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // Subtle fade + rise for newly mounted messages.
        "cc-message-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Three-dot "typing" bounce (staggered per-dot via animationDelay).
        "cc-typing": {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.35" },
          "30%": { transform: "translateY(-3px)", opacity: "1" },
        },
      },
      animation: {
        "cc-pop": "cc-pop 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        "cc-message-in": "cc-message-in 0.26s cubic-bezier(0.16, 1, 0.3, 1)",
        "cc-typing": "cc-typing 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
