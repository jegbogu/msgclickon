export default function VibrantBirthdayTemplate() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Email Header */}
      <div className="flex h-[45px] items-center justify-center bg-[#f45a00]">
        <span className="text-sm">
          🎉🎂🥳
        </span>
      </div>

      {/* Email Body */}
      <div className="px-3 py-5 text-[11px] leading-[1.8] text-gray-600">
        <h3 className="mb-1 text-[12px] font-semibold text-orange-500">
          IT’S YOUR BIRTHDAY!!! 🎊
        </h3>

        <p className="mb-3">
          Hey {"{FirstName}"}! 🎂
        </p>

        <p className="mb-3">
          Drop everything for a moment because today is ALL about YOU! 🎈❤️
        </p>

        {/* Highlight Box */}
        <div className="mb-4 border-l-[3px] border-orange-500 bg-orange-50 px-3 py-2 text-[11px] leading-[1.7] text-gray-700">
          From everyone here at {"{Company}"} — we’re sending you the biggest
          birthday love. May today be as amazing as you are! 🎉
        </div>

        <p className="mb-3">
          Go celebrate and enjoy every single minute of your special day! 🎁✨
        </p>

        <p className="mb-4">
          With all the birthday energy,
        </p>

        <p className="font-medium text-gray-700">
          The {"{Company}"} Crew
        </p>
      </div>
    </div>
  );
}