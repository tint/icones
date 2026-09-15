import type { ESTree } from "vite"

type Node = { type: string; [key: string]: unknown }
function node(value: unknown): value is Node {
  return !!value && typeof value === "object" && "type" in value
}
// Traverse all AST child nodes while ignoring primitive fields.
function children(value: Node): Node[] {
  return Object.values(value).flatMap((value) =>
    Array.isArray(value) ? value.filter(node) : node(value) ? [value] : []
  )
}
function identifier(value: unknown): string | undefined {
  return node(value) && value.type === "Identifier"
    ? String(value.name)
    : undefined
}
// Supports both string literals and no-interpolation template literals.
function literal(value: unknown): string | undefined {
  if (!node(value)) return
  if (value.type === "Literal" && typeof value.value === "string")
    return value.value
  if (
    value.type === "TemplateLiteral" &&
    Array.isArray(value.expressions) &&
    !value.expressions.length
  ) {
    const quasi = (value.quasis as Node[])[0]
    return (quasi?.value as { cooked?: string })?.cooked
  }
}

/** Inspect compiled framework calls, with import bindings and lexical shadowing. */
export function collectStaticNames(
  program: ESTree.Program,
  additionalSources: readonly string[] = [],
  vueSfc = false
) {
  const root = program as unknown as Node
  const icons = new Set<string>()
  const iconNamespaces = new Set<string>()
  const factories = new Set<string>()
  const factoryNamespaces = new Set<string>()
  const direct = new Map<string, number>()
  const astroFactories = new Set<string>()
  const vueUnwrap = new Set<string>()
  const vueBindings = new Set<string>()
  const sources = new Set([
    "@icones/react",
    "@icones/vue",
    "@icones/svelte",
    "@icones/solidjs",
    "@icones/astro",
    ...additionalSources,
  ])
  const factoryMembers = [
    "createElement",
    "jsx",
    "jsxs",
    "jsxDEV",
    "h",
    "createVNode",
    "createBlock",
    "createComponent",
    "ssrRenderComponent",
  ]
  for (const statement of children(root)) {
    if (statement.type !== "ImportDeclaration") continue
    const from = literal(statement.source)
    for (const specifier of statement.specifiers as Node[]) {
      const local = identifier(specifier.local)!
      const imported =
        identifier(specifier.imported) ?? literal(specifier.imported)
      if (sources.has(from!)) {
        if (imported === "Icon" || from === "@icones/astro/Icon.astro")
          icons.add(local)
        if (specifier.type === "ImportNamespaceSpecifier")
          iconNamespaces.add(local)
      }
      if (from === "@icones/astro/Icon.astro") icons.add(local)
      if (from === "@icones/vanilla") {
        if (imported === "createIcon") direct.set(local, 0)
        if (imported === "mountIcon") direct.set(local, 1)
        if (specifier.type === "ImportNamespaceSpecifier")
          iconNamespaces.add(local)
      }
      if (
        [
          "react",
          "react/jsx-runtime",
          "react/jsx-dev-runtime",
          "vue",
          "vue/server-renderer",
          "@vue/server-renderer",
          "solid-js",
          "solid-js/web",
        ].includes(from!)
      ) {
        if (factoryMembers.includes(imported!)) factories.add(local)
        if (
          specifier.type === "ImportNamespaceSpecifier" ||
          specifier.type === "ImportDefaultSpecifier"
        )
          factoryNamespaces.add(local)
      }
      if (from === "vue" && imported === "unref") vueUnwrap.add(local)
      if (from?.startsWith("astro/") && imported === "renderComponent")
        astroFactories.add(local)
    }
  }
  const names = new Set<string>()
  // Track imports/namespaces/factories from the top-level import table once, then reuse.
  function matches(
    value: unknown,
    imports: Set<string>,
    namespaces: Set<string>,
    members: string[],
    shadowed: Set<string>
  ) {
    const name = identifier(value)
    if (name) return imports.has(name) && !shadowed.has(name)
    if (!node(value) || value.type !== "MemberExpression") return false
    const object = identifier(value.object)
    const member = value.computed
      ? literal(value.property)
      : identifier(value.property)
    return (
      !!object &&
      namespaces.has(object) &&
      !shadowed.has(object) &&
      members.includes(member!)
    )
  }
  function propertyName(prop: Node) {
    const key = prop.computed
      ? literal(prop.key)
      : (identifier(prop.key) ?? literal(prop.key))
    return key?.replace(/-([a-z])/g, (_, letter: string) =>
      letter.toUpperCase()
    )
  }
  function isIcon(
    value: unknown,
    shadowed: Set<string>,
    setupParameter?: string
  ): boolean {
    if (matches(value, icons, iconNamespaces, ["Icon"], shadowed)) return true
    if (!node(value)) return false
    if (
      value.type === "CallExpression" &&
      matches(value.callee, vueUnwrap, factoryNamespaces, ["unref"], shadowed)
    )
      return matches(
        (value.arguments as Node[])[0],
        icons,
        iconNamespaces,
        ["Icon"],
        shadowed
      )
    if (
      setupParameter &&
      value.type === "MemberExpression" &&
      identifier(value.object) === setupParameter
    ) {
      const member = value.computed
        ? literal(value.property)
        : identifier(value.property)
      return vueBindings.has(member!)
    }
    return false
  }
  // Reads icon option objects from JSX/VDOM props while skipping non-icon keys.
  function collect(value: Node | undefined) {
    if (value?.type !== "ObjectExpression") return
    const props = value.properties as Node[]
    const hasData = props.some((prop) => propertyName(prop) === "data")
    const hasAltData = props.some((prop) => propertyName(prop) === "altData")
    for (let index = 0; index < props.length; index++) {
      const prop = props[index]
      const key = propertyName(prop)
      if (
        !["name", "data", "icon", "altName", "altData", "altIcon"].includes(
          key!
        )
      )
        continue
      if (key === "name" && hasData) continue
      if ((key === "altName" || key === "altIcon") && hasAltData) continue
      if (
        props
          .slice(index + 1)
          .some(
            (next) =>
              next.type === "SpreadElement" || propertyName(next) === key
          )
      )
        continue
      let value = prop.value
      // Solid/Svelte can wrap a static expression in a property getter.
      if (prop.kind === "get" && node(value) && node(value.body)) {
        const body = value.body.body as Node[]
        value =
          body?.length === 1 && body[0].type === "ReturnStatement"
            ? body[0].argument
            : undefined
      }
      const name = literal(value)
      if (
        name &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)
      )
        names.add(name)
    }
  }
  // AST walk keeps a copy-on-write `shadowed` set to honor lexical scoping.
  function visit(
    current: Node,
    shadowed: Set<string>,
    setupParameter?: string
  ) {
    if (
      [
        "FunctionDeclaration",
        "FunctionExpression",
        "ArrowFunctionExpression",
        "BlockStatement",
        "CatchClause",
        "ForStatement",
        "ForInStatement",
        "ForOfStatement",
        "SwitchStatement",
      ].includes(current.type)
    ) {
      shadowed = new Set(shadowed)
      for (const name of scopeBindings(current)) {
        shadowed.add(name)
        if (name === setupParameter) setupParameter = undefined
      }
      if (vueSfc && current.type === "FunctionDeclaration") {
        const name = identifier(current.id)
        const params = current.params as Node[]
        if (name === "_sfc_render") setupParameter = identifier(params[3])
        if (name === "_sfc_ssrRender") setupParameter = identifier(params[5])
      }
    }
    // Vue's non-inline script-setup compiler exposes imports through this object.
    if (
      vueSfc &&
      current.type === "VariableDeclarator" &&
      identifier(current.id) === "__returned__" &&
      node(current.init) &&
      current.init.type === "ObjectExpression"
    ) {
      for (const prop of current.init.properties as Node[]) {
        let value = prop.value
        if (prop.kind === "get" && node(value) && node(value.body)) {
          const body = value.body.body as Node[]
          value =
            body?.length === 1 && body[0].type === "ReturnStatement"
              ? body[0].argument
              : undefined
        }
        if (matches(value, icons, iconNamespaces, ["Icon"], shadowed))
          vueBindings.add(propertyName(prop)!)
      }
    }
    if (current.type === "CallExpression") {
      const args = current.arguments as Node[]
      const callee = identifier(current.callee)
      if (
        matches(
          current.callee,
          factories,
          factoryNamespaces,
          factoryMembers,
          shadowed
        ) &&
        isIcon(args[0], shadowed, setupParameter)
      )
        collect(args[1])
      // Svelte's compiled client and server functions take (anchor/payload, props).
      else if (
        matches(current.callee, icons, iconNamespaces, ["Icon"], shadowed)
      )
        collect(args[1])
      else if (
        callee &&
        astroFactories.has(callee) &&
        !shadowed.has(callee) &&
        matches(args[2], icons, iconNamespaces, ["Icon"], shadowed)
      )
        collect(args[3])
      else if (callee && direct.has(callee) && !shadowed.has(callee))
        collect(args[direct.get(callee)!])
      else if (
        matches(
          current.callee,
          new Set(),
          iconNamespaces,
          ["createIcon"],
          shadowed
        )
      )
        collect(args[0])
      else if (
        matches(
          current.callee,
          new Set(),
          iconNamespaces,
          ["mountIcon"],
          shadowed
        )
      )
        collect(args[1])
    }
    children(current).forEach((child) => visit(child, shadowed, setupParameter))
  }
  visit(root, new Set())
  return [...names].sort()
}

