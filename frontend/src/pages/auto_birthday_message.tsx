import Channelsheadersandnav from "../users/channelsheadersandnav";
import Emailautobdm from "../users/emailautobdm";
import EmailTemplateBuilder from "../users/emailtemplatebuilder";
import Managecontactsheader from "../users/managecontactsheader";
import UserDashboardNav from "../users/userdashboardnav";

export default function Autobirthdaymessage(){
    return(
        
       <div className="bg-[var(--bg-color)] min-h-screen" >
            <UserDashboardNav/>

            <div className="p-5 ">
            <Managecontactsheader 
            pagename = "AUTO BIRTHDAY MESSAGE"
            title = "Set up birthday messages"
            description = "Choose you channel - each has its own message builder and templates"
            />
            <div>
        <Channelsheadersandnav/>
        </div>
        <div className="p-5 border border-gray-300 rounded-xl bg-white  ">
             <Emailautobdm/>
             <EmailTemplateBuilder/>
        </div>
            
        </div>
        
            
        </div>
    )
}