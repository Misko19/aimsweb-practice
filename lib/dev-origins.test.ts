import { describe, expect, it } from "vitest";
import { parseAllowedDevOrigins } from "./dev-origins";

describe("parseAllowedDevOrigins", () => {
  it("preserves loopback defaults when unset or empty", () => {
    expect(parseAllowedDevOrigins()).toEqual(["127.0.0.1", "localhost"]);
    expect(parseAllowedDevOrigins("")).toEqual(["127.0.0.1", "localhost"]);
  });

  it("adds trimmed, unique LAN hosts", () => {
    expect(parseAllowedDevOrigins(" 192.168.1.14, tablet.local,192.168.1.14, ")).toEqual([
      "127.0.0.1",
      "localhost",
      "192.168.1.14",
      "tablet.local",
    ]);
  });

  it.each(["http://192.168.1.14:3000", "192.168.1.14:3000", "*.local", "tablet.local/path"])(
    "rejects origin-shaped or unsafe entry %s",
    (value) => expect(() => parseAllowedDevOrigins(value)).toThrow(/bare hostname or IP address/),
  );
});
