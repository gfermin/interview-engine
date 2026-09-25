import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PageContainer } from "./page-container";

afterEach(cleanup);

describe("PageContainer", () => {
  it("defaults to the standard width", () => {
    render(<PageContainer>content</PageContainer>);
    expect(screen.getByText("content").className).toContain("max-w-[720px]");
  });

  it("applies the wide variant", () => {
    render(<PageContainer width="wide">content</PageContainer>);
    expect(screen.getByText("content").className).toContain("max-w-[1200px]");
  });

  it("applies the full variant", () => {
    render(<PageContainer width="full">content</PageContainer>);
    expect(screen.getByText("content").className).toContain("max-w-[1440px]");
  });

  it("merges extra className without dropping the width class", () => {
    render(
      <PageContainer width="wide" className="items-center">
        content
      </PageContainer>
    );
    const el = screen.getByText("content");
    expect(el.className).toContain("max-w-[1200px]");
    expect(el.className).toContain("items-center");
  });
});