// Resolve identifiers bound in a scope so shadowed variables are not treated as icon imports.
function scopeBindings(scope: Node) {
  const names = new Set<string>()
  function binding(pattern: unknown) {
    if (!node(pattern)) return
    const name = identifier(pattern)
    if (name) names.add(name)
    else if (pattern.type === "ObjectPattern")
      (pattern.properties as Node[]).forEach((prop) =>
        binding(prop.type === "RestElement" ? prop.argument : prop.value)
      )
    else if (pattern.type === "ArrayPattern")
      (pattern.elements as unknown[]).forEach(binding)
    else if (pattern.type === "AssignmentPattern") binding(pattern.left)
    else if (pattern.type === "RestElement") binding(pattern.argument)
  }
  if (scope.type.includes("Function")) {
    binding(scope.id)
    ;(scope.params as unknown[]).forEach(binding)
  }
  if (scope.type === "CatchClause") binding(scope.param)
  function declaration(current: unknown) {
    if (!node(current)) return
    if (current.type === "VariableDeclaration")
      (current.declarations as Node[]).forEach((declarator) =>
        binding(declarator.id)
      )
    else if (
      current.type === "FunctionDeclaration" ||
      current.type === "ClassDeclaration"
    )
      binding(current.id)
    else if (current.type === "ExportNamedDeclaration")
      declaration(current.declaration)
  }
  function scanVars(current: Node) {
    if (current.type.includes("Function") || current.type.startsWith("Class"))
      return
    if (current.type === "VariableDeclaration" && current.kind === "var")
      declaration(current)
    children(current).forEach(scanVars)
  }
  if (scope.type.includes("Function") && node(scope.body)) scanVars(scope.body)
  if (scope.type === "BlockStatement")
    (scope.body as Node[]).forEach(declaration)
  if (scope.type.startsWith("For")) declaration(scope.init ?? scope.left)
  if (scope.type === "SwitchStatement")
    (scope.cases as Node[]).forEach((item) =>
      (item.consequent as Node[]).forEach(declaration)
    )
  return names
}
