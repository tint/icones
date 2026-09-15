import React from "react"
import { reactAttributeName } from "@icones/core/elements"
import {
  renderIcon,
  selectIconSource,
  createIconSourceValidator,
  type IconOptions,
} from "@icones/core/presentation"
import { useIconConfig } from "./size-config"
import type { Size } from "./config.tsx"
import { useIconData } from "./use-icon-data.ts"

export type IconProps = Omit<
  React.SVGProps<SVGSVGElement>,
  | "children"
  | "dangerouslySetInnerHTML"
  | "height"
  | "name"
  | "rotate"
  | "width"
  | "strokeWidth"
> &
  IconOptions<Size> & {
    fallback?: React.ReactNode
  }

export function Icon(props: IconProps): React.ReactNode {
  // Validate mutually exclusive source inputs on each render.
  const validateSources = React.useMemo(() => createIconSourceValidator(), [])
  validateSources(props)
  const { source, name: selectedName } = selectIconSource(props)
  const {
    data: _data,
    icon: _icon,
    altIcon: _altIcon,
    altName: _altName,
    altData: _altData,
    showAlt: _showAlt,
    name: _name,
    size,
    width,
    height,
    color,
    fill,
    strokeWidth,
    absoluteStrokeWidth,
    rotate,
    hFlip,
    vFlip,
    loader,
    fallback,
    style,
    "aria-label": label,
    "aria-hidden": hidden,
    role,
    ...svgProps
  } = props
  const config = useIconConfig()
  const {
    data,
    fill: sourceFill,
    href,
    viewBox,
    status,
  } = useIconData(source, loader)
  const instanceId = React.useId()
  // Native attributes, events and user styles do not invalidate the SVG body.
  // Read state fields individually: inline useIconData results are new objects.
  const result = React.useMemo(() => {
    const rendered = renderIcon(
      { data, fill: sourceFill, href, viewBox, status },
      {
        ...(typeof source === "string"
          ? { name: source }
          : { data: source, name: selectedName }),
        size,
        width,
        height,
        color,
        fill,
        strokeWidth,
        absoluteStrokeWidth,
        rotate,
        hFlip,
        vFlip,
        "aria-label": label,
        "aria-hidden": hidden,
        role,
      },
      config,
      instanceId
    )
    return {
      ...rendered,
      attributes: Object.fromEntries(
        Object.entries(rendered.attributes).map(([key, value]) => [
          reactAttributeName(key),
          value,
        ])
      ) as React.SVGProps<SVGSVGElement>,
    }
  }, [
    absoluteStrokeWidth,
    color,
    config,
    data,
    fill,
    height,
    hFlip,
    hidden,
    href,
    instanceId,
    label,
    selectedName,
    role,
    rotate,
    size,
    source,
    sourceFill,
    status,
    strokeWidth,
    vFlip,
    viewBox,
    width,
  ])
  const innerHTML = React.useMemo(
    () => ({ __html: result.body }),
    [result.body]
  )

  // Keep fallback contract stable while icon data resolves asynchronously.
  if (!result.available && fallback !== undefined) return fallback

  const { xmlns, xmlnsXlink, ...attributes } = result.attributes
  return (
    <svg
      xmlns={xmlns}
      xmlnsXlink={xmlnsXlink}
      {...svgProps}
      {...attributes}
      style={{ ...result.style, ...style } as React.CSSProperties}
      dangerouslySetInnerHTML={innerHTML}
    />
  )
}
