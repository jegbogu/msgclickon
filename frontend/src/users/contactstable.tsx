import { useAuth } from "../AuthContext";
import { useEffect, useState } from "react";

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birthday: string;
  group_name: string;
};

export default function Contactstable() {
  const { user, refreshUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);

  // pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!user?.id) return;

    const fetchDashboard = async () => {
      try {
        const res = await fetch(
          "http://localhost:8000/api/v1/user/contacts",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: user.id,
            }),
          }
        );

        const data = await res.json();

        setContacts(data?.data?.contacts || []);

        if (!res.ok) {
          console.error(data);
          return;
        }

        await refreshUser();
      } catch (err) {
        console.error("err", err);
      }
    };

    fetchDashboard();
  }, [user?.id]);

  const getInitials = (first: string, last: string) =>
    `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();

  const getGroupColor = (group: string) => {
    switch (group?.toLowerCase()) {
      case "vip":
        return "bg-orange-100 text-orange-600";
      case "group a":
        return "bg-blue-100 text-blue-600";
      case "group b":
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // pagination logic
  const totalPages = Math.ceil(contacts.length / pageSize);

  const paginatedContacts = contacts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const changePage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div>
      {/* HEADER */}
      <div className="flex item-center p-5 justify-between">
        <div className="flex gap-5">
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            className="bg-white py-2 pr-[50px] pl-2 w-[350px] rounded-md text-sm border-gray-300 border"
          />

          <select className="bg-white p-2 rounded-md text-sm border-gray-300 border">
            <option value="">All group</option>
            <option value="Family">Family</option>
            <option value="Friends">Friends</option>
          </select>

          {/* PAGE SIZE */}
          <select
            className="bg-white p-2 rounded-md text-sm border-gray-300 border"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>

        <div className="flex gap-5">
          <button className="bg-white p-2 rounded-md text-sm border-gray-300 border">
            Export CSV
          </button>
          <button className="px-5 py-1 bg-[var(--primary-color)] text-white text-sm rounded-md">
            + Add contact
          </button>
        </div>
      </div>

      {/* TABLE WRAPPER (ONLY THIS SCROLLS) */}
      <div className="w-full bg-white rounded-xl shadow-sm">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs sticky top-0">
              <tr>
                <th className="p-4 text-left">
                  <input type="checkbox" />
                </th>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Phone</th>
                <th className="p-4 text-left">Birthday</th>
                <th className="p-4 text-left">Group</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedContacts.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
                    <input type="checkbox" />
                  </td>

                  <td className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-semibold">
                      {getInitials(c.first_name, c.last_name)}
                    </div>
                    <span className="font-medium text-gray-800">
                      {c.first_name} {c.last_name}
                    </span>
                  </td>

                  <td className="p-4 text-gray-600">{c.email}</td>
                  <td className="p-4 text-gray-600">{c.phone}</td>
                  <td className="p-4 text-gray-600">{c.birthday}</td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getGroupColor(
                        c.group_name
                      )}`}
                    >
                      {c.group_name}
                    </span>
                  </td>

                  <td className="p-4">
                    <button className="px-3 py-1 text-xs rounded-md border hover:bg-gray-100">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div className="flex items-center justify-between p-4 border-t">
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages || 1}
          </span>

          <div className="flex gap-2 items-center">
            <button
              onClick={() => changePage(currentPage - 1)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              Prev
            </button>

            {/* Page numbers (max 10 shown) */}
            {Array.from(
              { length: Math.min(10, totalPages) },
              (_, i) => i + 1
            ).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 border rounded-md text-sm ${
                  currentPage === page
                    ? "bg-[var(--primary-color)] text-white"
                    : ""
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => changePage(currentPage + 1)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}