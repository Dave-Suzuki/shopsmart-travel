export const PRIORITY_LEVELS = [
  { level: 5, icon: "🔥", label: "Must Buy", color: "#EF4444" },
  { level: 4, icon: "❤️", label: "Really Want", color: "#F59E0B" },
  { level: 3, icon: "⭐", label: "Want", color: "#3B82F6" },
  { level: 2, icon: "👍", label: "Nice to Have", color: "#10B981" },
  { level: 1, icon: "💭", label: "Maybe", color: "#6B7280" },
] as const;

export type PriorityLevel = typeof PRIORITY_LEVELS[number]['level'];
