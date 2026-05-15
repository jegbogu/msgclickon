import  { useState, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom"
import { useAuth } from "../AuthContext";



 

export default function UsersRegister(){
    const [showpass, setShowpass] = useState<string>("Show")
   
    const [password, setPassword] = useState<string>("")
   
    const [email, setEmail] = useState<string>("")
 
    const [userMsg, setIsUserMsg] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const { refreshUser } = useAuth();

    const navigate = useNavigate()

    function funPass(){
        setShowpass(prev => prev === "Show" ? "Hide" : "Show")
    }


  const submitHandler = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
 
  

if (email.trim().length < 6) {
    return setIsUserMsg("Enter a valid email");
}

if (password.trim().length < 6) {
    return setIsUserMsg("Password must be at least 6 characters");
}
 
  //checking for the firstname
    setLoading(true)
     const payload = {
       
        password: password.trim(),
        email:email.toLowerCase().trim(),
        
     }
    

  try {
 const res = await fetch("http://localhost:8000/api/v1/user/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify(payload),
});
 
const data = await res.json();  
 
 
  if (!res.ok) {
    setLoading(false)
    return setIsUserMsg(data.detail || "Something went wrong");
  }
 await refreshUser();
navigate("/dashboard");
 
 
  
  } catch (err) {
    console.error("err",err);
  }
};

    return(
        <div className="flex justify-center items-center px-4 bg-[var(--bg-color)] min-h-screen pb-[100px]">
        
            
            {/* CONTAINER */}
            <div className="bg-[var(--secondary-color)] p-6 sm:p-8 md:p-10 border border-gray-200 w-full max-w-md md:max-w-lg rounded-2xl shadow-lg">
               {userMsg && (
  <div className="flex justify-between gap-1 fixed top-5 right-3 z-50 max-w-[350px] 
    bg-red-100  text-sm px-4 py-2 rounded-lg shadow-lg
    transform translate-x-0">
    <p className="text-red-700"> {userMsg}</p>
    <p className="cursor-pointer" onClick={()=>setIsUserMsg("")}>ⓧ</p>
  </div>
)}
                {/* HEADER */}
                <div>
                    <h3 className="text-[var(--primary-color)] font-bold text-xs sm:text-sm tracking-wide">
                        WELCOME BACK
                    </h3>

                    <h1 className="text-black font-bold text-xl sm:text-2xl pt-2">
                        Login to your account
                    </h1>

                    <p className="mt-3 sm:mt-4 text-gray-500 text-sm">
                        New here? <span className="text-[var(--primary-color)] font-semibold"> <a href="/register">Create a free account</a></span>
                    </p>

                   
                </div>

                {/* FORM */}
                <div className="mt-5 sm:mt-6">
                    <form className="space-y-4" onSubmit={submitHandler}>

                         

                        {/* EMAIL */}
                        <div>
                            <label className="text-sm font-medium">Email</label>
                            <input 
                                type="email"
                                className="w-full bg-[var(--bg-color)] border border-gray-300 rounded-md mt-1 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                 onChange={(event:ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                                 name="email"
                                 placeholder="you@example.com"
                                 value={email}
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
                                    placeholder="Min. 8 Characters"
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
                        
                        <div className="flex justify-between">
                            <div>
                                <input type="checkbox" name="checkbox" id="checkbox"  /> <span>Remember me</span>
                            </div>

                             

                            <div>
                                <p className="text-[var(--primary-color)] ">Forgot Password?</p>
                            </div>
                        </div>
                        <div>
                                <p>By Logging in you agree to our   <span className="text-[var(--primary-color)] ">Terms of service</span> and <span className="text-[var(--primary-color)] ">Privacy policy</span></p>
                            </div>

                        {/* SUBMIT */}
                        {loading?
                        <div className="flex justify-center items-center">
                             <img src="/svg-spinners--pulse-multiple.svg" alt="spinner" className="cursor-not-allowed " width={70}/>
                        </div>
                       
                        :<button 
                            type="submit"
                            className="w-full bg-[var(--primary-color)] text-white py-2 rounded-md mt-4 cursor-pointer hover:bg-orange-700 transition font-medium "
                        >
                            Login
                        </button>}
                         {/* DIVIDER */}
                    <div className="flex items-center gap-3 mt-5 sm:mt-6">
                        <div className="flex-grow h-[1px] bg-gray-300"></div>
                        <p className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">
                            Or continue with Google
                        </p>
                        <div className="flex-grow h-[1px] bg-gray-300"></div>
                    </div>


                         {/* GOOGLE BUTTON */}
                    <div className="border border-gray-300 rounded-lg p-3 mt-4 sm:mt-5 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 transition">
                        <img src="./google.jpg" alt="google" className="w-5 h-5"/>
                        <span className="text-sm font-medium text-center">
                            Continue with Google
                        </span>
                    </div>

                   
                    </form>
                </div>
            </div>
        </div>
    )
}