import Userdashboardnav from "../users/userdashboardnav";
import UserSalutation from "../users/usersalutation";
import ContactHeader from "../users/contactheader";
import StatsSection from "../users/StatsSection";
import FeaturesSection from "../users/FeaturesSection";
import { useEffect } from "react";

import { useAuth } from "../AuthContext";

export default function Dashboard() {
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const fetchDashboard = async () => {
      try {
        const res = await fetch(
          "http://localhost:8000/api/v1/user/dashboard",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: user.id,
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          console.error(data);
          return;
        }

        await refreshUser();
      } catch (err) {
        console.error("err", err);
      }
    };

    fetchDashboard();
  }, [user?.id]);

  return (
    <div className="p-5">
      <Userdashboardnav />
      <UserSalutation />
      <ContactHeader totalContacts={4387} />
      <StatsSection />
      <FeaturesSection />
    </div>
  );
}