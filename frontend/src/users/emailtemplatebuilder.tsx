import {
  Image,
  Type,
  PenSquare,
  FileText,
  Upload,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import type { TemplateId } from "../component/email-templates/emailTemplates";

type EmailTemplateBuilderProps = {
  templateContent: string;
  templateId: TemplateId;

  onNext: (data: {
    templateId: TemplateId;
    content: string;
    signature: string;
    headerImageUrl: string | null;
    footerImageUrl: string | null;
    elements: EditorElement[];
  }) => void;
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

export default function EmailTemplateBuilder({
  templateContent,
  templateId,
  onNext,
}: EmailTemplateBuilderProps) {
  const [content, setContent] =
    useState(templateContent);

  const [elements, setElements] =
    useState<EditorElement[]>([]);

  const [headerImage, setHeaderImage] =
    useState<string | null>(null);

  const [footerImage, setFooterImage] =
    useState<string | null>(null);

  const [signature, setSignature] =
    useState("");

  const headerInputRef =
    useRef<HTMLInputElement>(null);

  const footerInputRef =
    useRef<HTMLInputElement>(null);

  const imageInputRef =
    useRef<HTMLInputElement>(null);

  /*
   * When user clicks "Use this template",
   * replace editor content.
   */
  useEffect(() => {
    setContent(templateContent);

    // Reset custom elements when a new template is selected
    setElements([]);
  }, [templateContent, templateId]);

  /*
   * -------------------------
   * DRAG FROM SIDEBAR
   * -------------------------
   */
  const handleDragStart = (
    e: React.DragEvent,
    type: ElementType
  ) => {
    e.dataTransfer.setData(
      "elementType",
      type
    );

    e.dataTransfer.effectAllowed = "copy";
  };

  /*
   * -------------------------
   * DROP INTO EDITOR
   * -------------------------
   */
  const handleDrop = (
    e: React.DragEvent
  ) => {
    e.preventDefault();

    const type = e.dataTransfer.getData(
      "elementType"
    ) as ElementType;

    if (!type) return;

    addElement(type);
  };

  const handleDragOver = (
    e: React.DragEvent
  ) => {
    e.preventDefault();

    e.dataTransfer.dropEffect = "copy";
  };

  /*
   * -------------------------
   * ADD ELEMENT
   * -------------------------
   */
  const addElement = (
    type: ElementType
  ) => {
    const id =
      `${type}-${Date.now()}-${Math.random()}`;

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
    }

    setElements((previous) => [
      ...previous,
      newElement,
    ]);
  };

  /*
   * -------------------------
   * DELETE ELEMENT
   * -------------------------
   */
  const removeElement = (
    id: string
  ) => {
    setElements((previous) =>
      previous.filter(
        (element) =>
          element.id !== id
      )
    );
  };

  /*
   * -------------------------
   * UPLOAD IMAGE
   * -------------------------
   */
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "header" | "footer" | "image"
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    const url =
      URL.createObjectURL(file);

    if (type === "header") {
      setHeaderImage(url);
    }

    if (type === "footer") {
      setFooterImage(url);
    }

    if (type === "image") {
      setElements((previous) =>
        previous.map((element) => {
          if (
            element.type === "image" &&
            !element.imageUrl
          ) {
            return {
              ...element,
              imageUrl: url,
            };
          }

          return element;
        })
      );
    }

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  /*
   * -------------------------
   * VARIABLE INSERT
   * -------------------------
   */
  const insertVariable = (
    variable: string
  ) => {
    setContent(
      (previous) =>
        `${previous} ${variable}`
    );
  };

  /*
   * -------------------------
   * SIDEBAR ELEMENT
   * -------------------------
   */
  const DraggableElement = ({
    type,
    icon,
    label,
  }: {
    type: ElementType;
    icon: React.ReactNode;
    label: string;
  }) => {
    return (
      <button
        type="button"
        draggable
        onDragStart={(e) =>
          handleDragStart(e, type)
        }
        onClick={() =>
          addElement(type)
        }
        className="flex w-full cursor-grab items-center gap-2 rounded-md border p-2 text-sm transition hover:bg-gray-100 active:cursor-grabbing"
      >
        {icon}

        {label}
      </button>
    );
  };

  return (
    <div className="mt-6">

      {/* ========================= */}
      {/* EDITOR */}
      {/* ========================= */}

      <div className="overflow-hidden rounded-xl border border-gray-300">

        <div className="flex">

          {/* ========================= */}
          {/* SIDEBAR */}
          {/* ========================= */}

          <div className="w-[155px] shrink-0 border-r bg-gray-50 p-3">

            <h3 className="mb-4 text-xs font-semibold text-gray-500">
              ELEMENTS
            </h3>

            <div className="space-y-3">

              <DraggableElement
                type="text"
                icon={<Type size={16} />}
                label="Text"
              />

              <DraggableElement
                type="image"
                icon={<Image size={16} />}
                label="Image"
              />

              <DraggableElement
                type="signature"
                icon={<PenSquare size={16} />}
                label="Signature"
              />

            </div>

            <h3 className="mb-4 mt-8 text-xs font-semibold text-gray-500">
              LAYOUT
            </h3>

            <div className="space-y-3">

              <DraggableElement
                type="header"
                icon={<FileText size={16} />}
                label="Header"
              />

              <DraggableElement
                type="footer"
                icon={<FileText size={16} />}
                label="Footer"
              />

            </div>
          </div>

          {/* ========================= */}
          {/* CANVAS */}
          {/* ========================= */}

          <div
            className="min-h-[500px] flex-1 bg-gray-50 p-4"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >

            {/* ========================= */}
            {/* HEADER */}
            {/* ========================= */}

            <div
              onClick={() =>
                headerInputRef.current?.click()
              }
              className="relative flex min-h-[64px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-stone-100 text-sm text-gray-500 hover:bg-stone-200"
            >

              {headerImage ? (
                <img
                  src={headerImage}
                  alt="Email header"
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <Upload
                    size={16}
                    className="mr-2"
                  />

                  Click to upload email header -
                  600x150px
                </>
              )}
            </div>

            <input
              ref={headerInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(e) =>
                handleImageUpload(
                  e,
                  "header"
                )
              }
            />

            {/* ========================= */}
            {/* EMAIL BODY */}
            {/* ========================= */}

            <div className="mt-4 rounded-lg border bg-white p-4">

              {/* Variables */}

              <div className="mb-4 flex flex-wrap gap-2">

                <button
                  type="button"
                  onClick={() =>
                    insertVariable(
                      "{FirstName}"
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
                      "{LastName}"
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
                      "{Company}"
                    )
                  }
                  className="rounded bg-gray-100 px-3 py-1 text-xs hover:bg-gray-200"
                >
                  + {"{Company}"}
                </button>

              </div>

              {/* Template content */}

              <textarea
                value={content}
                onChange={(e) =>
                  setContent(
                    e.target.value
                  )
                }
                rows={12}
                className="w-full resize-none rounded-md border border-gray-200 p-3 text-sm leading-7 outline-none focus:border-orange-400"
              />

              {/* ========================= */}
              {/* DROPPED ELEMENTS */}
              {/* ========================= */}

              {elements.length > 0 && (
                <div className="mt-4 space-y-3">

                  {elements.map(
                    (element) => (
                      <div
                        key={element.id}
                        className="group relative rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4"
                      >

                        {/* Remove */}

                        <button
                          type="button"
                          onClick={() =>
                            removeElement(
                              element.id
                            )
                          }
                          className="absolute right-2 top-2 hidden rounded-full bg-white p-1 text-gray-400 shadow-sm group-hover:block hover:text-red-500"
                        >
                          <X size={14} />
                        </button>

                        {/* TEXT */}

                        {element.type ===
                          "text" && (
                          <textarea
                            className="w-full resize-none rounded border bg-white p-2 text-sm outline-none"
                            rows={3}
                            value={
                              element.content
                            }
                            onChange={(e) => {
                              setElements(
                                (previous) =>
                                  previous.map(
                                    (
                                      item
                                    ) =>
                                      item.id ===
                                      element.id
                                        ? {
                                            ...item,
                                            content:
                                              e.target
                                                .value,
                                          }
                                        : item
                                  )
                              );
                            }}
                          />
                        )}

                        {/* IMAGE */}

                        {element.type ===
                          "image" && (
                          <div
                            onClick={() =>
                              imageInputRef.current?.click()
                            }
                            className="flex min-h-[100px] cursor-pointer items-center justify-center rounded border bg-white"
                          >
                            {element.imageUrl ? (
                              <img
                                src={
                                  element.imageUrl
                                }
                                alt="Email content"
                                className="max-h-[250px] max-w-full object-contain"
                              />
                            ) : (
                              <div className="flex items-center text-sm text-gray-400">
                                <Upload
                                  size={16}
                                  className="mr-2"
                                />
                                Click to upload image
                              </div>
                            )}
                          </div>
                        )}

                        {/* SIGNATURE */}

                        {element.type ===
                          "signature" && (
                          <input
                            type="text"
                            value={
                              element.content
                            }
                            onChange={(e) => {
                              setElements(
                                (previous) =>
                                  previous.map(
                                    (
                                      item
                                    ) =>
                                      item.id ===
                                      element.id
                                        ? {
                                            ...item,
                                            content:
                                              e.target
                                                .value,
                                          }
                                        : item
                                  )
                              );
                            }}
                            placeholder="Enter signature"
                            className="w-full rounded border bg-white p-2 text-sm outline-none focus:border-orange-400"
                          />
                        )}

                        {/* HEADER */}

                        {element.type ===
                          "header" && (
                          <div className="text-center text-sm text-gray-500">
                            Header element added
                          </div>
                        )}

                        {/* FOOTER */}

                        {element.type ===
                          "footer" && (
                          <div className="text-center text-sm text-gray-500">
                            Footer element added
                          </div>
                        )}
                      </div>
                    )
                  )}

                </div>
              )}

              {/* ========================= */}
              {/* DROP AREA */}
              {/* ========================= */}

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="mt-4 flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-orange-400 hover:bg-orange-50"
              >
                <Plus
                  size={20}
                  className="mr-2"
                />

                Drag an element here
              </div>

            </div>

            {/* ========================= */}
            {/* FOOTER */}
            {/* ========================= */}

            <div
              onClick={() =>
                footerInputRef.current?.click()
              }
              className="relative mt-4 flex min-h-[64px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-stone-100 py-4 text-center text-sm text-gray-500 hover:bg-stone-200"
            >

              {footerImage ? (
                <img
                  src={footerImage}
                  alt="Email footer"
                  className="max-h-[80px] w-full object-cover"
                />
              ) : (
                <>
                  © 2025 Your Company
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
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(e) =>
                handleImageUpload(
                  e,
                  "footer"
                )
              }
            />

          </div>
        </div>
      </div>

      {/* Hidden image input */}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
        onChange={(e) =>
          handleImageUpload(
            e,
            "image"
          )
        }
      />

      {/* ========================= */}
      {/* UPLOAD SECTION */}
      {/* ========================= */}

      <div className="mt-6 grid gap-4 md:grid-cols-2">

        <div
          onClick={() =>
            headerInputRef.current?.click()
          }
          className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-400 transition hover:border-orange-400 hover:bg-orange-50"
        >
          <Upload size={24} />

          <p className="mt-2 font-medium">
            Upload header banner
          </p>

          <p className="text-xs text-gray-500">
            600 x 150px PNG, JPG
          </p>
        </div>

        <div
          onClick={() =>
            footerInputRef.current?.click()
          }
          className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-400 transition hover:border-orange-400 hover:bg-orange-50"
        >
          <Upload size={24} />

          <p className="mt-2 font-medium">
            Upload footer banner
          </p>

          <p className="text-xs text-gray-500">
            600 x 80px PNG, JPG
          </p>
        </div>

      </div>

      {/* ========================= */}
      {/* SIGNATURE */}
      {/* ========================= */}

      <div className="mt-6">

        <label className="mb-2 block text-sm font-medium">
          Sender signature
        </label>

        <input
          type="text"
          value={signature}
          onChange={(e) =>
            setSignature(
              e.target.value
            )
          }
          placeholder="e.g. The {Company} Team - you@yourcompany.com"
          className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
        />

        <button
  type="button"
  onClick={() => {

    onNext({
      templateId,

      content,

      signature,

      headerImageUrl: headerImage,

      footerImageUrl: footerImage,

      elements,
    });

  }}
  className="mt-5 rounded-md bg-[var(--primary-color)] px-5 py-2 text-white"
>
  Next →
</button>

      </div>
    </div>
  );
}