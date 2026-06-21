import StatsCard from "./StatsCard";

import { useEffect, useState } from "react";

import { useAuth } from "../AuthContext";


export default function StatsSection() {

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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">
      <StatsCard
        title="Messages sent today"
        value="1,284"
        subtitle="↑ 8% from yesterday"
      />

      <StatsCard
        title="Active campaigns"
        value="10"
        subtitle="Click to manage"
      />

      <StatsCard
        title="Total contact"
        value={contacts.length}
        subtitle="↑ 24 this week"
      />

      <StatsCard
        title="Open rate"
        value="90.2%"
        subtitle="↑ 2.1% this week"
      />
    </div>
  );
}