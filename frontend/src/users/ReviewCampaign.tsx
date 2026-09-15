import {
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import type {
  CampaignForm,
} from "./AutoBirthdayMessage";

import { useAuth } from "../AuthContext";


type Props = {
  campaign: CampaignForm;

  onBack: () => void;
};


 export default function ReviewCampaign({
  campaign,
  onBack,
}: Props) {

    const { user } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  const saveCampaign = async () => {

  try {

    setSaving(true);
    setError("");
    setSuccess("");

    const response = await fetch(
      "http://localhost:8000/api/v1/user/email-campaigns",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          user_id:user?.id,
          name:
            campaign.campaign.name,

          campaign_type:
            campaign.campaign.type,

          subject:
            campaign.campaign.subject,

          content:
            campaign.message.content,

          signature:
            campaign.message.signature,

          header_image_url:
            null,

          footer_image_url:
            null,

          send_time:
            campaign.campaign.sendTime,

          timezone:
            campaign.campaign.timezone,

          days_before_birthday:
            campaign.campaign.daysBeforeBirthday,

          contact_ids:
            campaign.selectedContactIds,

        }),
      }
    );
     console.log("data",{
        user_id:user?.id,
          name:
            campaign.campaign.name,

          campaign_type:
            campaign.campaign.type,

          subject:
            campaign.campaign.subject,

          content:
            campaign.message.content,

          signature:
            campaign.message.signature,

          header_image_url:
            null,

          footer_image_url:
            null,

          send_time:
            campaign.campaign.sendTime,

          timezone:
            campaign.campaign.timezone,

          days_before_birthday:
            campaign.campaign.daysBeforeBirthday,

          contact_ids:
            campaign.selectedContactIds,

        })

    const data = await response.json();
   

    if (!response.ok) {

      throw new Error(
        data.detail ||
        "Failed to create campaign"
      );

    }

    // Campaign saved successfully
    navigate("/campaigns");

  } catch (err) {

    console.error(err);

    setError(
      err instanceof Error
        ? err.message
        : "Failed to create campaign"
    );

  } finally {

    setSaving(false);

  }
};


  return (
    <div className="rounded-xl border bg-white">

      {/* HEADER */}

      <div className="border-b p-6">

        <h2 className="text-lg font-semibold">
          Review & save
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Review your birthday campaign before saving.
        </p>

      </div>


      <div className="space-y-6 p-6">


        {/* CAMPAIGN */}

        <section>

          <h3 className="mb-3 text-sm font-semibold">
            Campaign
          </h3>

          <div className="rounded-lg bg-gray-50 p-4">

            <div className="grid gap-4 md:grid-cols-2">

              <div>

                <p className="text-xs text-gray-500">
                  Name
                </p>

                <p className="mt-1 text-sm font-medium">
                  {campaign.campaign.name}
                </p>

              </div>


              <div>

                <p className="text-xs text-gray-500">
                  Type
                </p>

                <p className="mt-1 text-sm font-medium">
                  Birthday
                </p>

              </div>


              <div>

                <p className="text-xs text-gray-500">
                  Send time
                </p>

                <p className="mt-1 text-sm font-medium">
                  {campaign.campaign.sendTime}
                </p>

              </div>


              <div>

                <p className="text-xs text-gray-500">
                  Timezone
                </p>

                <p className="mt-1 text-sm font-medium">
                  {campaign.campaign.timezone}
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* MESSAGE */}

        <section>

          <h3 className="mb-3 text-sm font-semibold">
            Message
          </h3>

          <div className="rounded-lg border p-4">

            <p className="text-xs text-gray-500">
              Subject
            </p>

            <p className="mb-4 mt-1 text-sm font-medium">
              {campaign.campaign.subject}
            </p>


            <p className="text-xs text-gray-500">
              Content
            </p>

            <div className="mt-2 whitespace-pre-wrap rounded-md bg-gray-50 p-4 text-sm leading-6">
              {campaign.message.content}
            </div>


            {campaign.message.signature && (

              <>

                <p className="mt-4 text-xs text-gray-500">
                  Signature
                </p>

                <p className="mt-1 text-sm">
                  {campaign.message.signature}
                </p>

              </>

            )}

          </div>

        </section>


        {/* CONTACTS */}

        <section>

          <h3 className="mb-3 text-sm font-semibold">
            Recipients
          </h3>

          <div className="rounded-lg bg-gray-50 p-4">

            <p className="text-sm">

              <strong>
                {campaign.selectedContactIds.length}
              </strong>{" "}
              contacts selected

            </p>

          </div>

        </section>


        {/* ERROR */}

        {error && (

          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>

        )}


        {/* SUCCESS */}

        {success && (

          <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>

        )}


        {/* BUTTONS */}

        <div className="flex justify-between border-t pt-6">

          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            className="rounded-md border px-5 py-2 text-sm"
          >
            ← Back
          </button>


          <button
            type="button"
            onClick={saveCampaign}
            disabled={saving}
            className="rounded-md bg-[var(--primary-color)] px-6 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save Campaign"}
          </button>

        </div>

      </div>

    </div>
  );
}