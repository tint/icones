// Generated from collection manifests. Do not edit by hand.
// Run: bun run generate:names
// 8 collections, 20823 canonical icon names.

export interface IconNamesBySet {
  "antd": import("./antd.js").IconName
  "bootstrap": import("./bootstrap.js").IconName
  "brand": import("./brand.js").IconName
  "flag": import("./flag.js").IconName
  "huge": import("./huge.js").IconName
  "lucide": import("./lucide.js").IconName
  "phosphor": import("./phosphor.js").IconName
  "tabler": import("./tabler.js").IconName
}

export type IconSetName = keyof IconNamesBySet
export type IconName<Set extends IconSetName = IconSetName> = IconNamesBySet[Set]
