import clsx from "clsx";
import type { SentinelVerdict } from "@/lib/sentinel/types";

export function VerdictBadge({ verdict }: { verdict: SentinelVerdict }) {
  return <span className={clsx("verdict", verdict.toLowerCase())}>{verdict}</span>;
}
