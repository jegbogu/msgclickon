import { useAuth } from "../AuthContext";

export function Usersalutation(){
const {user} = useAuth()
 

const hours = new Date().getHours();
greet()
function greet(){
if (hours< 12){
   return "Morning"
 } else if(hours<18){
   return "Afternoon"
 }else{
   return "Evening"
 }
}
 

    return(
        <div>
            <p className="text-[var(--primary-color)] font-bold text-sm ">WELCOME</p>
            <p className="  font-bold text-xl text-black mt-2">Good {greet()}, {user.fullname}</p>
            <p className="text-sm mt-2">Choose a card below to set up your messages.</p>
        </div>
    )
}