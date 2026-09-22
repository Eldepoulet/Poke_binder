import { listBinders } from "@/lib/binders";
import BinderSwitcher from "@/components/BinderSwitcher";

export const dynamic = "force-dynamic";

export default async function Page() {
  const classeurs = await listBinders();
  return <BinderSwitcher classeurs={classeurs} />;
}
