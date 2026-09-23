import { listBinders } from "@/lib/binders";
import { getUserId } from "@/lib/current-user";
import BinderSwitcher from "@/components/BinderSwitcher";

export const dynamic = "force-dynamic";

export default async function Page() {
  const userId = await getUserId();
  const classeurs = await listBinders(userId);
  return <BinderSwitcher classeurs={classeurs} />;
}
