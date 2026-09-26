import { SkelBox, SkelPageHeader } from "@/components/shell/skeletons";

export default function PlansLoading() {
  return (
    <div className="h-full overflow-hidden p-6 space-y-4">
      <SkelPageHeader />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkelBox height={220} />
        <SkelBox height={220} />
        <SkelBox height={220} />
        <SkelBox height={220} />
      </div>
    </div>
  );
}
