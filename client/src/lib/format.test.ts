import { describe, expect, it } from "vitest";
import { delta, longDate, money, parseMoney, prepTime } from "./format";

describe("formato de moneda y fechas", () => {
  it("formatea centavos como pesos mexicanos", () => {
    expect(money(156000)).toBe("$1,560.00");
    expect(money(2550)).toBe("$25.50");
  });

  it("convierte texto a centavos sin errores de redondeo", () => {
    expect(parseMoney("120.50")).toBe(12050);
    expect(parseMoney("$1,234.56")).toBe(123456);
    expect(parseMoney("0.1")).toBe(10);
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("-5")).toBeNull();
  });

  it("muestra recargos con signo y oculta los nulos", () => {
    expect(delta(5000)).toBe("+$50.00");
    expect(delta(0)).toBe("");
  });

  it("no desplaza fechas por zona horaria", () => {
    expect(longDate("2026-10-28")).toContain("28 de octubre de 2026");
  });

  it("describe el tiempo de preparación", () => {
    expect(prepTime(0)).toMatch(/inmediata/);
    expect(prepTime(72)).toBe("Pide con 3 días de anticipación");
  });
});
