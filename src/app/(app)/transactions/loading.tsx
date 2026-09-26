import { SkelBox, SkelLine, SkelPageHeader } from "@/components/shell/skeletons";

export default function TransactionsLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6 pb-3 space-y-3">
        <SkelPageHeader />
        <div className="flex gap-3">
          <SkelBox height={60} width="100%" />
          <SkelBox height={60} width="100%" />
          <SkelBox height={60} width="100%" />
          <SkelBox height={60} width="100%" />
        </div>
        <div className="flex items-center gap-3">
          <SkelLine width={200} height={34} />
          <SkelLine width={140} height={34} />
          <SkelLine width={140} height={34} />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6 space-y-3">
        <SkelBox height={220} />
        <SkelBox height={220} />
      </div>
    </div>
  );
}
