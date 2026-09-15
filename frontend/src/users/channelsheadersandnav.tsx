 
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
    <div className="  py-5">
      {/* Steps */}
      
     

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