import React, { useState, FormEvent, type ChangeEvent } from "react"
 

export default function UsersRegister(){
    const [showpass, setShowpass] = useState<string>("Show")
    const [matchpass, setMatchpass] = useState<string | boolean>(false)
    const [password, setPassword] = useState<string>("")
    const [fullname, setFullname] = useState<string>("")
    const [email, setEmail] = useState<string>("")
    const[ischecked, setIsChecked] = useState<boolean>(false)

    function funPass(){
        setShowpass(prev => prev === "Show" ? "Hide" : "Show")
    }

    function checkPass(e:any){
        if(e !== password){
            setMatchpass("Passwords do not match")
        }else{
            setMatchpass("Passwords matched")
        }
    }

    function handleCheck(e:ChangeEvent<HTMLInputElement>){
        setIsChecked(e.target.checked)
    }
    
    
  const submitHandler: React.FormEventHandler<HTMLFormElement> = async (e) => {
  e.preventDefault();
     const payload = {
        fullname: fullname,
        password: password,
        email:email,
        agreement:ischecked
     }
     console.log(payload)
  try {
 const res = await fetch("http://localhost:8000/api/v1/user/register", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});
    console.log(await res.json());
  } catch (err) {
    console.error(err);
  }
};

    return(
        <div className="flex justify-center items-center px-4 bg-[var(--bg-color)] min-h-screen pb-[100px]">
            
            {/* CONTAINER */}
            <div className="bg-[var(--secondary-color)] p-6 sm:p-8 md:p-10 border border-gray-200 w-full max-w-md md:max-w-lg rounded-2xl shadow-lg">
                
                {/* HEADER */}
                <div>
                    <h3 className="text-[var(--primary-color)] font-semibold text-xs sm:text-sm tracking-wide">
                        GET STARTED FOR FREE
                    </h3>

                    <h1 className="text-black font-bold text-xl sm:text-2xl pt-2">
                        Create your account
                    </h1>

                    <p className="mt-3 sm:mt-4 text-gray-500 text-sm">
                        30-day free trial on Email
                    </p>

                    {/* GOOGLE BUTTON */}
                    <div className="border border-gray-300 rounded-lg p-3 mt-4 sm:mt-5 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 transition">
                        <img src="./google.jpg" alt="google" className="w-5 h-5"/>
                        <span className="text-sm font-medium text-center">
                            Continue with Google
                        </span>
                    </div>

                    {/* DIVIDER */}
                    <div className="flex items-center gap-3 mt-5 sm:mt-6">
                        <div className="flex-grow h-[1px] bg-gray-300"></div>
                        <p className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">
                            Or sign up with email
                        </p>
                        <div className="flex-grow h-[1px] bg-gray-300"></div>
                    </div>
                </div>

                {/* FORM */}
                <div className="mt-5 sm:mt-6">
                    <form className="space-y-4" onSubmit={submitHandler}>

                        {/* NAME FIELDS (STACK ON MOBILE) */}
                        <div className="flex flex-col sm:flex-row gap-4">
                             

                            <div className="w-full">
                                <label className="text-sm font-medium">Fullname</label>
                                <input 
                                    type="text"
                                    className="w-full bg-[var(--bg-color)] border border-gray-300 rounded-md mt-1 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={fullname}
                                    onChange={(event:ChangeEvent<HTMLInputElement>) => setFullname(event.target.value)}
                                    name="fullname"

                                />
                            </div>
                        </div>

                        {/* EMAIL */}
                        <div>
                            <label className="text-sm font-medium">Email</label>
                            <input 
                                type="email"
                                className="w-full bg-[var(--bg-color)] border border-gray-300 rounded-md mt-1 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                 onChange={(event:ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                                 name="email"
                            />
                        </div>

                        {/* PASSWORD */}
                        <div>
                            <label className="text-sm font-medium">Password</label>

                            <div className="flex items-center border border-gray-300 rounded-md mt-1 px-2 bg-[var(--bg-color)]">
                                <input 
                                    type={showpass === "Show" ? "password" : "text"}
                                    value={password}
                                    onChange={(event:ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                                    className="w-full  outline-none bg-[var(--bg-color)]"
                                    name="password"
                                />

                                <button 
                                    onClick={funPass} 
                                    type="button"
                                    className="text-gray-500 text-sm font-medium p-3 bg-[var(--bg-color)] cursor-pointer"
                                >
                                    {showpass}
                                </button>
                            </div>
                        </div>

                        {/* CONFIRM PASSWORD */}
                        <div>
                            <label className="text-sm font-medium">Confirm Password</label>
                            <input 
                                type="password"
                                onChange={(event:ChangeEvent<HTMLInputElement>) => checkPass(event.target.value)}
                                className="w-full bg-[var(--bg-color)] border border-gray-300 rounded-md mt-1 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            {matchpass && (
                                <p className={`text-sm mt-1 ${
                                    matchpass === "Passwords matched" 
                                        ? "text-green-500" 
                                        : "text-red-500"
                                }`}>
                                    {matchpass}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-5">
                            <div>
                                <input type="checkbox" name="checkbox" id="checkbox" onChange={handleCheck} checked={ischecked}/>
                            </div>
                            <div>
                                <p>I agree to our <span className="text-[var(--primary-color)] ">Terms of service</span> and <span className="text-[var(--primary-color)] ">Privacy policy</span></p>
                            </div>
                        </div>

                        {/* SUBMIT */}
                        <button 
                            type="submit"
                            className="w-full bg-[var(--primary-color)] text-white py-2 rounded-md mt-4 cursor-pointer hover:bg-orange-700 transition font-medium "
                        >
                            Create Account
                        </button>

                    </form>
                </div>
            </div>
        </div>
    )
}