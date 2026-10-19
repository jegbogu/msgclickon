import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CampaignTable from "../users/campaigntable";
import type { Campaign } from "../users/campaigntable";
import Managecontactsheader from "../users/managecontactsheader";
import UserDashboardNav from "../users/userdashboardnav";
import { useAuth } from "../AuthContext";

const API = "http://localhost:8000/api/v1/user";
const EMAIL_CAMPAIGNS_API = `${API}/email-campaigns`;

// Map the backend row to the shape CampaignTable expects.
const normalizeCampaign = (c: any): Campaign => ({
  id: String(c.id),
  name: c.name ?? "Untitled",
  companyName: c.company_name ?? null,
  type: String(c.campaign_type ?? "personal").toLowerCase() as Campaign["type"],
  channel: "Email", // this endpoint only returns Email_campaign rows
  contacts: c.contacts ?? 0,
  sent: c.number_of_sent_msg ?? 0,
  status: String(c.status ?? "draft").toLowerCase() as Campaign["status"],
  nextRun: c.next_run ? new Date(c.next_run).toLocaleString() : null,
  createdAt: c.created_at ?? null,
});

export default function CampaignPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Campaign ids with a request in flight (blocks double clicks)
  const pendingIds = useRef<Set<string>>(new Set());

  /* ---------------------------------------------------------- */
  /* LOAD                                                        */
  /* ---------------------------------------------------------- */

  useEffect(() => {
    if (!user?.id) return;

    const controller = new AbortController();

    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API}/campaigns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id }),
          signal: controller.signal,
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(
            typeof json.detail === "string"
              ? json.detail
              : "Failed to load campaigns"
          );
        }

        setCampaigns((json.data?.campaigns ?? []).map(normalizeCampaign));
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message ?? "Something went wrong");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchCampaigns();
    return () => controller.abort();
  }, [user?.id]);

  /* ---------------------------------------------------------- */
  /* PAUSE (-> draft) / RESUME (-> active)                       */
  /* ---------------------------------------------------------- */

  const changeStatus = async (
    campaign: Campaign,
    newStatus: "draft" | "active"
  ) => {
    if (!user?.id) return;
    if (pendingIds.current.has(campaign.id)) return;

    pendingIds.current.add(campaign.id);

    const previousStatus = campaign.status;
    const previousNextRun = campaign.nextRun;

    setCampaigns((list) =>
      list.map((c) =>
        c.id === campaign.id
          ? {
              ...c,
              status: newStatus,
              nextRun: newStatus === "draft" ? null : c.nextRun,
            }
          : c
      )
    );

    try {
      const res = await fetch(`${API}/campaigns/${campaign.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, status: newStatus }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          typeof json?.detail === "string"
            ? json.detail
            : "Failed to update campaign"
        );
      }

      const saved = json?.data;
      if (saved) {
        setCampaigns((list) =>
          list.map((c) =>
            c.id === campaign.id
              ? {
                  ...c,
                  status: String(saved.status).toLowerCase() as Campaign["status"],
                  nextRun: saved.next_run
                    ? new Date(saved.next_run).toLocaleString()
                    : null,
                }
              : c
          )
        );
      }
    } catch (err) {
      setCampaigns((list) =>
        list.map((c) =>
          c.id === campaign.id
            ? { ...c, status: previousStatus, nextRun: previousNextRun }
            : c
        )
      );

      alert(err instanceof Error ? err.message : "Failed to update campaign");
    } finally {
      pendingIds.current.delete(campaign.id);
    }
  };

  /* ---------------------------------------------------------- */
  /* DELETE (with confirmation)                                  */
  /* ---------------------------------------------------------- */

  const handleDelete = async (campaign: Campaign) => {
    if (!user?.id) return;
    if (pendingIds.current.has(campaign.id)) return;

    const confirmed = window.confirm(
      `Delete "${campaign.name}"?\n\nThis permanently removes the campaign and cannot be undone.`
    );

    if (!confirmed) return;

    pendingIds.current.add(campaign.id);

    try {
      const res = await fetch(
        `${EMAIL_CAMPAIGNS_API}/${campaign.id}?user_id=${encodeURIComponent(
          user.id
        )}`,
        { method: "DELETE" }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          typeof json?.detail === "string"
            ? json.detail
            : "Failed to delete campaign"
        );
      }

      // Only remove the row once the database confirms the delete
      setCampaigns((list) => list.filter((c) => c.id !== campaign.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete campaign");
    } finally {
      pendingIds.current.delete(campaign.id);
    }
  };

  /* ---------------------------------------------------------- */
  /* EDIT                                                        */
  /* ---------------------------------------------------------- */

  const handleEdit = (campaign: Campaign) => {
    navigate(`/auto_birthday_message?edit=${campaign.id}`);
  };

  return (
    <div className="min-h-screen">
      {/* Dashboard navigation */}
      <UserDashboardNav />

      {/* Campaign page */}
      <main className="min-h-screen bg-[var(--bg-color)] p-5">
        <Managecontactsheader
          pagename="Campaigns"
          title="Active Campaigns"
          description="All your active campaigns in one place - search, filter, pause or edit any of them"
        />

        {loading ? (
          <p className="text-sm text-gray-500">Loading campaigns…</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <CampaignTable
            campaigns={campaigns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPause={(c) => changeStatus(c, "draft")}
            onResume={(c) => changeStatus(c, "active")}
          />
        )}
      </main>
    </div>
  );
}
