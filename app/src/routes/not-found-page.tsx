import { useLanguage } from "../shared/i18n/language.ts"
import { PageIntro } from "../shared/ui/page-intro.tsx"
import { ActionLink } from "../shared/ui/action-link.tsx"
import { paths } from "../shared/routing/paths.ts"
export default function NotFoundPage() {
  const { t } = useLanguage()

  return (
    <PageIntro
      eyebrow="404 · Page not found"
      title={t("This page is not in the collection.")}
      description="The address may have changed. Browse the icon catalog or open the developer guide to continue."
    >
      <ActionLink href={paths.icons} variant="solid">
        {t("Browse icons")}
      </ActionLink>
      <ActionLink href={paths.guide}>{t("Developer guide")}</ActionLink>
    </PageIntro>
  )
}
