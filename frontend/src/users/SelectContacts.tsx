import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  Contact,
} from "./AutoBirthdayMessage";

import { useAuth } from "../AuthContext";

type Props = {
  selectedContactIds: string[];

  onBack: () => void;

  onNext: (
    contactIds: string[]
  ) => void;
};


export default function SelectContacts({
  selectedContactIds,
  onBack,
  onNext,
}: Props) {

  const { user } = useAuth();

  const [contacts, setContacts] =
    useState<Contact[]>([]);

  const [selectedIds, setSelectedIds] =
    useState<string[]>(
      selectedContactIds
    );

  const [search, setSearch] =
    useState("");

  const [group, setGroup] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  /*
   * GET CONTACTS
   */

 useEffect(() => {

  if (!user?.id) return;

  const loadContacts = async () => {

    try {

      setLoading(true);
      setError("");

      const response = await fetch(
        `http://localhost:8000/api/v1/user/contacts?user_id=${user.id}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load contacts"
        );
      }

      const data = await response.json();

      console.log("Contacts response:", data);

      const contactData =
        data?.data?.contacts || [];

      setContacts(contactData);

    } catch (err) {

      console.error(err);

      setError(
        "Unable to load your contacts."
      );

    } finally {

      setLoading(false);
    }
  };

  loadContacts();

}, [user?.id]);

  /*
   * GROUPS
   */

  const groups = useMemo(() => {

    const values = contacts
      .map(
        (contact) =>
          contact.group_name
      )
      .filter(Boolean) as string[];

    return [
      ...new Set(values),
    ];

  }, [contacts]);


  /*
   * FILTER
   */

  const filteredContacts =
    useMemo(() => {

      const query =
        search
          .trim()
          .toLowerCase();

      return contacts.filter(
        (contact) => {

          const matchesSearch =
            !query ||
            `${contact.first_name} ${contact.last_name}`
              .toLowerCase()
              .includes(query) ||
            (contact.email || "")
              .toLowerCase()
              .includes(query) ||
            (contact.phone || "")
              .toLowerCase()
              .includes(query);

          const matchesGroup =
            group === "all" ||
            contact.group_name === group;

          return (
            matchesSearch &&
            matchesGroup
          );
        }
      );

    }, [
      contacts,
      search,
      group,
    ]);


  /*
   * SELECT CONTACT
   */

  const toggleContact = (
    id: string
  ) => {

    setSelectedIds(
      (previous) => {

        if (
          previous.includes(id)
        ) {
          return previous.filter(
            (item) => item !== id
          );
        }

        return [
          ...previous,
          id,
        ];
      }
    );
  };


  /*
   * SELECT ALL FILTERED
   */

  const allFilteredSelected =
    filteredContacts.length > 0 &&
    filteredContacts.every(
      (contact) =>
        selectedIds.includes(
          contact.id
        )
    );


  const toggleSelectAll = () => {

    if (allFilteredSelected) {

      setSelectedIds(
        (previous) =>
          previous.filter(
            (id) =>
              !filteredContacts.some(
                (contact) =>
                  contact.id === id
              )
          )
      );

      return;
    }


    setSelectedIds(
      (previous) => {

        const newIds = [
          ...previous,
        ];

        filteredContacts.forEach(
          (contact) => {

            if (
              !newIds.includes(
                contact.id
              )
            ) {
              newIds.push(
                contact.id
              );
            }

          }
        );

        return newIds;
      }
    );
  };


  /*
   * NEXT
   */

  const handleNext = () => {

    if (
      selectedIds.length === 0
    ) {
      setError(
        "Please select at least one contact."
      );

      return;
    }

    onNext(selectedIds);
  };


  return (
    <div className="rounded-xl border bg-white">

      {/* HEADER */}

      <div className="border-b p-5">

        <h2 className="text-base font-semibold">
          Select contacts to include
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Pick from your saved contacts.
        </p>

      </div>


      {/* CONTROLS */}

      <div className="flex flex-wrap gap-3 border-b p-4">

        <input
          type="text"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search by name, email or phone..."
          className="w-full max-w-md rounded-md border px-4 py-2 text-sm outline-none focus:border-orange-400"
        />


        <select
          value={group}
          onChange={(e) =>
            setGroup(e.target.value)
          }
          className="rounded-md border px-3 py-2 text-sm"
        >

          <option value="all">
            All groups
          </option>

          {groups.map(
            (item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            )
          )}

        </select>


        <button
          type="button"
          onClick={
            toggleSelectAll
          }
          className="rounded-md border px-4 py-2 text-sm text-orange-500 hover:bg-orange-50"
        >
          {allFilteredSelected
            ? "Deselect all"
            : "Select all"}
        </button>

      </div>


      {/* ERROR */}

      {error && (

        <div className="m-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>

      )}


      {/* TABLE */}

      {loading ? (

        <div className="p-8 text-center text-sm text-gray-500">
          Loading contacts...
        </div>

      ) : (

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-gray-50">

              <tr>

                <th className="w-12 p-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      allFilteredSelected
                    }
                    onChange={
                      toggleSelectAll
                    }
                  />
                </th>

                <th className="p-3 text-left text-xs text-gray-500">
                  NAME
                </th>

                <th className="p-3 text-left text-xs text-gray-500">
                  EMAIL
                </th>

                <th className="p-3 text-left text-xs text-gray-500">
                  PHONE
                </th>

                <th className="p-3 text-left text-xs text-gray-500">
                  BIRTHDAY
                </th>

                <th className="p-3 text-left text-xs text-gray-500">
                  GROUP
                </th>

              </tr>

            </thead>


            <tbody>

              {filteredContacts.map(
                (contact) => (

                  <tr
                    key={contact.id}
                    className="border-t hover:bg-gray-50"
                  >

                    <td className="p-3">

                      <input
                        type="checkbox"
                        checked={selectedIds.includes(
                          contact.id
                        )}
                        onChange={() =>
                          toggleContact(
                            contact.id
                          )
                        }
                      />

                    </td>


                    <td className="p-3 text-sm font-medium">

                      {contact.first_name}{" "}
                      {contact.last_name}

                    </td>


                    <td className="p-3 text-sm text-gray-500">

                      {contact.email || "-"}

                    </td>


                    <td className="p-3 text-sm text-gray-500">

                      {contact.phone || "-"}

                    </td>


                    <td className="p-3 text-sm text-gray-500">

                      {contact.birthday || "-"}

                    </td>


                    <td className="p-3">

                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-600">

                        {contact.group_name || "No group"}

                      </span>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}


      {/* FOOTER */}

      <div className="flex items-center justify-between border-t p-4">

        <div className="text-sm text-gray-500">

          {selectedIds.length} contact
          {selectedIds.length === 1
            ? ""
            : "s"} selected

        </div>


        <div className="flex gap-3">

          <button
            type="button"
            onClick={onBack}
            className="rounded-md border px-5 py-2 text-sm"
          >
            ← Back
          </button>


          <button
            type="button"
            onClick={handleNext}
            className="rounded-md bg-[var(--primary-color)] px-5 py-2 text-sm text-white"
          >
            Next →
          </button>

        </div>

      </div>

    </div>
  );
}