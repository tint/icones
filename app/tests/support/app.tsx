// Declarative harness retained for isolated component tests; production uses root.tsx and route modules.
import { lazy, Suspense } from "react"
import { Route, Routes } from "react-router"
import { AppShell } from "../../src/app/app-shell.tsx"
import { paths } from "../../src/shared/routing/paths.ts"
const IconsPage = lazy(() => import("../../src/routes/icons-page.tsx"))
const HomePage = lazy(() => import("../../src/routes/home-page.tsx"))
const GuidePage = lazy(() => import("../../src/routes/guide-page.tsx"))
const PackagesPage = lazy(() => import("../../src/routes/packages-page.tsx"))
const LlmsPage = lazy(() => import("../../src/routes/llms-page.tsx"))
const LicensesPage = lazy(() => import("../../src/routes/licenses-page.tsx"))
const McpPage = lazy(() => import("../../src/routes/mcp-page.tsx"))
const NotFoundPage = lazy(() => import("../../src/routes/not-found-page.tsx"))

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<p role="status">Loading page…</p>}>
        <Routes>
          <Route path={paths.home} element={<HomePage />} />
          <Route path={paths.icons} element={<IconsPage />} />
          <Route path={paths.guide + "/*"} element={<GuidePage />} />
          <Route path={paths.licenses} element={<LicensesPage />} />
          <Route path={paths.packages} element={<PackagesPage />} />
          <Route path={paths.llms} element={<LlmsPage />} />
          <Route path={paths.mcp} element={<McpPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}
