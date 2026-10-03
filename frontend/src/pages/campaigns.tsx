import CampaignTable from "../users/campaigntable";
import Managecontactsheader from "../users/managecontactsheader";
import UserDashboardNav from "../users/userdashboardnav";

export default function Campaign() {
  return (
    <div className="min-h-screen">
      {/* Dashboard navigation */}
      <UserDashboardNav />

      {/* Campaign page */}
      <main className="min-h-screen bg-[var(--bg-color)] p-5">
        <Managecontactsheader
          pagename="Campaigns"
          title="Active Campaigns"
          description="All your active campaigns in one place - search, filter, pause or edit any of them"
        />

        <CampaignTable />
      </main>
    </div>
  );
}