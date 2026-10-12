import { Studio } from "@/components/studio";
import type { SearchQuery } from "@/lib/url-state";

export const instant = false;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchQuery>;
}) {
  const params = await searchParams;
  return <Studio initialQuery={params} />;
}
