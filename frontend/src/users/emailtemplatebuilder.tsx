import {
  Image,
  Type,
  PenSquare,
  FileText,
  Upload,
  Plus,
  X,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
  useMemo,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import type { TemplateId } from "../component/email-templates/emailTemplates";

const API_URL = "http://localhost:8000";

type TimeZoneOption = { value: string; label: string };

type IntlWithTimeZoneList = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

const getTimeZoneLabel = (timeZone: string): string => {
  let offset = "GMT +00:00";
  let longName = timeZone === "UTC" ? "Coordinated Universal Time" : timeZone;

  try {
    const offsetPart = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;

    if (offsetPart) {
      offset = offsetPart === "GMT" ? "GMT +00:00" : offsetPart.replace(/^GMT/, "GMT ");
    }

    const namePart = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "long",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;

    if (namePart) longName = namePart;
  } catch {
    // Keep the IANA timezone name as a readable fallback.
  }

  return `(${offset}) ${longName} (${timeZone})`;
};

const getTimeZoneOptions = (): TimeZoneOption[] => {
  const intlWithTimeZoneList = Intl as IntlWithTimeZoneList;
  const browserTimeZones = intlWithTimeZoneList.supportedValuesOf?.("timeZone") ?? [
    "Africa/Johannesburg",
    "Africa/Lagos",
    "Africa/Nairobi",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Australia/Sydney",
    "Europe/London",
    "Pacific/Galapagos",
    "Asia/Yakutsk",
    "Africa/Sao_Tome",
    "Indian/Chagos",
    "America/Cayenne",
    "Europe/Tallinn",
  ];

  return Array.from(new Set(["UTC", "Africa/Johannesburg", ...browserTimeZones]))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: getTimeZoneLabel(value) }));
};

type ElementType =
  | "text"
  | "image"
  | "signature"
  | "header"
  | "footer";

type EditorElement = {
  id: string;
  type: ElementType;
  content?: string;
  imageUrl?: string;
};

type EmailTemplateBuilderProps = {
  templateContent: string;

  templateId: TemplateId;
  initialCompanyName?: string;
  initialSubject?: string;
  initialSendTime?: string;
  initialTimezone?: string;

  onNext: (data: {
    templateId: TemplateId;
    content: string;
    companyName: string;
    subject: string;
    sendTime: string;
    timezone: string;
    signature: string;
    headerImageUrl: string | null;
    footerImageUrl: string | null;
    elements: EditorElement[];
  }) => void;
};

