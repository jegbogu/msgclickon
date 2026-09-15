import Contactstable from "../users/contactstable";
import Managecontactsbanner from "../users/managecontactsbanner";
import Managecontactsheader from "../users/managecontactsheader";
import UserDashboardNav from "../users/userdashboardnav";

export default function Campaign(){
    return(
        <div >
            <UserDashboardNav/>
        <div className="p-5 bg-[var(--bg-color)] min-h-screen">
            
            <Managecontactsheader pagename="Campaigns"
            title="Active Campaings"
            description="All your active campaigns in one piece - Search, filter, pause or edit any of them"
            />
            <Managecontactsbanner/>
            <Contactstable/>
        </div>
        </div>
    )
}