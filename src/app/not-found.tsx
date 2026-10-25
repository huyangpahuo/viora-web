import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCompass } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-4 py-32 text-center sm:px-6">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <FontAwesomeIcon icon={faCompass} className="size-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">页面不存在</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          你访问的地址不存在,或者内容已被移除。
        </p>
      </div>
      <Button asChild size="sm">
        <Link href="/">返回画廊首页</Link>
      </Button>
    </div>
  );
}
