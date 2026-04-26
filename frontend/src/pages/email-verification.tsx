import CheckYourEmail from "../users/checkyouremail";

export default function EmailVerification(){
    return(
         <div className='bg-[var(--bg-color)] min-h-screen'>
                    <div className='pt-5 flex justify-between'>
                        <div>
                            <img src="/logo.png" alt="logo"/>
                        </div>
                        <div>
                            <p className="text-black"> ← Back to Login </p>
                        </div>
                    </div>
                    <div>
                        <CheckYourEmail/>
                    </div>
        
                </div>
    )
}