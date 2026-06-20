import Contactstable from "../users/contactstable";
import Managecontactsbanner from "../users/managecontactsbanner";
import Managecontactsheader from "../users/managecontactsheader";
import UserDashboardNav from "../users/userdashboardnav";

export default function Contactmanager(){
    return(
        <div className="p-5 bg-[var(--bg-color)] min-h-screen">
            <UserDashboardNav/>
            <Managecontactsheader/>
            <Managecontactsbanner/>
            <Contactstable/>
        </div>
    )
}