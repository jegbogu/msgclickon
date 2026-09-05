import { X } from "lucide-react";
import ClassicBirthdayTemplate from "./ClassicBirthdayTemplate";
import VibrantBirthdayTemplate from "./VibrantBirthdayTemplate";
import CorporateBirthdayTemplate from "./CorporateBirthdayTemplate";
import PersonalBirthdayTemplate from "./PersonalBirthdayTemplate";

type TemplateType = "classic" | "vibrant" | "corporate" | "personal";

type EmailTemplateModalProps = {
  template: TemplateType | null;
  onClose: () => void;
  onUseTemplate: (template: TemplateType) => void;
};

export default function EmailTemplateModal({
  template,
  onClose,
  onUseTemplate,
}: EmailTemplateModalProps) {
  if (!template) return null;

  const templateNames = {
    classic: "🎂 Classic birthday",
    vibrant: "🎉 Fun & Vibrant",
    corporate: "🏢 Corporate formal",
    personal: "💌 Personal & warm",
  };

  const TemplateComponent = {
    classic: ClassicBirthdayTemplate,
    vibrant: VibrantBirthdayTemplate,
    corporate: CorporateBirthdayTemplate,
    personal: PersonalBirthdayTemplate,
  }[template];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex h-[52px] items-center justify-between border-b border-gray-200 px-5">
          <h2 className="text-sm font-semibold text-gray-900">
            {templateNames[template]} — Email preview
          </h2>

          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Email Preview */}
        <div className="max-h-[520px] overflow-y-auto bg-white px-7 py-4">
          <TemplateComponent />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-4 border-t border-gray-200 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-6 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Close
          </button>

          <button
  onClick={() => onUseTemplate(template)}
  className="rounded-lg bg-orange-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
>
  Use this template
</button>
        </div>
      </div>
    </div>
  );
}