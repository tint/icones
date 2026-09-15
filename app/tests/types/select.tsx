import { Select } from "../../src/shared/ui/select.tsx"

export const selectProps = (
  <Select
    options={[
      { value: "tabler", label: "Tabler" },
      { value: "lucide", label: "Lucide" },
    ]}
    defaultValue="tabler"
    onValueChange={(value) => {
      const selected: "tabler" | "lucide" | undefined = value
      void selected
    }}
  />
)

export const invalidSelectDefault = (
  <Select
    options={[{ value: "tabler", label: "Tabler" }]}
    // @ts-expect-error defaultValue does not widen options' inferred union.
    defaultValue="lucide"
  />
)
