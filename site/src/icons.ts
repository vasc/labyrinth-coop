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

export type Treasure = { name: string; icon: IconNode };

/** One Lucide icon per treasure id (0-23), the same ids the simulator uses. */
export const TREASURES: readonly Treasure[] = [
  { name: "Crown", icon: Crown },
  { name: "Gem", icon: Gem },
  { name: "Key", icon: Key },
  { name: "Sword", icon: Sword },
  { name: "Shield", icon: Shield },
  { name: "Skull", icon: Skull },
  { name: "Ghost", icon: Ghost },
  { name: "Beetle", icon: Bug },
  { name: "Bird", icon: Bird },
  { name: "Rat", icon: Rat },
  { name: "Turtle", icon: Turtle },
  { name: "Snail", icon: Snail },
  { name: "Book", icon: BookOpen },
  { name: "Map", icon: MapIcon },
  { name: "Scroll", icon: Scroll },
  { name: "Hourglass", icon: Hourglass },
  { name: "Bell", icon: Bell },
  { name: "Trophy", icon: Trophy },
  { name: "Feather", icon: Feather },
  { name: "Shell", icon: Shell },
  { name: "Compass", icon: Compass },
  { name: "Coins", icon: Coins },
  { name: "Wand", icon: WandSparkles },
  { name: "Telescope", icon: Telescope },
];

export const treasure = (id: number): Treasure => {
  const found = TREASURES[id];
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
