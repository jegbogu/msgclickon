import { useState, type FormEvent, type ChangeEvent } from "react";
import { useAuth } from "../AuthContext";

type AddContactModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AddContactModal({
  isOpen,
  onClose,
}: AddContactModalProps) {
  if (!isOpen) return null;

  const [firstname, setFirstname] = useState<string>("");
  const [lastname, setLastname] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [birthday, setBirthday] = useState<string>("");
  const [group, setGroup] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [userMsg, setUserMsg] = useState<string>("");
  const [msgType, setMsgType] = useState<"success" | "error" | "">("");

  const { user, refreshUser } = useAuth();

  async function submitHandler(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);

    const payload = {
      user_id: user?.id,
      first_name: firstname.trim().toLowerCase(),
      last_name: lastname.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      phone: phone,
      birthday: birthday,
      group_name: group,
    };

    console.log(payload);

    try {
      const res = await fetch(
        "http://localhost:8000/api/v1/user/addcontact",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        setMsgType("error");
        return setUserMsg(data.detail || "Something went wrong");
      }

      await refreshUser();

      setFirstname("");
      setLastname("");
      setBirthday("");
      setGroup("");
      setEmail("");
      setPhone("");

      setMsgType("success");
      setUserMsg("User Successfully saved");

      setLoading(false);
    } catch (err) {
      console.error("err", err);

      setMsgType("error");
      setUserMsg("Something went wrong");

      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      
      {userMsg && (
        <div
          className={`flex justify-between gap-1 fixed top-5 right-3 z-50 max-w-[350px] 
          text-sm px-4 py-2 rounded-lg shadow-lg transform translate-x-0
          ${
            msgType === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          <p>{userMsg}</p>

          <p
            className="cursor-pointer"
            onClick={() => {
              setUserMsg("");
              setMsgType("");
            }}
          >
            ⓧ
          </p>
        </div>
      )}

      {/* Modal */}
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            + Add new contact
          </h2>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="max-h-[85vh] overflow-y-auto px-5 py-4">
          <form className="space-y-4" onSubmit={submitHandler}>
            
            {/* First + Last Name */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  First name
                </label>

                <input
                  type="text"
                  placeholder="James"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500"
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFirstname(e.target.value)
                  }
                  value={firstname}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Last name
                </label>

                <input
                  type="text"
                  placeholder="Okafor"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500"
                  value={lastname}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setLastname(e.target.value)
                  }
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Email address
              </label>

              <input
                type="email"
                placeholder="james@gmail.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Phone number
              </label>

              <input
                type="tel"
                placeholder="+234 801 234 5678"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500"
                onChange={(e) => setPhone(e.target.value)}
                value={phone}
              />
            </div>

            {/* Birthday */}
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Birthday (optional)
              </label>

              <input
                type="date"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500"
                value={birthday}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setBirthday(e.target.value)
                }
              />
            </div>

            {/* Group */}
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Group (optional)
              </label>

              <select
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500"
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setGroup(e.target.value)
                }
                value={group}
              >
                <option>No group</option>
                <option>Family</option>
                <option>Friends</option>
                <option>Work</option>
              </select>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>

              {loading ? (
                <div className="flex justify-center items-center">
                  <img
                    src="/svg-spinners--pulse-multiple.svg"
                    alt="spinner"
                    className="cursor-not-allowed"
                    width={70}
                  />
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-[var(--primary-color)] mt-[-5px] text-white py-2 rounded-md mt-4 cursor-pointer hover:bg-orange-700 transition font-medium"
                >
                  Save Contact
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}