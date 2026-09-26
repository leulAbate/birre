import { SkelBox, SkelCard, SkelLine, SkelPageHeader } from "@/components/shell/skeletons";

export default function DashboardLoading() {
  return (
    <div className="h-full overflow-hidden p-6 space-y-4">
      <SkelPageHeader />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SkelCard height={140} />
        <SkelCard height={140} />
        <SkelCard height={140} />
        <SkelCard height={140} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <SkelBox height={340} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SkelBox height={220} />
          <SkelBox height={140} />
        </div>
      </div>
      <div className="glass rounded-2xl p-5" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SkelLine width={80} height={10} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SkelBox height={70} />
          <SkelBox height={70} />
          <SkelBox height={70} />
        </div>
      </div>
    </div>
  );
}
