/**
 * The root entry: the toast and the helpers. Neither is built on Base UI,
 * so an app that imports only these loads none of it, and `@base-ui/react`
 * is an optional peer. The components are built on Base UI and export from
 * `@dalin/kit/components` alone: re-exported here, they would load Base UI
 * for every app that imports the toast.
 */
export * from "./toast/index.js";
export * from "./helpers/index.js";
//# sourceMappingURL=index.js.map