import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Header } from "../components/layout/header";

describe("Header preferences and mobile menu", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = "light";
  });

  it("loads and persists the selected theme", async () => {
    window.localStorage.setItem("mediadrop-theme", "dark");
    render(<Header appName="MediaDrop" />);
    expect(await screen.findByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem("mediadrop-theme")).toBe("light");
  });

  it("toggles the collapsible navigation menu", () => {
    render(<Header appName="MediaDrop" />);
    const menuButton = screen.getByRole("button", { name: "Open navigation menu" });
    fireEvent.click(menuButton);
    expect(screen.getByRole("button", { name: "Close navigation menu" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Close navigation menu" }));
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toHaveAttribute("aria-expanded", "false");
  });
});
