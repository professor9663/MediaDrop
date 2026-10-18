// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isPublicAddress, validateRedirectTarget } from "../lib/media/direct-media";

describe("outbound media security", () => {
  it.each(["127.0.0.1", "10.1.2.3", "169.254.10.2", "192.168.1.5", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1"]) (
    "blocks non-public address %s",
    (address) => expect(isPublicAddress(address)).toBe(false)
  );

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) (
    "allows public unicast address %s",
    (address) => expect(isPublicAddress(address)).toBe(true)
  );

  it("revalidates redirect destinations and rejects private targets", async () => {
    await expect(validateRedirectTarget(new URL("https://cdn.example.test/video.mp4"), "http://127.0.0.1/admin"))
      .rejects.toThrow(/private or restricted network/);
  });

  it("rejects redirects with embedded credentials and non-standard ports", async () => {
    await expect(validateRedirectTarget(new URL("https://cdn.example.test/video.mp4"), "https://user:secret@files.example.test/a.mp4"))
      .rejects.toThrow(/cannot be fetched safely/);
    await expect(validateRedirectTarget(new URL("https://cdn.example.test/video.mp4"), "https://files.example.test:8080/a.mp4"))
      .rejects.toThrow(/Non-standard/);
  });
});
