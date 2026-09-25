import { describe, expect, it } from "vitest";
import { computeMarkerPosition } from "./performance-bar";

describe("computeMarkerPosition", () => {
  it("is hidden with no position when there is no score yet", () => {
    expect(computeMarkerPosition(null)).toEqual({ left: 0, visible: false });
  });

  it("clamps the lower edge so the marker never sits flush on the border", () => {
    expect(computeMarkerPosition(0)).toEqual({ left: 1, visible: true });
  });

  it("clamps the upper edge so the marker never sits flush on the border", () => {
    expect(computeMarkerPosition(100)).toEqual({ left: 99, visible: true });
  });

  it("positions at the boundary values used by the scoring engine's own tests", () => {
    expect(computeMarkerPosition(49)).toEqual({ left: 49, visible: true });
    expect(computeMarkerPosition(50)).toEqual({ left: 50, visible: true });
    expect(computeMarkerPosition(69)).toEqual({ left: 69, visible: true });
    expect(computeMarkerPosition(70)).toEqual({ left: 70, visible: true });
  });
});
