import { Suspense } from "react";
import { Studio } from "@/components/studio";
import type { SearchQuery } from "@/lib/url-state";

export default function Home({
  searchParams,
}: {
  searchParams: Promise<SearchQuery>;
}) {
  return (
    <Suspense fallback={<Studio initialQuery={{}} syncUrl={false} />}>
      <QueriedStudio searchParams={searchParams} />
    </Suspense>
  );
}

async function QueriedStudio({
  searchParams,
}: {
  searchParams: Promise<SearchQuery>;
}) {
  const params = await searchParams;
  return <Studio initialQuery={params} />;
}
