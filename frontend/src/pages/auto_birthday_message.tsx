import { useState } from "react";

import Channelsheadersandnav from "../users/channelsheadersandnav";
import Emailautobdm from "../users/emailautobdm";
import EmailTemplateBuilder from "../users/emailtemplatebuilder";
import Managecontactsheader from "../users/managecontactsheader";
import UserDashboardNav from "../users/userdashboardnav";

import {
  emailTemplates,
  type TemplateId,
} from "../component/email-templates/emailTemplates";

export default function Autobirthdaymessage() {
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateId>("classic");

  const [templateContent, setTemplateContent] = useState(
    emailTemplates.classic.content
  );

  const handleUseTemplate = (templateId: TemplateId) => {
    setSelectedTemplate(templateId);

    setTemplateContent(
      emailTemplates[templateId].content
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)]">
      <UserDashboardNav />

      <div className="p-5">
        <Managecontactsheader
          pagename="AUTO BIRTHDAY MESSAGE"
          title="Set up birthday messages"
          description="Choose your channel - each has its own message builder and templates"
        />

        <Channelsheadersandnav />

        <div className="rounded-xl border border-gray-300 bg-white p-5">

          {/* Template selection */}
          <Emailautobdm
            onUseTemplate={handleUseTemplate}
          />

          {/* Email builder */}
          <EmailTemplateBuilder
            templateContent={templateContent}
            templateId={selectedTemplate}
          />

        </div>
      </div>
    </div>
  );
}