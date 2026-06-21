import Contactstable from "../users/contactstable";
import Managecontactsbanner from "../users/managecontactsbanner";
import Managecontactsheader from "../users/managecontactsheader";
import UserDashboardNav from "../users/userdashboardnav";

export default function Contactmanager(){
    return(
        <div >
            <UserDashboardNav/>
        <div className="p-5 bg-[var(--bg-color)] min-h-screen">
            
            <Managecontactsheader pagename="Contact"
            title="Contact manager"
            description="All your contacts in one place - used across every campaign, reminder and message you set up."
            />
            <Managecontactsbanner/>
            <Contactstable/>
        </div>
        </div>
    )
}