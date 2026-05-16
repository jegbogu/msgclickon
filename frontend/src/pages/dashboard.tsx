import Userdashboardnav from "../users/userdashboardnav";
import UserSalutation from "../users/usersalutation";
import ContactHeader from "../users/contactheader";
import StatsSection from "../users/StatsSection";
import FeaturesSection from "../users/FeaturesSection";

export default function Dashboard() {
    return(
        <div className="p-5">
             <Userdashboardnav/>
             <UserSalutation/>
             <ContactHeader totalContacts={4387} />
             <StatsSection />
             <FeaturesSection />
        </div>
    )
}