import { DesignHost } from "@/components/design/DesignHost";

import { buildFirstRunDesign } from "./design";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function FirstRunDesignPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return <DesignHost design={buildFirstRunDesign()} variant={one(params["variant"])} state={one(params["state"])} />;
}
