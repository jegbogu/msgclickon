import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { CampaignForm } from "./AutoBirthdayMessage";
import { useAuth } from "../AuthContext";

const API_URL = "http://localhost:8000";

type ReviewCampaignProps = {
  campaign: CampaignForm;
  onBack: () => void;
};

export default function ReviewCampaign({
  campaign,
  onBack,
}: ReviewCampaignProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<
    "draft" | "campaign" | null
  >(null);

  const handleSave = async (
    mode: "draft" | "campaign",
  ) => {
    if (!user?.id) {
      alert("User information is missing.");
      return;
    }

    if (!campaign.campaign.companyName?.trim()) {
      alert(
        "Please enter a company or organization name.",
      );
      return;
    }

    if (!campaign.campaign.subject.trim()) {
      alert("Please enter an email subject.");
      return;
    }

    if (!campaign.campaign.sendTime) {
      alert(
        "Please choose a time for the email to be sent.",
      );
      return;
    }

    if (!campaign.campaign.timezone) {
      alert("Please choose a timezone.");
      return;
    }

    if (!campaign.selectedContactIds.length) {
      alert("Please select at least one contact.");
      return;
    }

    try {
      setSaving(true);
      setSaveMode(mode);

      const payload = {
        user_id: user.id,

        // Campaign name
        name: campaign.campaign.name,

        // Company / organization entered in EmailTemplateBuilder
        company_name:
          campaign.campaign.companyName.trim(),

        campaign_type: campaign.campaign.type,

        // Email subject entered in EmailTemplateBuilder
        subject: campaign.campaign.subject.trim(),

        // Final email HTML
        content: campaign.message.content,

        signature:
          campaign.message.signature?.trim() || null,

        header_image_url:
          campaign.message.headerImageUrl || null,

        footer_image_url:
          campaign.message.footerImageUrl || null,

        // Actual selected send time
        send_time: campaign.campaign.sendTime,

        // Actual timezone from CampaignForm
        timezone: campaign.campaign.timezone,

        days_before_birthday:
          campaign.campaign.daysBeforeBirthday,

        contact_ids: campaign.selectedContactIds,

        status:
          mode === "draft"
            ? "draft"
            : "active",
      };

      console.log("Campaign payload:", payload);

      const response = await fetch(
        `${API_URL}/api/v1/user/email-campaigns`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            "Failed to save campaign.",
        );
      }

      alert(
        mode === "draft"
          ? "Campaign draft saved successfully!"
          : "Campaign saved successfully!",
      );

      navigate("/campaigns");
    } catch (error) {
      console.error(
        "Campaign save error:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to save campaign.",
      );
    } finally {
      setSaving(false);
      setSaveMode(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">
          Review Campaign
        </h2>

        <p className="text-sm text-gray-500">
          Review your campaign before saving it.
        </p>
      </div>

      {/* Campaign Details */}
      <div className="rounded-xl border bg-white p-5">
        <h3 className="mb-4 font-semibold">
          Campaign Details
        </h3>

        <div className="space-y-3 text-sm">
          <p>
            <strong>Campaign Name:</strong>{" "}
            {campaign.campaign.name ||
              "Birthday Campaign"}
          </p>

          <p>
            <strong>Company / Organization:</strong>{" "}
            {campaign.campaign.companyName ||
              "No company name entered"}
          </p>

          <p>
            <strong>Email Subject:</strong>{" "}
            {campaign.campaign.subject ||
              "No subject entered"}
          </p>

          <p>
            <strong>Send Time:</strong>{" "}
            {campaign.campaign.sendTime ||
              "No send time selected"}
          </p>

          <p>
            <strong>Timezone:</strong>{" "}
            {campaign.campaign.timezone ||
              "No timezone selected"}
          </p>

           
        </div>
      </div>

      {/* Header Image */}
      {campaign.message.headerImageUrl && (
        <div className="rounded-xl border bg-white p-5">
          <h3 className="mb-3 font-semibold">
            Header Image
          </h3>

          <img
            src={campaign.message.headerImageUrl}
            alt="Campaign header"
            className="max-h-48 w-full rounded-lg object-cover"
          />
        </div>
      )}

      {/* Email Content */}
      <div className="rounded-xl border bg-white p-5">
        <h3 className="mb-4 font-semibold">
          Email Content
        </h3>

        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{
            __html: campaign.message.content,
          }}
        />
      </div>

      {/* Footer Image */}
      {campaign.message.footerImageUrl && (
        <div className="rounded-xl border bg-white p-5">
          <h3 className="mb-3 font-semibold">
            Footer Image
          </h3>

          <img
            src={campaign.message.footerImageUrl}
            alt="Campaign footer"
            className="max-h-40 w-full rounded-lg object-cover"
          />
        </div>
      )}

      {/* Signature */}
      {campaign.message.signature && (
        <div className="rounded-xl border bg-white p-5">
          <h3 className="mb-2 font-semibold">
            Signature
          </h3>

          <p>{campaign.message.signature}</p>
        </div>
      )}

      {/* Contacts */}
      <div className="rounded-xl border bg-white p-5">
        <h3 className="mb-2 font-semibold">
          Contacts
        </h3>

        <p className="text-sm text-gray-500">
          {campaign.selectedContactIds.length}{" "}
          contact(s) selected
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Back */}
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="rounded-md border border-gray-300 px-6 py-3 text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>

        <div className="flex flex-wrap gap-3">
          {/* Save Draft */}
          <button
            type="button"
            onClick={() =>
              handleSave("draft")
            }
            disabled={saving}
            className="rounded-md border border-[var(--primary-color)] px-6 py-3 text-[var(--primary-color)] transition hover:bg-orange-50 disabled:opacity-50"
          >
            {saving &&
            saveMode === "draft"
              ? "Saving Draft..."
              : "Save as Draft"}
          </button>

          {/* Save Campaign */}
          <button
            type="button"
            onClick={() =>
              handleSave("campaign")
            }
            disabled={saving}
            className="rounded-md bg-[var(--primary-color)] px-6 py-3 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving &&
            saveMode === "campaign"
              ? "Saving..."
              : "Save Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}