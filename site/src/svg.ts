export const SVG_NS = "http://www.w3.org/2000/svg";

export const svgEl = <K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
  parent?: Element,
): SVGElementTagNameMap[K] => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  parent?.appendChild(node);
  return node;
};
