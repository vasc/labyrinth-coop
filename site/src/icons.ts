import {
  Bell,
  Bird,
  BookOpen,
  Bug,
  Coins,
  Compass,
  Crown,
  Feather,
  Gem,
  Ghost,
  Hourglass,
  Key,
  Map as MapIcon,
  Rat,
  Scroll,
  Shell,
  Shield,
  Skull,
  Snail,
  Sword,
  Telescope,
  Trophy,
  Turtle,
  WandSparkles,
} from "lucide";
import { SVG_NS, svgEl } from "./svg";

type IconNode = typeof Crown;

export type { IconNode };

/**
 * One Lucide icon per treasure id (0-23), the same ids the simulator uses. The names live in the dictionaries
 * (site/src/i18n), in the same order: Crown, Gem, Key, Sword, Shield, Skull, Ghost, Beetle, Bird, Rat, Turtle, Snail,
 * Book, Map, Scroll, Hourglass, Bell, Trophy, Feather, Shell, Compass, Coins, Wand, Telescope.
 */
export const TREASURE_ICONS: readonly IconNode[] = [
  Crown,
  Gem,
  Key,
  Sword,
  Shield,
  Skull,
  Ghost,
  Bug,
  Bird,
  Rat,
  Turtle,
  Snail,
  BookOpen,
  MapIcon,
  Scroll,
  Hourglass,
  Bell,
  Trophy,
  Feather,
  Shell,
  Compass,
  Coins,
  WandSparkles,
  Telescope,
];

export const treasureIcon = (id: number): IconNode => {
  const found = TREASURE_ICONS[id];
  if (found === undefined) throw new Error(`no treasure ${id}`);
  return found;
};

/** Draws a 24×24 Lucide icon centred on (x, y) at `size` pixels. */
export const drawIcon = (parent: Element, icon: IconNode, size: number, x: number, y: number): SVGGElement => {
  const g = svgEl("g", { class: "icon", transform: `translate(${x - size / 2},${y - size / 2}) scale(${size / 24})` }, parent);
  for (const [tag, attrs] of icon) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) if (value !== undefined) node.setAttribute(name, String(value));
    g.appendChild(node);
  }
  return g;
};
