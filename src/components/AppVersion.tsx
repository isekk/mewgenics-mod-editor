import { useEffect, useState } from "react";
import { getName, getVersion } from "@tauri-apps/api/app";

export default function AppVersion() {
  const [ver, setVer] = useState<string>("");

  useEffect(() => {
    (async () => {
      const name = await getName();
      const version = await getVersion();
      setVer(`${name} v${version}`);
    })();
  }, []);

  return <div className="text-xs text-slate-500">{ver}</div>;
}
