import AddContactModal from "./addcontactmodal";
import { useState } from "react";
type ContactHeaderProps = {
  totalContacts: number;
};

export default function ContactHeader({    
  totalContacts,
}: ContactHeaderProps) {

 const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mt-5">
        <AddContactModal
        isOpen={open}
        onClose={() => setOpen(false)}
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
        <button className="px-4 py-2 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition"  onClick={() => setOpen(true)}>
          + Add contact
        </button>

        <button className="px-4 py-2 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition">
          Import CSV
        </button>

        <button className="px-5 py-2 rounded-xl bg-orange-500 text-white cursor-pointer hover:bg-orange-600 transition">
          Manage contacts →
        </button>
      </div>
    </div>
  );
}