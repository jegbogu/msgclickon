export default function CorporateBirthdayTemplate() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Email Header */}
      <div className="flex h-[45px] items-center justify-center bg-black">
        <span className="text-sm font-semibold text-white">
          {"{Company}"}
        </span>
      </div>

      {/* Email Body */}
      <div className="px-3 py-5 text-[11px] leading-[1.8] text-gray-600">
        <h3 className="mb-1 text-[12px] font-semibold text-gray-900">
          Dear {"{FirstName}"},
        </h3>

        <p className="mb-4">
          On behalf of the entire team at {"{Company}"}, we would like to
          extend our sincerest birthday wishes to you on this special
          occasion.
        </p>

        <p className="mb-1">
          Your continued partnership and trust mean a great deal to us. We
          hope this day brings you much joy, and we look forward to continuing
          to serve you in the year ahead.
        </p>

        <p className="mb-1">
          With best regards,
        </p>

        <p className="font-medium text-gray-700">
          {"{Company}"} Team
        </p>
      </div>
    </div>
  );
}