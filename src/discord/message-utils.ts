export const DISCORD_MAX_LENGTH = 2000;

function splitLongLine(line: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = line;

  while (remaining.length > maxLength) {
    chunks.push(remaining.substring(0, maxLength));
    remaining = remaining.substring(maxLength);
  }

  if (remaining.trim()) {
    chunks.push(remaining);
  }

  return chunks;
}

function addLineToChunk(currentChunk: string, line: string): string {
  return currentChunk ? `${currentChunk}\n${line}` : line;
}

export function splitMessage(
  content: string,
  maxLength: number = DISCORD_MAX_LENGTH
): string[] {
  if (content.length <= maxLength) {
    return [content];
  }

  const chunks: string[] = [];
  let currentChunk = "";
  const lines = content.split("\n");

  for (const line of lines) {
    const wouldExceedLimit = currentChunk.length + line.length + 1 > maxLength;

    if (wouldExceedLimit) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      if (line.length > maxLength) {
        const longLineChunks = splitLongLine(line, maxLength);
        chunks.push(...longLineChunks.slice(0, -1));
        currentChunk = longLineChunks.at(-1) ?? "";
      } else {
        currentChunk = line;
      }
    } else {
      currentChunk = addLineToChunk(currentChunk, line);
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
