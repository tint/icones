// Runs before first paint; markup hydration leaves these theme-only attributes intact.
export const themeScript = `(() => {
  let theme = "system";
  try { const saved = localStorage.getItem("icones-theme"); if (saved === "light" || saved === "dark") theme = saved; } catch {}
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
})()`
