import AddContactModal from "./addcontactmodal";
import { useRef, useState } from "react";

type ContactHeaderProps = {
  totalContacts: number;
};

export default function ContactHeader({
  totalContacts,
}: ContactHeaderProps) {
  const [open, setOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploads = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/user/contacts/import`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      alert(
        `${data.inserted || 0} contacts imported successfully`
      );

      // Optional: refresh contacts list
      window.location.reload();
    } catch (error: any) {
      alert(error.message || "Failed to upload contacts");
    }

    // Reset input so same file can be uploaded again
    e.target.value = "";
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mt-5">
      <AddContactModal
        isOpen={open}
        onClose={() => setOpen(false)}
      />

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-xl">
          👥
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Contacts
            </h2>

            <span className="bg-orange-100 text-orange-600 text-sm font-medium px-2 py-1 rounded-full">
              {totalContacts.toLocaleString()}
            </span>
          </div>

          <p className="text-sm text-gray-500 mt-1">
            Your central contact list — used across all campaigns and reminders
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="px-4 py-2 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition"
          onClick={() => setOpen(true)}
        >
          + Add contact
        </button>

        <button
          className="px-4 py-2 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition"
          onClick={handleUploads}
        >
          Import Contacts
        </button>

        <button className="px-5 py-2 rounded-xl bg-orange-500 text-white cursor-pointer hover:bg-orange-600 transition">
          Manage contacts →
        </button>
      </div>
    </div>
  );
}