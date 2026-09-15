export type ContentSectionData = {
  id: string
  title: string
  description: string
  items: readonly {
    title: string
    description: string
    link?: { href: string; label: string }
  }[]
}
