import { describe, expect, it } from "vitest";
import { estimateCost, IDLE_SECONDS, noteQuery } from "../lib/usage";

describe("database cost estimate", () => {
  it("prices active time, storage and transfer and projects the month", () => {
    const mid = new Date(Date.UTC(2026, 10, 16)); // halfway through November
    const est = estimateCost({ activeSeconds: 20 * 3600, bytesRead: BigInt(2e9), bytesWritten: BigInt(1e9) }, 0.1e9, mid, 5, 0.25);
    expect(est.computeUsd).toBeCloseTo(20 * 0.25 * 0.106, 5);
    expect(est.transferUsd).toBe(0); // within the included transfer
    expect(est.projectedUsd).toBeGreaterThan(est.totalUsd);
    expect(est.status).toBe("ok");
  });

  it("warns near the budget and stops at it", () => {
    const late = new Date(Date.UTC(2026, 10, 28));
    expect(estimateCost({ activeSeconds: 160 * 3600, bytesRead: BigInt(0), bytesWritten: BigInt(0) }, 0, late, 5, 0.25).status).toBe("warn");
    expect(estimateCost({ activeSeconds: 200 * 3600, bytesRead: BigInt(0), bytesWritten: BigInt(0) }, 0, late, 5, 0.25).status).toBe("stopped");
  });

  it("counts a burst of queries as awake until the idle tail", () => {
    globalThis.dbUsagePending = undefined;
    const t = 1_000_000;
    noteQuery(t);
    noteQuery(t + 10_000);
    noteQuery(t + 10_000 + 3_600_000);
    // First query wakes it (one idle tail), the second extends by 10 s, the third after a long pause adds another tail.
    expect(globalThis.dbUsagePending!.activeMs).toBe(IDLE_SECONDS * 1000 + 10_000 + IDLE_SECONDS * 1000);
  });
});
