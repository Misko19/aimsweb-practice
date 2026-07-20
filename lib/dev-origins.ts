const DEFAULT_DEV_ORIGINS = ["127.0.0.1", "localhost"] as const;

export function parseAllowedDevOrigins(raw?: string): string[] {
  const configured = (raw ?? "")
    .split(",")
    .map((origin) => origin.trim().toLowerCase())
    .filter(Boolean);

  for (const origin of configured) {
    const bracketedIpv6 = /^\[[0-9a-f:.]+\]$/i.test(origin);
    if (origin.includes("*") || origin.includes("://") || origin.includes("/") || (origin.includes(":") && !bracketedIpv6)) {
      throw new Error(`Invalid ALLOWED_DEV_ORIGINS entry "${origin}". Use a bare hostname or IP address without a scheme, port, path, or wildcard.`);
    }
  }

  return [...new Set([...DEFAULT_DEV_ORIGINS, ...configured])];
}
