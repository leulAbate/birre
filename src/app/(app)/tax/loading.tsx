import { SkelBox, SkelPageHeader } from "@/components/shell/skeletons";

export default function TaxLoading() {
  return (
    <div className="h-full overflow-hidden p-6 space-y-4">
      <SkelPageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SkelBox height={520} />
          <SkelBox height={260} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SkelBox height={340} />
          <SkelBox height={200} />
          <SkelBox height={220} />
        </div>
      </div>
    </div>
  );
}
