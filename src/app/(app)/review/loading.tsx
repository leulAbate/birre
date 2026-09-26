import { SkelBox, SkelCard, SkelPageHeader } from "@/components/shell/skeletons";

export default function ReviewLoading() {
  return (
    <div className="h-full overflow-hidden p-6 space-y-4">
      <SkelPageHeader />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SkelCard height={90} />
        <SkelCard height={90} />
        <SkelCard height={90} />
        <SkelCard height={90} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SkelBox height={200} />
          <SkelBox height={200} />
          <SkelBox height={200} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SkelBox height={280} />
          <SkelBox height={220} />
          <SkelBox height={200} />
        </div>
      </div>
    </div>
  );
}