export default function EmailTemplateBuilder({
  templateContent,
  templateId,
  initialCompanyName = "",
  initialSubject = "",
  initialSendTime = "08:00",
  initialTimezone = "Africa/Johannesburg",
  onNext,
}: EmailTemplateBuilderProps) {
  const [content, setContent] = useState(templateContent);

  const [companyName, setCompanyName] = useState(initialCompanyName);

  const [subject, setSubject] = useState(initialSubject);

  const [sendTime, setSendTime] = useState(initialSendTime);

  const [timezone, setTimezone] = useState(initialTimezone);
  const [timezoneDropdownOpen, setTimezoneDropdownOpen] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const timezoneDropdownRef = useRef<HTMLDivElement>(null);
  const timezoneOptions = useMemo(() => getTimeZoneOptions(), []);
  const selectedTimezone =
    timezoneOptions.find((option) => option.value === timezone) ?? {
      value: timezone,
      label: timezone ? getTimeZoneLabel(timezone) : "Select a timezone",
    };
  const filteredTimezones = timezoneOptions.filter((option) =>
    `${option.label} ${option.value}`.toLowerCase().includes(timezoneSearch.toLowerCase().trim()),
  );

  const [elements, setElements] = useState<EditorElement[]>([]);

  const [headerImage, setHeaderImage] =
    useState<string | null>(null);

  const [footerImage, setFooterImage] =
    useState<string | null>(null);

  const [signature, setSignature] = useState("");

  const [activeImageElementId, setActiveImageElementId] =
    useState<string | null>(null);

  const [uploading, setUploading] = useState(false);

  const headerInputRef =
    useRef<HTMLInputElement>(null);

  const footerInputRef =
    useRef<HTMLInputElement>(null);

  const imageInputRef =
    useRef<HTMLInputElement>(null);

  // ============================================================
  // RESET TEMPLATE CONTENT
  // ============================================================

  useEffect(() => {
    setContent(templateContent);
    setCompanyName(initialCompanyName);
    setSubject(initialSubject);
    setSendTime(initialSendTime);
    setTimezone(initialTimezone);
    setElements([]);
    setSignature("");
    setHeaderImage(null);
    setFooterImage(null);
    setActiveImageElementId(null);
  }, [
    templateContent,
    templateId,
    initialCompanyName,
    initialSubject,
    initialSendTime,
    initialTimezone,
  ]);

  useEffect(() => {
    if (!timezoneDropdownOpen) return;

    const handleOutsideClick = (event: globalThis.MouseEvent) => {
      if (
        timezoneDropdownRef.current &&
        !timezoneDropdownRef.current.contains(event.target as Node)
      ) {
        setTimezoneDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTimezoneDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [timezoneDropdownOpen]);

  // ============================================================
  // UPLOAD IMAGE
  // ============================================================

  const uploadImage = async (
    file: File,
  ): Promise<string> => {
    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch(
      `${API_URL}/api/v1/user/email-campaigns/upload-image`,
      {
        method: "POST",
        body: formData,
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.message ||
          "Image upload failed",
      );
    }

    if (!data?.url) {
      throw new Error(
        "Image uploaded but no URL was returned",
      );
    }

    return data.url;
  };

  // ============================================================
  // DRAG START
  // ============================================================

  const handleDragStart = (
    e: DragEvent<HTMLButtonElement>,
    type: ElementType,
  ) => {
    e.dataTransfer.setData(
      "elementType",
      type,
    );

    e.dataTransfer.effectAllowed = "copy";
  };

  // ============================================================
  // DRAG OVER
  // ============================================================

  const handleDragOver = (
    e: DragEvent<HTMLDivElement>,
  ) => {
    e.preventDefault();

    e.dataTransfer.dropEffect = "copy";
  };

  // ============================================================
  // DROP
  // ============================================================

  const handleDrop = (
    e: DragEvent<HTMLDivElement>,
  ) => {
    e.preventDefault();

    const type = e.dataTransfer.getData(
      "elementType",
    ) as ElementType;

    if (!type) {
      return;
    }

    addElement(type);
  };

  // ============================================================
  // ADD ELEMENT
  // ============================================================

  const addElement = (
    type: ElementType,
  ) => {
    const id =
      `${type}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;

    let newElement: EditorElement;

    switch (type) {
      case "text":
        newElement = {
          id,
          type,
          content:
            "Enter your text here...",
        };
        break;

      case "signature":
        newElement = {
          id,
          type,
          content:
            signature ||
            "Your signature",
        };
        break;

      case "image":
        newElement = {
          id,
          type,
        };
        break;

      case "header":
        newElement = {
          id,
          type,
        };
        break;

      case "footer":
        newElement = {
          id,
          type,
        };
        break;

      default:
        return;
    }

    setElements((previous) => [
      ...previous,
      newElement,
    ]);

    if (type === "image") {
      setActiveImageElementId(id);

      window.setTimeout(() => {
        imageInputRef.current?.click();
      }, 0);
    }
  };

  // ============================================================
  // REMOVE ELEMENT
  // ============================================================

  const removeElement = (
    id: string,
  ) => {
    setElements((previous) =>
      previous.filter(
        (element) =>
          element.id !== id,
      ),
    );

    if (
      activeImageElementId === id
    ) {
      setActiveImageElementId(null);
    }
  };

  // ============================================================
  // IMAGE UPLOAD
  // ============================================================

  const handleImageUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    type:
      | "header"
      | "footer"
      | "image",
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      if (
        !file.type.startsWith(
          "image/",
        )
      ) {
        throw new Error(
          "Please select a valid image file",
        );
      }

      setUploading(true);

      const url =
        await uploadImage(file);

      if (type === "header") {
        setHeaderImage(url);
      }

      if (type === "footer") {
        setFooterImage(url);
      }

      if (type === "image") {
        if (
          !activeImageElementId
        ) {
          throw new Error(
            "No image element selected",
          );
        }

        setElements((previous) =>
          previous.map(
            (element) =>
              element.id ===
              activeImageElementId
                ? {
                    ...element,
                    imageUrl: url,
                  }
                : element,
          ),
        );
      }
    } catch (error) {
      console.error(
        "Image upload failed:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Image upload failed",
      );
    } finally {
      setUploading(false);

      e.target.value = "";
    }
  };

  // ============================================================
  // REMOVE HEADER
  // ============================================================

  const removeHeaderImage = (
    e: MouseEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation();

    setHeaderImage(null);

    if (headerInputRef.current) {
      headerInputRef.current.value =
        "";
    }
  };

  // ============================================================
  // REMOVE FOOTER
  // ============================================================

  const removeFooterImage = (
    e: MouseEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation();

    setFooterImage(null);

    if (footerInputRef.current) {
      footerInputRef.current.value =
        "";
    }
  };

  // ============================================================
  // REMOVE BODY IMAGE
  // ============================================================

  const removeElementImage = (
    e: MouseEvent<HTMLButtonElement>,
    elementId: string,
  ) => {
    e.stopPropagation();

    setElements((previous) =>
      previous.map(
        (element) => {
          if (
            element.id !==
            elementId
          ) {
            return element;
          }

          return {
            ...element,
            imageUrl: undefined,
          };
        },
      ),
    );

    setActiveImageElementId(null);
  };

  // ============================================================
  // OPEN BODY IMAGE UPLOAD
  // ============================================================

  const openImageUpload = (
    elementId: string,
  ) => {
    setActiveImageElementId(
      elementId,
    );

    window.setTimeout(() => {
      imageInputRef.current?.click();
    }, 0);
  };

  // ============================================================
  // UPDATE ELEMENT
  // ============================================================

  const updateElementContent = (
    id: string,
    value: string,
  ) => {
    setElements((previous) =>
      previous.map(
        (element) =>
          element.id === id
            ? {
                ...element,
                content: value,
              }
            : element,
      ),
    );
  };

  // ============================================================
  // VARIABLES
  // ============================================================

  const insertVariable = (
    variable: string,
  ) => {
    setContent((previous) =>
      previous.trim()
        ? `${previous} ${variable}`
        : variable,
    );
  };

  // ============================================================
  // BUILD EMAIL HTML
  // ============================================================

  const buildEmailContent =
    () => {
      let html = "";

      if (content.trim()) {
        html += `
          <div>
            ${content.replace(
              /\n/g,
              "<br />",
            )}
          </div>
        `;
      }

      elements.forEach(
        (element) => {
          if (
            element.type ===
            "text"
          ) {
            html += `
              <div style="margin-top:16px;">
                ${
                  element.content?.replace(
                    /\n/g,
                    "<br />",
                  ) || ""
                }
              </div>
            `;
          }

          if (
            element.type ===
              "image" &&
            element.imageUrl
          ) {
            html += `
              <div
                style="
                  margin-top:16px;
                  text-align:center;
                "
              >
                <img
                  src="${element.imageUrl}"
                  alt="Email image"
                  style="
                    max-width:100%;
                    height:auto;
                    display:block;
                    margin:0 auto;
                  "
                />
              </div>
            `;
          }

          if (
            element.type ===
            "signature"
          ) {
            html += `
              <div style="margin-top:20px;">
                ${
                  element.content ||
                  ""
                }
              </div>
            `;
          }
        },
      );

      return html;
    };

  // ============================================================
  // NEXT
  // ============================================================

  const handleNext = () => {
    if (!companyName.trim()) {
      alert(
        "Please enter your company or organization name.",
      );
      return;
    }

    if (!subject.trim()) {
      alert(
        "Please enter an email subject.",
      );
      return;
    }

    if (!sendTime) {
      alert(
        "Please choose a time for the email to be sent.",
      );
      return;
    }

    if (!timezone) {
      alert("Please choose a timezone.");
      return;
    }

    const emailContent =
      buildEmailContent();

    onNext({
      templateId,

      content: emailContent,

      companyName:
        companyName.trim(),

      subject:
        subject.trim(),

      sendTime,

      timezone,

      signature,

      headerImageUrl:
        headerImage || null,

      footerImageUrl:
        footerImage || null,

      elements,
    });
  };

  // ============================================================
  // DRAGGABLE ELEMENT
  // ============================================================

  const DraggableElement = ({
    type,
    icon,
    label,
  }: {
    type: ElementType;
    icon: ReactNode;
    label: string;
  }) => {
    return (
      <button
        type="button"
        draggable
        onDragStart={(e) =>
          handleDragStart(
            e,
            type,
          )
        }
        onClick={() =>
          addElement(type)
        }
        className="flex w-full cursor-grab items-center gap-2 rounded-md border border-gray-200 bg-white p-2 text-sm transition hover:bg-gray-100 active:cursor-grabbing"
      >
        {icon}

        {label}
      </button>
    );
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="mt-6">
      <div className="overflow-hidden rounded-xl border border-gray-300 bg-white">
        <div className="flex">

          {/* SIDEBAR */}

          <aside className="w-[155px] shrink-0 border-r bg-gray-50 p-3">
            <h3 className="mb-4 text-xs font-semibold text-gray-500">
              ELEMENTS
            </h3>

            <div className="space-y-3">
              <DraggableElement
                type="text"
                icon={
                  <Type size={16} />
                }
                label="Text"
              />

              <DraggableElement
                type="image"
                icon={
                  <Image size={16} />
                }
                label="Image"
              />

              <DraggableElement
                type="signature"
                icon={
                  <PenSquare
                    size={16}
                  />
                }
                label="Signature"
              />
            </div>

            <h3 className="mb-4 mt-8 text-xs font-semibold text-gray-500">
              LAYOUT
            </h3>

            <div className="space-y-3">
              <DraggableElement
                type="header"
                icon={
                  <FileText
                    size={16}
                  />
                }
                label="Header"
              />

              <DraggableElement
                type="footer"
                icon={
                  <FileText
                    size={16}
                  />
                }
                label="Footer"
              />
            </div>
          </aside>

          {/* CANVAS */}

          <div
            className="min-h-[500px] flex-1 bg-gray-50 p-4"
            onDrop={handleDrop}
            onDragOver={
              handleDragOver
            }
          >
            {/* HEADER */}

            <div
              onClick={() =>
                headerInputRef.current?.click()
              }
              className="relative flex min-h-[64px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-stone-100 text-sm text-gray-500 hover:bg-stone-200"
            >
              {headerImage ? (
                <>
                  <img
                    src={
                      headerImage
                    }
                    alt="Email header"
                    className="h-full w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={
                      removeHeaderImage
                    }
                    className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-500 shadow-md transition hover:bg-red-50 hover:text-red-500"
                  >
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <Upload
                    size={16}
                    className="mr-2"
                  />

                  Click to upload email
                  header - 600x150px
                </>
              )}
            </div>

            <input
              ref={headerInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) =>
                handleImageUpload(
                  e,
                  "header",
                )
              }
            />

            {/* EMAIL BODY */}

            <div className="mt-4 rounded-lg border bg-white p-4">
              {/* VARIABLES */}

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    insertVariable(
                      "{FirstName}",
                    )
                  }
                  className="rounded bg-gray-100 px-3 py-1 text-xs hover:bg-gray-200"
                >
                  + {"{FirstName}"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    insertVariable(
                      "{LastName}",
                    )
                  }
                  className="rounded bg-gray-100 px-3 py-1 text-xs hover:bg-gray-200"
                >
                  + {"{LastName}"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    insertVariable(
                      "{Company}",
                    )
                  }
                  className="rounded bg-gray-100 px-3 py-1 text-xs hover:bg-gray-200"
                >
                  + {"{Company}"}
                </button>
              </div>

              {/* TEMPLATE CONTENT */}

              <textarea
                value={content}
                onChange={(e) =>
                  setContent(
                    e.target.value,
                  )
                }
                rows={4}
                className="w-full resize-none rounded-md border border-gray-200 p-3 text-sm leading-7 outline-none focus:border-orange-400"
                placeholder="Write your email content here..."
              />

              {/* DROPPED ELEMENTS */}

              {elements.length >
                0 && (
                <div className="mt-4 space-y-3">
                  {elements.map(
                    (element) => (
                      <div
                        key={
                          element.id
                        }
                        className="group relative rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            removeElement(
                              element.id,
                            )
                          }
                          className="absolute right-2 top-2 z-10 hidden rounded-full bg-white p-1 text-gray-400 shadow-sm group-hover:block hover:text-red-500"
                        >
                          <X
                            size={14}
                          />
                        </button>

                        {element.type ===
                          "text" && (
                          <textarea
                            className="w-full resize-none rounded border bg-white p-2 text-sm outline-none"
                            rows={3}
                            value={
                              element.content ??
                              ""
                            }
                            onChange={(
                              e,
                            ) =>
                              updateElementContent(
                                element.id,
                                e.target
                                  .value,
                              )
                            }
                          />
                        )}

                        {element.type ===
                          "image" && (
                          <div
                            onClick={() =>
                              openImageUpload(
                                element.id,
                              )
                            }
                            className="relative flex min-h-[100px] cursor-pointer items-center justify-center rounded border bg-white"
                          >
                            {element.imageUrl ? (
                              <>
                                <img
                                  src={
                                    element.imageUrl
                                  }
                                  alt="Email content"
                                  className="max-h-[250px] max-w-full object-contain"
                                />

                                <button
                                  type="button"
                                  onClick={(
                                    e,
                                  ) =>
                                    removeElementImage(
                                      e,
                                      element.id,
                                    )
                                  }
                                  className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-500 shadow-md hover:bg-red-50 hover:text-red-500"
                                >
                                  <X
                                    size={
                                      15
                                    }
                                  />
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center text-sm text-gray-400">
                                <Upload
                                  size={
                                    16
                                  }
                                  className="mr-2"
                                />

                                Click to upload
                                image
                              </div>
                            )}
                          </div>
                        )}

                        {element.type ===
                          "signature" && (
                          <input
                            type="text"
                            value={
                              element.content ??
                              ""
                            }
                            onChange={(
                              e,
                            ) =>
                              updateElementContent(
                                element.id,
                                e.target
                                  .value,
                              )
                            }
                            placeholder="Enter signature"
                            className="w-full rounded border bg-white p-2 text-sm outline-none focus:border-orange-400"
                          />
                        )}

                        {element.type ===
                          "header" && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <FileText
                              size={16}
                            />

                            Header element
                            added
                          </div>
                        )}

                        {element.type ===
                          "footer" && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <FileText
                              size={16}
                            />

                            Footer element
                            added
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}

              {/* DROP AREA */}

              <div
                onDrop={handleDrop}
                onDragOver={
                  handleDragOver
                }
                className="mt-4 flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-orange-400 hover:bg-orange-50"
              >
                <Plus
                  size={20}
                  className="mr-2"
                />

                Drag an element here
              </div>
            </div>

            {/* FOOTER */}

            <div
              onClick={() =>
                footerInputRef.current?.click()
              }
              className="relative mt-4 flex min-h-[64px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-stone-100 py-4 text-center text-sm text-gray-500 hover:bg-stone-200"
            >
              {footerImage ? (
                <>
                  <img
                    src={
                      footerImage
                    }
                    alt="Email footer"
                    className="max-h-[80px] w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={
                      removeFooterImage
                    }
                    className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-500 shadow-md hover:bg-red-50 hover:text-red-500"
                  >
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  © 2026 Your Company
                  &nbsp;&nbsp;
                  Unsubscribe
                  &nbsp;&nbsp;
                  View in browser
                </>
              )}
            </div>

            <input
              ref={footerInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) =>
                handleImageUpload(
                  e,
                  "footer",
                )
              }
            />
          </div>
        </div>
      </div>

      {/* ====================================================== */}
      {/* CAMPAIGN DETAILS */}
      {/* ====================================================== */}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-gray-800">
            Campaign Details
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Enter the information that will be used for this birthday email campaign.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* COMPANY */}

          <div>
            <label
              htmlFor="companyName"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Company or Organization name
            </label>

            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) =>
                setCompanyName(
                  e.target.value,
                )
              }
              placeholder="Enter company or organization name"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />

          </div>

          {/* SUBJECT */}

          <div>
            <label
              htmlFor="emailSubject"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Email Subject
            </label>

            <input
              id="emailSubject"
              type="text"
              value={subject}
              onChange={(e) =>
                setSubject(
                  e.target.value,
                )
              }
              placeholder="Enter email subject"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />

          </div>

          {/* SEND TIME */}

          <div>
            <label
              htmlFor="sendTime"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Choose the time you want this email to be sent
            </label>

            <input
              id="sendTime"
              type="time"
              value={sendTime}
              onChange={(e) =>
                setSendTime(
                  e.target.value,
                )
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />

          </div>
        </div>


        <div className="mt-5">
          <label
            htmlFor="timezone"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Choose your preferred timezone to send this message
          </label>

          <div className="relative" ref={timezoneDropdownRef}>
            <button
              id="timezone"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={timezoneDropdownOpen}
              onClick={() => {
                setTimezoneDropdownOpen((open) => !open);
                setTimezoneSearch("");
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-md border bg-white px-4 py-3 text-left text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                timezoneDropdownOpen ? "border-blue-500" : "border-gray-300"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">
                {selectedTimezone.label}
              </span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-gray-700 transition-transform ${
                  timezoneDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {timezoneDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 p-3">
                  <div className="relative">
                    <Search
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      autoFocus
                      value={timezoneSearch}
                      onChange={(event) => setTimezoneSearch(event.target.value)}
                      placeholder="Search"
                      aria-label="Search timezones"
                      className="w-full rounded-md border border-gray-300 bg-white py-2.5 pl-3 pr-10 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div
                  role="listbox"
                  aria-label="Timezones"
                  className="max-h-64 overflow-y-auto p-1.5"
                >
                  {filteredTimezones.length > 0 ? (
                    filteredTimezones.map((option) => {
                      const isSelected = option.value === timezone;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setTimezone(option.value);
                            setTimezoneDropdownOpen(false);
                            setTimezoneSearch("");
                          }}
                          className={`flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left text-sm transition ${
                            isSelected
                              ? "bg-blue-50 text-blue-600"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <span className="min-w-0 flex-1">{option.label}</span>
                          {isSelected && <Check size={16} className="shrink-0" />}
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-3 py-4 text-sm text-gray-500">
                      No timezones found.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* ====================================================== */}
      {/* SIGNATURE */}
      {/* ====================================================== */}

      <div className="mt-6">
        <label className="mb-2 block text-sm font-medium">
          Sender signature
        </label>

        <input
          type="text"
          value={signature}
          onChange={(e) =>
            setSignature(
              e.target.value,
            )
          }
          placeholder="e.g. The {Company} Team - you@yourcompany.com"
          className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
        />

        <button
          type="button"
          disabled={uploading}
          onClick={handleNext}
          className="mt-5 rounded-md bg-[var(--primary-color)] px-5 py-2 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading
            ? "Uploading..."
            : "Next →"}
        </button>
      </div>

      {/* BODY IMAGE INPUT */}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={(e) =>
          handleImageUpload(
            e,
            "image",
          )
        }
      />
    </div>
  );
}