import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
/** Private evidence stays behind Storage RLS; refresh short-lived links while the page is open. */
export function useEvidenceUrls(items: { storage_path: string }[]) {
  const pathsKey = JSON.stringify(
    [...new Set(items.map((item) => item.storage_path))].sort(),
  );
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    setUrls({});
    const paths = JSON.parse(pathsKey) as string[];
    const refresh = async () => {
      if (!paths.length) return;
      const { data, error } = await supabase.storage
        .from("job-evidence")
        .createSignedUrls(paths, 900);
      if (active && !error)
        setUrls(
          Object.fromEntries(
            (data ?? [])
              .filter((item) => item.path && item.signedUrl)
              .map((item) => [item.path!, item.signedUrl]),
          ),
        );
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 720000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pathsKey]);
  return urls;
}
