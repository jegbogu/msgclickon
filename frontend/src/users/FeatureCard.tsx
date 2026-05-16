import { ArrowRight } from "lucide-react";

type FeatureCardProps = {
  badge: string;
  icon: string;
  title: string;
  description: string;
  active?: boolean;
};

export default function FeatureCard({
  badge,
  icon,
  title,
  description,
  active = false,
}: FeatureCardProps) {
  return (
    <div
      className={`rounded-2xl bg-white p-6 border transition-all duration-300 hover:shadow-md ${
        active
          ? "border-orange-500 shadow-sm"
          : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-500">
          {badge}
        </span>

        <button
          className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
            active
              ? "bg-orange-500 text-white"
              : "bg-orange-100 text-orange-500"
          }`}
        >
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="mt-8">
        <div className="text-3xl">{icon}</div>

        <h2 className="text-2xl font-semibold text-gray-900 mt-5">
          {title}
        </h2>

        <p className="text-gray-500 mt-4 leading-7">
          {description}
        </p>
      </div>
    </div>
  );
}