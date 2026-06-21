 
import { Mail, MessageSquare, MessageCircle,} from "lucide-react";

const tabs = [
  {
    name: "Email",
    icon: Mail,
    active: true,
  },
  {
    name: "SMS",
    icon: MessageSquare,
  },
  {
    name: "WhatsApp",
    icon: MessageCircle,
  },
 
  {
    name: "Socials",
    icon: MessageSquare,
  },
];

export default function Channelsheadersandnav() {
  return (
    <div className="  p-6 ">
      {/* Steps */}
      <div className="flex items-center justify-between mb-8">
        {/* Step 1 */}
        <div className="flex items-center flex-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-orange-500 text-sm font-semibold text-orange-500">
            1
          </div>
          <span className="ml-3 text-sm font-medium text-orange-500">
            Message setup
          </span>

          <div className="mx-4 h-px flex-1 bg-gray-200" />
        </div>

        {/* Step 2 */}
        <div className="flex items-center flex-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-sm text-gray-500">
            2
          </div>
          <span className="ml-3 text-sm text-gray-500">
            Select contacts
          </span>

          <div className="mx-4 h-px flex-1 bg-gray-200" />
        </div>

        {/* Step 3 */}
        <div className="flex items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-sm text-gray-500">
            3
          </div>
          <span className="ml-3 text-sm text-gray-500">
            Review & save
          </span>
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="flex items-center rounded-xl border border-gray-400   p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.name}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm transition-all ${
                tab.active
                  ? "bg-white font-medium text-orange-500"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Icon size={16} />
              {tab.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}