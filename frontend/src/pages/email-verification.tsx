import CheckYourEmail from "../users/checkyouremail";
import { useLocation } from "react-router-dom";

export default function EmailVerification(){
    const location = useLocation() as {state? :{email?:string}}
    const email = location.state?.email ?? " "
    
    return(
         <div className='bg-[var(--bg-color)] min-h-screen'>
                    <div className='pt-5 flex justify-between'>
                        <div>
                            <img src="/logo.png" alt="logo"/>
                        </div>
                        <div>
                            <p className="text-black">Login → </p>
                        </div>
                    </div>
                    <div>
                        {email?(<CheckYourEmail email={email}/>):
                            <p>No Email provided</p>
                        }
                    </div>
        
                </div>
    )
}