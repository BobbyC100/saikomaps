declare module 'jellyfish' {
  export function jaroWinkler(s1: string, s2: string): number;
  export function levenshtein(s1: string, s2: string): number;
}
