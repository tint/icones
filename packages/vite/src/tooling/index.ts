// Build/import entry: no Vite hooks or plugin initialization.
export { iconToElementData, svgToElementData } from "./elements.ts"
export { createIconSymbolDocument } from "./symbol.ts"
export {
  collectionEntry,
  collectionStyles,
  supportsCollectionIcon,
  createCollectionManifest,
  serializeCollectionManifest,
  updateCollectionManifest,
} from "./collections.ts"
