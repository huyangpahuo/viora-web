import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";

export default function PluginNotFound() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-4 py-32 text-center sm:px-6">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <FontAwesomeIcon icon={faMagnifyingGlass} className="size-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">插件不存在</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          目录中没有这个 pluginId
          对应的插件。插件标识一旦发布不会修改,请确认链接是否正确,
          或回到画廊重新浏览。
        </p>
      </div>
      <Button asChild size="sm">
        <Link href="/">返回画廊首页</Link>
      </Button>
    </div>
  );
}
