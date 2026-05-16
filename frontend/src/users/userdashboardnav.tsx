import { useAuth } from "../AuthContext";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom"
 

export default function UserDashboardNav() {
  const { user } = useAuth();
    const { refreshUser } = useAuth();

  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  
    const navigate = useNavigate()

  const fullname = user?.fullname || "";
  const email = user?.email || "";

  const names = fullname.trim().split(" ");
  const firstname = names[0]?.toUpperCase() || "";
  const lastname = names[1]?.toUpperCase() || "";

  const initials = `${firstname[0] || ""}${lastname[0] || ""}`;

  function openProfile() {
    setOpenMenu((prev) => !prev);
  }

  const handleLogout = async () => {
    await fetch("http://localhost:8000/api/v1/user/logout", {
      method: "POST",
      credentials: "include",
    });

    await refreshUser(); // will set user to null
    navigate("/login");
  };
  // Close dropdown if user clicks outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex justify-between items-center relative">
      {/* Logo */}
      <div>
        <img
          src="/logo2.png"
          alt="logo"
          className="h-[45px] object-contain w-[80%]"
        />
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-5 relative" ref={menuRef}>
        {/* Upgrade Button */}
        <button className="bg-[var(--primary-color)] text-[var(--secondary-color)] px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition">
          Upgrade Plan
        </button>

        {/* Notification */}
        <div className="relative border border-gray-200 p-3 rounded-xl inline-flex cursor-pointer hover:bg-gray-50 transition">
          <img
            src="/octicon--bell-fill-16.svg"
            alt="notification"
            className="w-5 h-5"
          />

          <span className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-[0.6rem] font-semibold">
            3
          </span>
        </div>

        {/* Profile Button */}
        <button
          onClick={openProfile}
          className="bg-[var(--primary-color)] text-[var(--secondary-color)] w-10 h-10 flex items-center justify-center rounded-full font-semibold cursor-pointer hover:scale-105 transition"
        >
          {initials}
        </button>

        {/* Dropdown Menu */}
        {openMenu && (
          <div className="absolute top-14 right-0 w-64 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden z-50">
            {/* Header */}
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
              <div className="bg-[var(--primary-color)] text-white w-10 h-10 flex items-center justify-center rounded-full font-semibold">
                {initials}
              </div>

              <div>
                <p className="font-semibold text-gray-900">{fullname}</p>
                <p className="text-sm text-gray-500">{email}</p>
              </div>
            </div>

            {/* Plan Badge */}
            <div className="px-4 pt-3">
              <span className="bg-orange-100 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full">
                Pro Plan
              </span>
            </div>

            {/* Menu Items */}
            <div className="p-2 mt-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition text-left">
                <span className="bg-gray-100 p-2 rounded-lg">👤</span>
                <span className="text-gray-800 font-medium">My profile</span>
              </button>

              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition text-left">
                <span className="bg-gray-100 p-2 rounded-lg">🔒</span>
                <span className="text-gray-800 font-medium">Security</span>
              </button>

              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition text-left">
                <span className="bg-gray-100 p-2 rounded-lg">⚙️</span>
                <span className="text-gray-800 font-medium">Settings</span>
              </button>
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 p-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition text-left text-red-600 font-medium"
              >
                <span className="bg-red-100 p-2 rounded-lg">↩️</span>
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}