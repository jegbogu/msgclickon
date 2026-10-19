import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatsCard from "./StatsCard";
import { useAuth } from "../AuthContext";

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birthday: string;
  group_name: string;
};

type CampaignRow = {
  id: string;
  status: string;
};

const API = "http://localhost:8000/api/v1/user";

async function postUser<T>(
  path: string,
  userId: string,
  signal: AbortSignal
): Promise<T> {
  const res = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
    signal,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      typeof json.detail === "string" ? json.detail : `Failed to load ${path}`
    );
  }

  return json;
}

export default function StatsSection() {
  const { user } = useAuth();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);

        const [contactsRes, campaignsRes] = await Promise.all([
          postUser<any>("contacts", user.id, controller.signal),
          postUser<any>("campaigns", user.id, controller.signal),
        ]);

        setContacts(contactsRes?.data?.contacts ?? []);
        setCampaigns(campaignsRes?.data?.campaigns ?? []);
      } catch (err: any) {
        if (err.name !== "AbortError") console.error("Stats load failed:", err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [user?.id]);

  const activeCampaigns = campaigns.filter(
    (c) => String(c.status).toLowerCase() === "active"
  ).length;

  const groupCount = new Set(
    contacts.map((c) => c.group_name).filter(Boolean)
  ).size;

  const show = (n: number) => (loading ? "…" : n);

  return (
    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <StatsCard
        title="Messages sent today"
        value="—"
        subtitle="No data yet"
      />

      <Link to="/campaigns" className="block cursor-pointer">
        <StatsCard
          title="Active campaigns"
          value={show(activeCampaigns)}
          subtitle={`${campaigns.length} total · Click to manage`}
        />
      </Link>

      <Link to="/Contactmanager" className="block cursor-pointer">
        <StatsCard
          title="Total contacts"
          value={show(contacts.length)}
          subtitle={
            groupCount > 0
              ? `Across ${groupCount} ${groupCount === 1 ? "group" : "groups"}`
              : "No groups yet"
          }
        />
      </Link>

      <StatsCard
        title="Open rate"
        value="—"
        subtitle="No data yet"
      />
    </div>
  );
}