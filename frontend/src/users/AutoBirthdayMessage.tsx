import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import EmailTemplateBuilder from "./emailtemplatebuilder";
import SelectContacts from "./SelectContacts";
import ReviewCampaign from "./ReviewCampaign";
import { useAuth } from "../AuthContext";

import type { TemplateId } from "../component/email-templates/emailTemplates";

const API_URL = "http://localhost:8000";

export type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  group_name: string | null;
};

export type EditorElement = {
  id: string;
  type: "text" | "image" | "signature" | "header" | "footer";
  content?: string;
  imageUrl?: string;
};

export type CampaignForm = {
  campaign: {
    name: string;
    companyName: string;
    type: "birthday";
    subject: string;
    sendTime: string;
    timezone: string;
    daysBeforeBirthday: number;
  };
  message: {
    templateId: TemplateId | "";
    // Raw text typed in the builder's main textarea
    bodyText: string;
    // Final email HTML sent to the backend
    content: string;
    signature: string;
    headerImageUrl: string | null;
    footerImageUrl: string | null;
    elements: EditorElement[];
  };
  selectedContactIds: string[];
};

type MessageNextData = {
  templateId: TemplateId;
  campaignName: string;
  bodyText: string;
  content: string;
  companyName: string;
  subject: string;
  sendTime: string;
  timezone: string;
  signature: string;
  headerImageUrl: string | null;
  footerImageUrl: string | null;
  elements: EditorElement[];
};

