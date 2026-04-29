import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
type CheckYourEmailProps = {
  email:string;
}

export default function CheckYourEmail({email}:CheckYourEmailProps) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const inputs = useRef<HTMLInputElement[]>([]);
  const[userMsg, setIsUserMsg] = useState<string>("")
 const [loading, setLoading] = useState<boolean>(false)

  const navigate = useNavigate()
  const firstpartemail = email.slice(0,2)
  const last = email.slice(email.indexOf("@"),100)
  const renderPartEmail = `${firstpartemail}****${last}`

  

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move forward
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const code = otp.join("");
    
    if(code.length< 6|| code===" "){
       return setIsUserMsg("Wrong Code")
    }
    setLoading(true)
    const payload = {
      code:code,
      email:email
    }

    // TODO: call your FastAPI endpoint
    // fetch("/verify-otp", { method: "POST", body: JSON.stringify({ code }) })
const res = await fetch("http://localhost:8000/api/v1/user/storing_otp", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});
 
const data = await res.json(); // ✅ only once

  
  if (!res.ok) {
      setLoading(false)
    return setIsUserMsg(data.detail || "Something went wrong");
  }

  navigate('/login')
  };

  return (
    <div className="flex justify-center items-center px-4 bg-[var(--bg-color)] min-h-screen pb-[100px]">

      {userMsg && (
  <div className="flex justify-between gap-1 fixed top-5 right-3 z-50 max-w-[350px] 
    bg-red-100  text-sm px-4 py-2 rounded-lg shadow-lg
    transform translate-x-0">
    <p className="text-red-700"> {userMsg}</p>
    <p className="cursor-pointer" onClick={()=>setIsUserMsg("")}>ⓧ</p>
  </div>
)}


      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 text-center">

        {/* Progress */}
        <div className="flex justify-center gap-3 mb-6">
          <span className="w-2 h-2 bg-orange-500 rounded-full" />
          <span className="w-8 h-1 bg-orange-500 rounded-full" />
          <span className="w-2 h-2 bg-orange-500 rounded-full" />
          <span className="w-8 h-1 bg-orange-500 rounded-full" />
          <span className="w-2 h-2 bg-orange-500 rounded-full" />
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">
            🔒
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-2">
          Check your email
        </h2>

        <p className="text-gray-500 text-sm mb-6">
          We sent a 6-digit verification code to <br />
          <span className="font-medium text-black">
             {renderPartEmail}
          </span>
          <br />
          Enter it below to continue
        </p>

        {/* OTP */}
        <div className="flex justify-center gap-3 mb-6">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                if (el) inputs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-12 h-12 text-center border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          ))}
        </div>
           {loading?
                        <div className="flex justify-center items-center">
                             <img src="/svg-spinners--pulse-multiple.svg" alt="spinner" className="cursor-not-allowed " width={70}/>
                        </div>:
        <button
          onClick={handleSubmit}
          className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition"
        >
          Verify & Continue
        </button>}

        <p className="text-sm text-gray-500 mt-4">
          Didn’t receive it?{" "}
          <span className="text-orange-500 cursor-pointer hover:underline">
            Resend code
          </span>
        </p>
      </div>
    </div>
  );
}