import {
  Image,
  Type,
  PenSquare,
  FileText,
  Upload,
  Plus,
} from "lucide-react";

export default function EmailTemplateBuilder() {
  return (
    <div className="w-full p-4 bg-white">
      {/* Editor Area */}
      <div className="border rounded-xl overflow-hidden">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-32 border-r bg-gray-50 p-4">
            <h3 className="text-xs font-semibold text-gray-500 mb-4">
              ELEMENTS
            </h3>

            <div className="space-y-3">
              <button className="w-full border rounded-md p-2 flex items-center gap-2 text-sm hover:bg-gray-100">
                <Type size={16} />
                Text
              </button>

              <button className="w-full border rounded-md p-2 flex items-center gap-2 text-sm hover:bg-gray-100">
                <Image size={16} />
                Image
              </button>

              <button className="w-full border rounded-md p-2 flex items-center gap-2 text-sm hover:bg-gray-100">
                <PenSquare size={16} />
                Signature
              </button>
            </div>

            <h3 className="text-xs font-semibold text-gray-500 mt-8 mb-4">
              LAYOUT
            </h3>

            <div className="space-y-3">
              <button className="w-full border rounded-md p-2 flex items-center gap-2 text-sm hover:bg-gray-100">
                <FileText size={16} />
                Header
              </button>

              <button className="w-full border rounded-md p-2 flex items-center gap-2 text-sm hover:bg-gray-100">
                <FileText size={16} />
                Footer
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-gray-50 p-4">
            {/* Header Upload */}
            <div className="h-16 rounded-lg bg-stone-100 flex items-center justify-center text-gray-500 text-sm">
              <Upload size={16} className="mr-2" />
              Click to upload email header - 600x150px
            </div>

            {/* Email Body */}
            <div className="bg-white rounded-lg mt-4 p-4 border">
              <div className="flex gap-2 flex-wrap mb-4">
                <button className="px-3 py-1 bg-gray-100 rounded text-xs">
                  + {"{FirstName}"}
                </button>

                <button className="px-3 py-1 bg-gray-100 rounded text-xs">
                  + {"{LastName}"}
                </button>

                <button className="px-3 py-1 bg-gray-100 rounded text-xs">
                  + {"{Company}"}
                </button>
              </div>

              <textarea
                rows={8}
                className="w-full resize-none outline-none text-sm"
                defaultValue={`Happy birthday, {FirstName}!

Wishing you a wonderful day filled with joy. From all of us at {Company}, we hope this year brings you everything you deserve.

Warm regards,
The {Company} Team`}
              />
            </div>

            {/* Drag Area */}
            <div className="mt-4 border-2 border-dashed rounded-lg h-20 flex items-center justify-center text-gray-400">
              <Plus size={20} className="mr-2" />
              Drag an element here
            </div>

            {/* Footer */}
            <div className="mt-4 bg-stone-100 rounded-lg py-4 text-center text-sm text-gray-500">
              © 2025 Your Company &nbsp;&nbsp; Unsubscribe &nbsp;&nbsp; View in
              browser
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div className="border-2 border-dashed rounded-xl h-36 flex flex-col items-center justify-center">
          <Upload size={24} />
          <p className="mt-2 font-medium">Upload header banner</p>
          <p className="text-xs text-gray-500">600 x 150px PNG, JPG</p>
        </div>

        <div className="border-2 border-dashed rounded-xl h-36 flex flex-col items-center justify-center">
          <Upload size={24} />
          <p className="mt-2 font-medium">Upload footer banner</p>
          <p className="text-xs text-gray-500">600 x 80px PNG, JPG</p>
        </div>
      </div>

      {/* Signature */}
      <div className="mt-6">
        <label className="block text-sm font-medium mb-2">
          Sender signature
        </label>

        <input
          type="text"
          placeholder="e.g. The {Company} Team - you@yourcompany.com"
          className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button className="px-5 py-2 bg-[var(--primary-color)] text-white mt-5 rounded-md">Next →</button>
      </div>
    </div>
  );
}