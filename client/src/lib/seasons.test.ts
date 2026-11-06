import { describe, expect, it } from "vitest";
import { resolveSeason } from "./seasons";

const d = (m: number, day: number, y = 2026) => new Date(y, m - 1, day, 12);

describe("resolveSeason", () => {
  it("respeta la temporada elegida en el panel", () => {
    expect(resolveSeason("NAVIDAD", d(7, 1))).toBe("NAVIDAD");
    expect(resolveSeason("BASE", d(12, 24))).toBe("BASE");
  });
  it("en automático sigue el calendario", () => {
    expect(resolveSeason("AUTO", d(10, 15))).toBe("HALLOWEEN");
    expect(resolveSeason("AUTO", d(10, 30))).toBe("MUERTOS");
    expect(resolveSeason("AUTO", d(11, 2))).toBe("MUERTOS");
    expect(resolveSeason("AUTO", d(11, 6))).toBe("BASE");
    expect(resolveSeason("AUTO", d(12, 24))).toBe("NAVIDAD");
    expect(resolveSeason("AUTO", d(1, 6, 2027))).toBe("NAVIDAD");
    expect(resolveSeason("AUTO", d(2, 14))).toBe("AMOR");
    expect(resolveSeason(undefined, d(5, 10))).toBe("BASE");
  });
});
