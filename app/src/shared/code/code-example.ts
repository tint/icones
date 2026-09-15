import type { Translate } from "../i18n/language.ts"

export type CodeExample = {
  code: string
  /** Exact authored comments or quoted UI labels; never identifiers or data. */
  codeMessages?: readonly string[]
}

/** Opt-in localization. Unannotated code, downloads and protocol payloads stay intact. */
export function localizeExampleCode(
  example: CodeExample,
  t: Translate
): string {
  return (example.codeMessages ?? []).reduce(
    (code, message) => code.replaceAll(message, t(message)),
    example.code
  )
}
