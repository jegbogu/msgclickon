import { ChevronDown, Eye } from "lucide-react";
import { useState } from "react";
import EmailTemplateModal from "../component/email-templates/EmailTemplateModal";
import type {
  emailTemplates,
  TemplateId,
} from "../component/email-templates/emailTemplates";

type Template = {
  id: TemplateId | "custom";
  title: string;
  description: string;
  preview?: boolean;
};

type EmailautobdmProps = {
  onUseTemplate: (templateId: TemplateId) => void;
};

const templates: Template[] = [
  {
    id: "classic",
    title: "Classic birthday",
    description: "Warm, professional greeting",
    preview: true,
  },
  {
    id: "vibrant",
    title: "Fun & vibrant",
    description: "Colourful celebration style",
    preview: true,
  },
  {
    id: "corporate",
    title: "Corporate formal",
    description: "Professional business tone",
    preview: true,
  },
  {
    id: "personal",
    title: "Personal & warm",
    description: "Close, intimate tone",
    preview: true,
  },
  {
    id: "custom",
    title: "Build my own",
    description: "Start from scratch",
    preview: false,
  },
];

export default function Emailautobdm({
  onUseTemplate,
}: EmailautobdmProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<Template["id"]>("classic");

  const [previewTemplate, setPreviewTemplate] =
    useState<TemplateId | null>(null);

  const handlePreview = (
    e: React.MouseEvent,
    id: Template["id"]
  ) => {
    e.stopPropagation();

    if (id === "custom") return;

    setPreviewTemplate(id);
  };

  const handleUseTemplate = (id: TemplateId) => {
    setSelectedTemplate(id);

    // Send selected template to parent
    onUseTemplate(id);

    // Close modal
    setPreviewTemplate(null);
  };

  return (
    <>
      <div>
        <h2 className="mb-6 text-xl font-semibold text-gray-900">
          Email birthday message
        </h2>

        {/* Form Fields */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

          {/* Company */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Company name
            </label>

            <input
              type="text"
              placeholder="Your company or sender name"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Subject line
            </label>

            <input
              type="text"
              placeholder="e.g. Happy Birthday, {First Name}!"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500"
            />
          </div>

          {/* Timing */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Send timing
            </label>

            <div className="relative">
              <select className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-orange-500">
                <option>On birthday at 9:00 AM</option>
                <option>1 day before</option>
                <option>On birthday at 12:00 PM</option>
                <option>On birthday at 6:00 PM</option>
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="mt-8">
          <h3 className="mb-4 text-sm font-medium text-gray-700">
            Choose a template
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => {
              const active =
                selectedTemplate === template.id;

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() =>
                    setSelectedTemplate(template.id)
                  }
                  className={`rounded-xl border p-5 text-left transition-all ${
                    active
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <h4 className="font-medium text-gray-900">
                    {template.title}
                  </h4>

                  <p className="mt-2 text-sm text-gray-500">
                    {template.description}
                  </p>

                  {template.preview && (
                    <div
                      onClick={(e) =>
                        handlePreview(e, template.id)
                      }
                      className="mt-4 flex w-fit cursor-pointer items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600"
                    >
                      <Eye size={14} />
                      Preview template
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      <EmailTemplateModal
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onUseTemplate={handleUseTemplate}
      />
    </>
  );
}