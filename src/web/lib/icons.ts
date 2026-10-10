import Activity from "@lucide/svelte/icons/activity";
import Apple from "@lucide/svelte/icons/apple";
import BicepsFlexed from "@lucide/svelte/icons/biceps-flexed";
import Bike from "@lucide/svelte/icons/bike";
import BookOpen from "@lucide/svelte/icons/book-open";
import Brain from "@lucide/svelte/icons/brain";
import Circle from "@lucide/svelte/icons/circle";
import Droplet from "@lucide/svelte/icons/droplet";
import Dumbbell from "@lucide/svelte/icons/dumbbell";
import Flame from "@lucide/svelte/icons/flame";
import Flower2 from "@lucide/svelte/icons/flower-2";
import Footprints from "@lucide/svelte/icons/footprints";
import HandFist from "@lucide/svelte/icons/hand-fist";
import HeartPulse from "@lucide/svelte/icons/heart-pulse";
import Leaf from "@lucide/svelte/icons/leaf";
import Moon from "@lucide/svelte/icons/moon";
import Mountain from "@lucide/svelte/icons/mountain";
import Music from "@lucide/svelte/icons/music";
import PersonStanding from "@lucide/svelte/icons/person-standing";
import Sailboat from "@lucide/svelte/icons/sailboat";
import Snowflake from "@lucide/svelte/icons/snowflake";
import Sparkles from "@lucide/svelte/icons/sparkles";
import Star from "@lucide/svelte/icons/star";
import Sun from "@lucide/svelte/icons/sun";
import Swords from "@lucide/svelte/icons/swords";
import Timer from "@lucide/svelte/icons/timer";
import TreePine from "@lucide/svelte/icons/tree-pine";
import Volleyball from "@lucide/svelte/icons/volleyball";
import Waves from "@lucide/svelte/icons/waves";
import Wind from "@lucide/svelte/icons/wind";
import Zap from "@lucide/svelte/icons/zap";
import type { Component } from "svelte";
import type { IconKey } from "../../shared/icons.ts";

export const ICON_COMPONENTS: Record<
  IconKey,
  Component<{ size?: number | string; strokeWidth?: number | string }>
> = {
  dumbbell: Dumbbell,
  biceps: BicepsFlexed,
  flower: Flower2,
  person: PersonStanding,
  footprints: Footprints,
  bike: Bike,
  waves: Waves,
  sailboat: Sailboat,
  mountain: Mountain,
  snowflake: Snowflake,
  volleyball: Volleyball,
  fist: HandFist,
  swords: Swords,
  heart: HeartPulse,
  timer: Timer,
  zap: Zap,
  flame: Flame,
  wind: Wind,
  leaf: Leaf,
  tree: TreePine,
  sun: Sun,
  moon: Moon,
  droplet: Droplet,
  apple: Apple,
  brain: Brain,
  book: BookOpen,
  music: Music,
  sparkles: Sparkles,
  star: Star,
  circle: Circle,
};

export const FallbackIcon = Activity;
