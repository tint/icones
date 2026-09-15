import { describe, expect, test } from "bun:test"
import { parseAst } from "vite"
import { collectStaticNames } from "../../vite/src/collect"

describe("framework static icon collection", () => {
  test("altData mirrors data extraction and takes precedence over altName", () => {
    const code =
      'import { Icon } from "@icones/svelte"; Icon(a, {name: "tabler:star", altName: "unused:alt", altIcon: "unused:legacy", altData: tuples}); Icon(a, {data: "tabler:check", altData: "tabler:heart"}); Icon(a, {data: tuples, name: "unused:main", "alt-name": "unused:alternate", "alt-data": tuples})'
    expect(collectStaticNames(parseAst(code))).toEqual([
      "tabler:check",
      "tabler:heart",
      "tabler:star",
    ])
  })
  test.each([
    [
      'import { Icon as I } from "@icones/vue"; import { createVNode as v, h } from "vue"; v(I, {name: "tabler:star"}); h(I, {altName: "tabler:heart"})',
    ],
    [
      'import { Icon as I } from "@icones/solidjs"; import { createComponent as c } from "solid-js/web"; c(I, {name: "tabler:star", get altName() {return "tabler:heart"}})',
    ],
    [
      'import { Icon as I } from "@icones/svelte"; I(anchor, {name: "tabler:star", altName: "tabler:heart"})',
    ],
    [
      'import { Icon as I } from "@icones/astro"; import { renderComponent as r } from "astro/runtime/server/index.js"; r(result, "I", I, {name: "tabler:star", altName: "tabler:heart"})',
    ],
    [
      'import I from "@icones/astro/Icon.astro"; import { renderComponent as r } from "astro/runtime/server/index.js"; r(result, "I", I, {name: "tabler:star", altName: "tabler:heart"})',
    ],
    [
      'import { createIcon as c, mountIcon as m } from "@icones/vanilla"; c({name: "tabler:star"}); m(target, {name: "tabler:heart"})',
    ],
    [
      'import * as icons from "@icones/vanilla"; icons.createIcon({name: "tabler:star"}); icons.mountIcon(target, {name: "tabler:heart"})',
    ],
  ])("handles compiled framework code: %s", (code) => {
    expect(collectStaticNames(parseAst(code))).toEqual([
      "tabler:heart",
      "tabler:star",
    ])
  })
  test("does not collect shadowed, dynamic or overridden names", () => {
    const code =
      'import { Icon } from "@icones/svelte"; import { createIcon } from "@icones/vanilla"; function nested(Icon, createIcon) {Icon(a, {name: "tabler:fake"}); createIcon({name: "tabler:fake"})} Icon(a, {get name() {return dynamic}}); Icon(a, {name: "tabler:fake", ...options}); Icon(a, {data: set, name: "tabler:fake"})'
    expect(collectStaticNames(parseAst(code))).toEqual([])
  })
  test("understands Vue script-setup bindings, unref and kebab-case props", () => {
    const code =
      'import {Icon as I} from "@icones/vue"; import {createVNode as v, unref as u} from "vue"; const component = { setup() {const __returned__ = { get I() {return I} }; return __returned__} }; function _sfc_render(c,cache,props,$setup) { v($setup.I, {name:"tabler:star", "alt-name":"tabler:heart"}) }; v(u(I), {name:"tabler:check"})'
    expect(collectStaticNames(parseAst(code), [], true)).toEqual([
      "tabler:check",
      "tabler:heart",
      "tabler:star",
    ])
  })
})
