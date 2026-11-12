import { describe, expect, it } from "vitest";
import { findPreferredMicrophone } from "../audio-capture-utils";

const devices = [
  { deviceId: "default", label: "System Default", isDefault: true },
  { deviceId: "built-in", label: "MacBook Pro Microphone", isDefault: false },
  { deviceId: "usb", label: "USB Audio Interface", isDefault: false },
];

describe("Preferred recording device", () => {
  it("selects an external USB device when that preference is saved", () => {
    expect(
      findPreferredMicrophone(devices, "External USB microphone").deviceId,
    ).toBe("usb");
  });
  it("selects the built-in microphone when that preference is saved", () => {
    expect(
      findPreferredMicrophone(devices, "MacBook microphone").deviceId,
    ).toBe("built-in");
  });
  it("falls back to the default device when the preferred hardware is absent", () => {
    expect(
      findPreferredMicrophone(devices.slice(0, 2), "External USB microphone")
        .deviceId,
    ).toBe("default");
  });
});
