type StatsCardProps = {
  title: string;
  value: string;
  subtitle: string;
};

export default function StatsCard({
  title,
  value,
  subtitle,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <p className="text-sm text-gray-500">{title}</p>

      <h2 className="text-4xl font-bold text-gray-900 mt-3">
        {value}
      </h2>

      <p className="text-green-600 text-sm font-medium mt-3">
        {subtitle}
      </p>
    </div>
  );
}