const newId = (type: string) =>
  `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Turns the saved email HTML back into the builder's main text + elements.
 * The builder generates a predictable structure:
 *   - main text:   <div> (no style)
 *   - text block:  <div style="margin-top:16px;">
 *   - image:       <div style="margin-top:16px; text-align:center;"><img/></div>
 *   - signature:   <div style="margin-top:20px;">
 */
const parseSavedContent = (html: string) => {
  const doc = new DOMParser().parseFromString(html || "", "text/html");

  const toText = (el: Element) => {
    const clone = el.cloneNode(true) as Element;
    clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
    return (clone.textContent ?? "").trim();
  };

  let bodyText = "";
  let bodyTextFound = false;
  const elements: EditorElement[] = [];

  Array.from(doc.body.children).forEach((child) => {
    const style = (child.getAttribute("style") ?? "").replace(/\s+/g, "");
    const img = child.querySelector("img");

    if (img) {
      elements.push({
        id: newId("image"),
        type: "image",
        imageUrl: img.getAttribute("src") ?? undefined,
      });
      return;
    }

    if (!style && !bodyTextFound) {
      bodyText = toText(child);
      bodyTextFound = true;
      return;
    }

    if (style.includes("margin-top:20px")) {
      elements.push({
        id: newId("signature"),
        type: "signature",
        content: toText(child),
      });
      return;
    }

    elements.push({
      id: newId("text"),
      type: "text",
      content: toText(child),
    });
  });

  return { bodyText, elements };
};

const emptyForm = (): CampaignForm => ({
  campaign: {
    name: "",
    companyName: "",
    type: "birthday",
    subject: "",
    sendTime: "08:00",
    timezone: "Africa/Johannesburg",
    daysBeforeBirthday: 0,
  },
  message: {
    templateId: "",
    bodyText: "",
    content: "",
    signature: "",
    headerImageUrl: null,
    footerImageUrl: null,
    elements: [],
  },
  selectedContactIds: [],
});

export default function AutoBirthdayMessage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // /auto_birthday_message?edit=<campaign id>
  const editId = searchParams.get("edit");

  const [step, setStep] = useState(1);
  const [campaignForm, setCampaignForm] = useState<CampaignForm>(emptyForm);

  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));
  const [editError, setEditError] = useState<string | null>(null);

  /* ---------------------------------------------------------- */
  /* EDIT MODE: load the campaign and prefill the form           */
  /* ---------------------------------------------------------- */

  useEffect(() => {
    if (!editId) {
      setLoadingEdit(false);
      return;
    }

    if (!user?.id) return;

    const controller = new AbortController();

    const loadCampaign = async () => {
      try {
        setLoadingEdit(true);
        setEditError(null);

        const res = await fetch(
          `${API_URL}/api/v1/user/email-campaigns/${editId}?user_id=${encodeURIComponent(
            user.id
          )}`,
          { signal: controller.signal }
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(
            typeof json.detail === "string"
              ? json.detail
              : "Failed to load campaign"
          );
        }

        const c = json.campaign;
        const { bodyText, elements } = parseSavedContent(c.content ?? "");

        setCampaignForm({
          campaign: {
            name: c.name ?? "",
            companyName: c.company_name ?? "",
            type: "birthday",
            subject: c.subject ?? "",
            sendTime: c.send_time ?? "08:00",
            timezone: c.timezone ?? "Africa/Johannesburg",
            daysBeforeBirthday: c.days_before_birthday ?? 0,
          },
          message: {
            templateId: "",
            bodyText,
            content: c.content ?? "",
            signature: c.signature ?? "",
            headerImageUrl: c.header_image_url ?? null,
            footerImageUrl: c.footer_image_url ?? null,
            elements,
          },
          selectedContactIds: c.contact_ids ?? [],
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setEditError(err.message ?? "Failed to load campaign");
        }
      } finally {
        if (!controller.signal.aborted) setLoadingEdit(false);
      }
    };

    loadCampaign();
    return () => controller.abort();
  }, [editId, user?.id]);

  /* ---------------------------------------------------------- */
  /* STEP HANDLERS                                               */
  /* ---------------------------------------------------------- */

  const handleMessageNext = (data: MessageNextData) => {
    setCampaignForm((previous) => ({
      ...previous,
      campaign: {
        ...previous.campaign,
        name: data.campaignName.trim(),
        companyName: data.companyName.trim(),
        subject: data.subject.trim(),
        sendTime: data.sendTime,
        timezone: data.timezone,
      },
      message: {
        templateId: data.templateId,
        bodyText: data.bodyText,
        content: data.content,
        signature: data.signature,
        headerImageUrl: data.headerImageUrl,
        footerImageUrl: data.footerImageUrl,
        elements: data.elements,
      },
    }));

    setStep(2);
  };

  const handleContactsNext = (contactIds: string[]) => {
    setCampaignForm((previous) => ({
      ...previous,
      selectedContactIds: contactIds,
    }));
    setStep(3);
  };

  const handleBack = () => {
    setStep((previous) => Math.max(1, previous - 1));
  };

  /* ---------------------------------------------------------- */
  /* RENDER                                                      */
  /* ---------------------------------------------------------- */

  if (loadingEdit) {
    return <p className="text-sm text-gray-500">Loading campaign…</p>;
  }

  if (editError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-500">{editError}</p>
        <button
          type="button"
          onClick={() => navigate("/campaigns")}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Back to campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {editId && (
        <p className="mb-3 text-sm text-gray-500">
          Editing campaign:{" "}
          <strong className="font-medium text-gray-700">
            {campaignForm.campaign.name || "Untitled"}
          </strong>
        </p>
      )}

      <div className="mb-6 flex items-center">
        <div className={step >= 1 ? "font-medium text-orange-500" : "text-gray-400"}>
          1. Message setup
        </div>
        <div className="mx-4 h-px flex-1 bg-gray-300" />
        <div className={step >= 2 ? "font-medium text-orange-500" : "text-gray-400"}>
          2. Select contacts
        </div>
        <div className="mx-4 h-px flex-1 bg-gray-300" />
        <div className={step >= 3 ? "font-medium text-orange-500" : "text-gray-400"}>
          3. Review & save
        </div>
      </div>

      {step === 1 && (
        <EmailTemplateBuilder
          templateId={campaignForm.message.templateId as TemplateId}
          templateContent={campaignForm.message.bodyText}
          initialCampaignName={campaignForm.campaign.name}
          initialCompanyName={campaignForm.campaign.companyName}
          initialSubject={campaignForm.campaign.subject}
          initialSendTime={campaignForm.campaign.sendTime}
          initialTimezone={campaignForm.campaign.timezone}
          initialSignature={campaignForm.message.signature}
          initialHeaderImageUrl={campaignForm.message.headerImageUrl}
          initialFooterImageUrl={campaignForm.message.footerImageUrl}
          initialElements={campaignForm.message.elements}
          onNext={handleMessageNext}
        />
      )}

      {step === 2 && (
        <SelectContacts
          selectedContactIds={campaignForm.selectedContactIds}
          onBack={handleBack}
          onNext={handleContactsNext}
        />
      )}

      {step === 3 && (
        <ReviewCampaign
          campaign={campaignForm}
          editId={editId ?? undefined}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
