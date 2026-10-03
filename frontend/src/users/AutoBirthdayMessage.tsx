import { useState } from "react";

import EmailTemplateBuilder from "./emailtemplatebuilder";
import SelectContacts from "./SelectContacts";
import ReviewCampaign from "./ReviewCampaign";

import type { TemplateId } from "../component/email-templates/emailTemplates";

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

export default function AutoBirthdayMessage() {
  const [step, setStep] = useState(1);

  const [campaignForm, setCampaignForm] = useState<CampaignForm>({
    campaign: {
      name: "Birthday Campaign",
      companyName: "",
      type: "birthday",
      subject: "",
      sendTime: "08:00",
      timezone: "Africa/Johannesburg",
      daysBeforeBirthday: 0,
    },
    message: {
      templateId: "",
      content: "",
      signature: "",
      headerImageUrl: null,
      footerImageUrl: null,
      elements: [],
    },
    selectedContactIds: [],
  });

  const handleMessageNext = (data: MessageNextData) => {
    setCampaignForm((previous) => ({
      ...previous,
      campaign: {
        ...previous.campaign,
        name: "Birthday Campaign",
        companyName: data.companyName.trim(),
        subject: data.subject.trim(),
        sendTime: data.sendTime,
        timezone: data.timezone,
      },
      message: {
        templateId: data.templateId,
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

  return (
    <div className="w-full">
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
          templateContent={campaignForm.message.content}
          initialCompanyName={campaignForm.campaign.companyName}
          initialSubject={campaignForm.campaign.subject}
          initialSendTime={campaignForm.campaign.sendTime}
          initialTimezone={campaignForm.campaign.timezone}
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
        <ReviewCampaign campaign={campaignForm} onBack={handleBack} />
      )}
    </div>
  );
}
