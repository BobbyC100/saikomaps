/**
 * HTML parsing: title, meta description, h1, lang, visible text, ld+json, links.
 */

import * as cheerio from "cheerio";
import { VISIBLE_TEXT_CAP } from "./constants";

export interface ParsedPage {
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  lang: string | null;
  visibleText: string;
  schemaBlocks: unknown[];
  links: { href: string; text: string }[];
}

function getVisibleText($: cheerio.CheerioAPI, cap: number): string {
  const body = $("body").clone();
  body.find("script, style, noscript").remove();
  const text = body.text().replace(/\s+/g, " ").trim();
  return text.slice(0, cap);
}

export function parseHtml(html: string): ParsedPage {
  const $ = cheerio.load(html);
  const title =
    $("title").first().text().replace(/\s+/g, " ").trim() || null;
  let metaDescription: string | null = null;
  $('meta[name="description"]').each((_, el) => {
    if (!metaDescription) {
      const c = $(el).attr("content");
      if (c) metaDescription = c.replace(/\s+/g, " ").trim();
    }
  });
  const h1Text = $("h1").first().text().replace(/\s+/g, " ").trim();
  const h1 = h1Text || null;
  const lang =
    $("html").attr("lang")?.replace(/\s+/g, " ").trim() || null;
  const visibleText = getVisibleText($, VISIBLE_TEXT_CAP);

  const schemaBlocks: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) schemaBlocks.push(...parsed);
      else schemaBlocks.push(parsed);
    } catch {
      // ignore invalid JSON
    }
  });

  const links: { href: string; text: string }[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:"))
      return;
    const text = $(el).text().replace(/\s+/g, " ").trim();
    links.push({ href, text });
  });

  return {
    title,
    metaDescription,
    h1,
    lang,
    visibleText,
    schemaBlocks,
    links,
  };
}
