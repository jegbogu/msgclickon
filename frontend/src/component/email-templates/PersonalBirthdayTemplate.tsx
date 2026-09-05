export default function PersonalBirthdayTemplate() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Email Header */}
      <div className="flex h-[45px] items-center justify-center bg-gradient-to-r from-[#8137e8] to-[#5721a8]">
        <span className="text-sm">
          💌
        </span>
      </div>

      {/* Email Body */}
      <div className="px-3 py-5 text-[11px] leading-[1.8] text-gray-600">
        <h3 className="mb-1 text-[12px] font-semibold text-gray-900">
          Hey {"{FirstName}"} 💜
        </h3>

        <p className="mb-4">
          Just wanted to take a moment on your birthday to say — you matter.
          Not just as a client or contact, but as a person. Today is about you,
          and you deserve every bit of happiness coming your way.
        </p>

        <p className="mb-4">
          We don't say it enough, but we're really glad to have you in our
          world. Here's to you, today and always. 🥂
        </p>

        <p className="mb-1">
          Happy birthday from all of us,
        </p>

        <p className="font-medium text-gray-700">
          {"{Company}"} ❤️
        </p>
      </div>
    </div>
  );
}