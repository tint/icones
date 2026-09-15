// Pinned upstream revisions. This is a small source list, never a per-icon manifest.
export const officialSources = {
  tabler: {
    repo: "tabler/tabler-icons",
    revision: "55f87a73f45cf1d9eaf16d7da705065483a9e4f9",
    license: "LICENSE",
  },
  bootstrap: {
    repo: "twbs/icons",
    // Bootstrap Icons v1.13.1.
    revision: "ce0e49dd063243118a115f17ad1fe1fe7576d552",
    license: "LICENSE",
  },
  antd: {
    repo: "ant-design/ant-design-icons",
    revision: "7f2516ac91226d2b41f93b35cb5197c8d94f7189",
    license: "LICENSE",
    styles: ["outlined", "filled"],
  },
  phosphor: {
    repo: "phosphor-icons/homepage",
    revision: "7a57592e564f9ba7996ebac05be5b0546464fb9c",
    license: "LICENSE",
    archivePath: "public/assets/phosphor-icons.zip",
    // Only these two source directories belong to the current resource package.
    styles: ["regular", "fill"],
  },
  lucide: {
    repo: "lucide-icons/lucide",
    revision: "75955ec47b764f253ded2baea7a1c2b3ec64efec",
    license: "LICENSE",
  },
  "circle-flags": {
    repo: "HatScripts/circle-flags",
    revision: "379588b5da95482d6bbf10bd45644a35b0609ea6",
    license: "LICENSE.md",
  },
  flag: {
    repo: "lipis/flag-icons",
    revision: "086f7e97d657358203916dbe84f61c2bccaa81eb",
    license: "LICENSE",
  },
} as const

export type ArchiveSource = keyof typeof officialSources
export const supportedSets = [
  "tabler",
  "brand",
  "bootstrap",
  "antd",
  "phosphor",
  "lucide",
  "hugeicons",
  "circle-flags",
  "flag",
] as const
export type SupportedSet = (typeof supportedSets)[number]
