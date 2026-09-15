/** Build-time Guide snapshot. No application imports are needed at runtime. */
export type DocumentationSnapshot = {
  version: number
  introduction: string
  topics: { id: string; title: string }[]
  shared: { id: string; title: string; markdown: string }[]
  frameworks: Record<
    string,
    {
      name: string
      tracks: Record<
        string,
        {
          title: string
          chapters: { id: string; title: string; markdown: string }[]
        }
      >
    }
  >
}
