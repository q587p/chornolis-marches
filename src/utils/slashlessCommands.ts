export function slashlessCommandPattern(commands: string[]) {
  const escaped = commands
    .map((command) => command.trim())
    .filter(Boolean)
    .map((command) => command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (!escaped.length) throw new Error("slashlessCommandPattern needs at least one command.");
  return new RegExp(`^(?:${escaped.join("|")})(?:\\s+(.+))?$`, "i");
}
