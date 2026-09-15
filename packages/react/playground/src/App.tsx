import { Icon, IconConfig } from "../../src"
export function App() {
  return (
    <IconConfig
      sources={{
        example: [
          ["path", { d: "M4 12h16m-6-6 6 6-6 6", stroke: "currentColor" }],
        ],
      }}
      api={false}
    >
      <main>
        <h1>Icones React</h1>
        <Icon name="example" size={48} aria-label="Arrow right" />
      </main>
    </IconConfig>
  )
}
