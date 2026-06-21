import Userdashboardnav from "../users/userdashboardnav";
import UserSalutation from "../users/usersalutation";
import ContactHeader from "../users/contactheader";
import StatsSection from "../users/StatsSection";
import FeaturesSection from "../users/FeaturesSection";
import { useEffect, useState } from "react";

import { useAuth } from "../AuthContext";

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birthday: string;
  group_name: string;
};

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


  //this is for contacts
   useEffect(() => {
    if (!user?.id) return;

    const fetchDashboard = async () => {
      try {
        const res = await fetch(
          "http://localhost:8000/api/v1/user/contacts",
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

        setContacts(data?.data?.contacts || []);

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
    <div>
     <Userdashboardnav />

    <div className="p-5 bg-[var(--bg-color)] min-h-screen">
      
      <UserSalutation />
      <ContactHeader totalContacts={contacts.length} />
      <StatsSection />
      <FeaturesSection />
    </div>
    </div>
  );
}