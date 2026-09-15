import { paths } from "../shared/routing/paths.ts"
import { guideRoutes } from "../features/guide/routing.ts"
import { languages, languageHref } from "../shared/i18n/locale-routing.ts"

export const prerenderPaths = languages.flatMap((language) =>
  [...Object.values(paths), ...guideRoutes].map((path) =>
    languageHref(language, path)
  )
)
