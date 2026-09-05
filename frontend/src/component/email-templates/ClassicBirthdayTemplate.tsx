export default function ClassicBirthdayTemplate() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Email Header */}
      <div className="flex h-[45px] items-center justify-center bg-[#f45a00]">
        <span className="text-sm font-semibold text-white">
          msgclickon
        </span>
      </div>

      {/* Email Body */}
      <div className="px-3 py-5 text-[11px] leading-[1.8] text-gray-600">
        <h3 className="mb-1 text-[12px] font-semibold text-gray-900">
          Happy birthday, {"{FirstName}"}! 🎂
        </h3>

        <p className="mb-3">
          We hope this message finds you surrounded by joy and celebration.
        </p>

        <p className="mb-3">
          Today is your special day, and we at {"{Company}"} wanted to take a
          moment to let you know how much you’re appreciated.
        </p>

        <p className="mb-4">
          Wishing you a year filled with success, happiness and all the things
          that makes you smile. Thank you for being part of our journey.
        </p>

        <p className="mb-1">
          With warm regards,
        </p>

        <p className="font-medium text-gray-700">
          The {"{Company}"} Team
        </p>
      </div>
    </div>
  );
}