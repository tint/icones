import { bindIcons } from "./standard"
export type { IconBinding } from "./standard"

// Opt-in standard HTML observer. Does not register a custom element.
export const standardElements = bindIcons()
