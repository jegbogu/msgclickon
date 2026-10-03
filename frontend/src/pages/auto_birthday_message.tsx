import Channelsheadersandnav from "../users/channelsheadersandnav";
import Managecontactsheader from "../users/managecontactsheader";
import UserDashboardNav from "../users/userdashboardnav";

import AutoBirthdayMessage from "../users/AutoBirthdayMessage";

export default function Autobirthdaymessage() {
  return (
    <div className="min-h-screen bg-[var(--bg-color)]">
      <UserDashboardNav />

      <div className="p-5">
        <Managecontactsheader
          pagename="AUTO BIRTHDAY MESSAGE"
          title="Set up a birthday campaign"
          description="Choose your channel - each has its own message builder and templates"
        />

        <Channelsheadersandnav />

        <div className="rounded-xl border border-gray-300 bg-white p-5">
          <AutoBirthdayMessage />
        </div>
      </div>
    </div>
  );
}