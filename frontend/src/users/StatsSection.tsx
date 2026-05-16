import StatsCard from "./StatsCard";

export default function StatsSection() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">
      <StatsCard
        title="Messages sent today"
        value="1,284"
        subtitle="↑ 8% from yesterday"
      />

      <StatsCard
        title="Active campaigns"
        value="10"
        subtitle="Click to manage"
      />

      <StatsCard
        title="Total contact"
        value="2,391"
        subtitle="↑ 24 this week"
      />

      <StatsCard
        title="Open rate"
        value="90.2%"
        subtitle="↑ 2.1% this week"
      />
    </div>
  );
}