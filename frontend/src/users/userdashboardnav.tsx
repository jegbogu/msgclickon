import { useAuth } from "../AuthContext";
export default function Userdashboardnav(){
const {user} = useAuth()
 
const firstname = (user?.fullname.slice(0,user?.fullname.indexOf(" "))).trim().toUpperCase()
const lastname = (user?.fullname.slice(user?.fullname.indexOf(" "),100)).trim().toUpperCase()

function openProfile(){
    alert("hey")
}
 
 


    return(
        <div className="flex justify-between items-center">
            <div>
                <img src="/public/logo.png" alt="logo" />
            </div>
            <div className="flex items-center gap-5">
                <div>
                    <p className="bg-[var(--primary-color)] text-[var(--secondary-color)] p-2 rounded-full">Upgrade Plan</p>
                </div>
                <div className="relative border outline-red-500 p-3 rounded-md inline-block">
                    <img src="/octicon--bell-fill-16.svg" alt="notification" />

                    <span className="absolute -top-1 -right-1 bg-red-500 text-[var(--secondary-color)] w-[20px] h-[20px] flex items-center justify-center rounded-full text-[0.6em]">
                     3
                    </span>
                    </div>
                <div> 
                   <p className="bg-[var(--primary-color)] text-[var(--secondary-color)] w-[30px] h-[30px] flex items-center justify-center rounded-full cursor-pointer" onClick={()=>{openProfile()}}>{`${firstname[0]}${lastname[0]}`}</p>
                </div>
                
                
            </div>
        </div>
    )
}