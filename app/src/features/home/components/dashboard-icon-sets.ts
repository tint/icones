export const dashboardIconSets = [
  { id: "tabler", label: "Tabler" },
  { id: "lucide", label: "Lucide" },
  { id: "phosphor", label: "Phosphor" },
  { id: "bootstrap", label: "Bootstrap" },
  { id: "antd", label: "Ant Design" },
  { id: "huge", label: "Hugeicons" },
] as const

export type DashboardIconSet = (typeof dashboardIconSets)[number]["id"]
