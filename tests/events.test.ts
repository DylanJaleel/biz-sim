import { describe, expect, it } from "vitest";
import { maybeGenerateRandomEvent } from "../lib/events";

describe("maybeGenerateRandomEvent", () => {
  it("returns null on a quiet week", () => {
    const random = () => 0.99;
    expect(maybeGenerateRandomEvent(random)).toBeNull();
  });

  it("returns a material price spike when the event roll succeeds and the type roll is low", () => {
    const values = [0.0, 0.1];
    let i = 0;
    const random = () => values[i++];

    const event = maybeGenerateRandomEvent(random);
    expect(event?.type).toBe("material_price_spike");
    expect(event?.materialCostMultiplier).toBeGreaterThan(1);
  });

  it("returns an employee-sick event when the event roll succeeds and the type roll is high", () => {
    const values = [0.0, 0.9];
    let i = 0;
    const random = () => values[i++];

    const event = maybeGenerateRandomEvent(random);
    expect(event?.type).toBe("employee_sick");
    expect(event?.productivityMultiplier).toBeLessThan(1);
  });
});
