import type { ReactNode } from "react";

type NormalizedText = {
  text: string;
  sourceIndexes: number[];
};

function normalizeWithIndexes(value: string): NormalizedText {
  const sourceChars = Array.from(value);
  const normalized: string[] = [];
  const sourceIndexes: number[] = [];

  sourceChars.forEach((character, index) => {
    const folded = character
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");

    for (const part of Array.from(folded)) {
      const normalizedPart = /[\p{L}\p{N}]/u.test(part) ? part : " ";
      if (normalizedPart === " " && normalized.at(-1) === " ") continue;
      normalized.push(normalizedPart);
      sourceIndexes.push(index);
    }
  });

  return { text: normalized.join(""), sourceIndexes };
}

export function highlightText(text: string, query: string): ReactNode {
  const cleanQuery = query.trim();
  if (!cleanQuery) return text;

  const source = normalizeWithIndexes(text);
  const target = normalizeWithIndexes(cleanQuery).text.trim();
  if (!target) return text;

  function findMatches(item: string) {
    const found: Array<[number, number]> = [];
    let cursor = 0;
    while (cursor <= source.text.length - item.length) {
      const start = source.text.indexOf(item, cursor);
      if (start < 0) break;
      found.push([start, start + item.length]);
      cursor = start + item.length;
    }
    return found;
  }

  const phraseMatches = findMatches(target);
  const matches = phraseMatches.length
    ? phraseMatches
    : [...new Set(target.split(" ").filter(Boolean))]
        .sort((left, right) => right.length - left.length)
        .flatMap(findMatches);
  matches.sort((left, right) => left[0] - right[0] || right[1] - left[1]);
  const nonOverlappingMatches = matches.filter(
    ([start, end], index) =>
      index === 0 || start >= matches[index - 1][1] || end <= matches[index - 1][0],
  );
  if (!nonOverlappingMatches.length) return text;

  const sourceChars = Array.from(text);
  const parts: ReactNode[] = [];
  let sourceCursor = 0;

  nonOverlappingMatches.forEach(([start, end], matchIndex) => {
    const startIndex = source.sourceIndexes[start];
    const endIndex = source.sourceIndexes[end - 1] + 1;
    if (startIndex > sourceCursor) {
      parts.push(sourceChars.slice(sourceCursor, startIndex).join(""));
    }
    parts.push(
      <mark className="search-term-highlight" key={`${startIndex}-${matchIndex}`}>
        {sourceChars.slice(startIndex, endIndex).join("")}
      </mark>,
    );
    sourceCursor = endIndex;
  });

  if (sourceCursor < sourceChars.length) {
    parts.push(sourceChars.slice(sourceCursor).join(""));
  }
  return parts;
}
