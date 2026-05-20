export interface SingleFlightOptions<A extends any[]> {
  /** Derive a dedup key from the arguments (default: JSON.stringify(args)). */
  key?: (...args: A) => string;
  /** Cache resolved values for this many milliseconds (default 0 = no cache). */
  cacheMs?: number;
}
export type Wrapped<F> = F & {
  /** Clear in-flight + cached entries (a single key, or everything). */
  clear(key?: string): void;
  /** Number of currently in-flight keys. */
  readonly inflight: number;
};
export function singleFlight<F extends (...args: any[]) => Promise<any>>(
  fn: F,
  opts?: SingleFlightOptions<Parameters<F>>
): Wrapped<F>;
export default singleFlight;
