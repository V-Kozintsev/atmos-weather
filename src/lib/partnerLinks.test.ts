import { describe, expect, it } from "vitest";
import { isPartnerTemplate, partnerLink } from "./partnerLinks";

const search = "https://www.ozon.ru/search/?text=%D0%BA%D1%83%D1%80%D1%82%D0%BA%D0%B0";

describe("partner links", () => {
  it("keeps the plain store link without a template", () => {
    expect(partnerLink(undefined, search)).toBe(search);
    expect(partnerLink("", search)).toBe(search);
  });
  it("wraps the store link into a partner deeplink", () => {
    expect(partnerLink("https://partner.example/g/abc/?ulp={url}", search)).toBe(`https://partner.example/g/abc/?ulp=${encodeURIComponent(search)}`);
  });
  it("rejects unsafe or ambiguous templates", () => {
    expect(isPartnerTemplate("http://partner.example/?ulp={url}")).toBe(false);
    expect(isPartnerTemplate("https://partner.example/?a={url}&b={url}")).toBe(false);
    expect(isPartnerTemplate("https://partner.example/no-placeholder")).toBe(false);
    expect(partnerLink("javascript:{url}", search)).toBe(search);
  });
});
