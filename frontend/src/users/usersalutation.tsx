import { useAuth } from "../AuthContext";

export default function UserSalutation() {
  const { user } = useAuth();

  const hours = new Date().getHours();

  const greeting =
    hours < 12
      ? "Morning"
      : hours < 18
      ? "Afternoon"
      : "Evening";

  return (
    <div>
      <p className="text-[var(--primary-color)] font-bold text-sm">
        WELCOME
      </p>

      <h1 className="font-bold text-2xl text-black mt-2">
        Good {greeting}, {user?.fullname}
      </h1>

      <p className="text-sm text-gray-500 mt-2">
        Choose a card below to set up your messages.
      </p>
    </div>
  );
}