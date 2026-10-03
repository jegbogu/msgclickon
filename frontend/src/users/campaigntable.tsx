import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  Trash2,
  Pencil,
  Plus,
} from "lucide-react";

export type CampaignStatus =
  | "active"
  | "paused"
  | "draft"
  | "scheduled";

export type CampaignType =
  | "birthday"
  | "personal"
  | "inspiration"
  | "event";

export type CampaignChannel =
  | "Email"
  | "SMS"
  | "WhatsApp"
  | "Slack"
  | "Socials";

export type Campaign = {
  id: string;

  name: string;

  type: CampaignType;

  channel: CampaignChannel;

  contacts: number;

  sent: number;

  status: CampaignStatus;

  nextRun: string | null;
};


type Props = {
  campaigns: Campaign[];

  onNewCampaign?: () => void;

  onEdit?: (campaign: Campaign) => void;

  onDelete?: (campaign: Campaign) => void;

  onPause?: (campaign: Campaign) => void;

  onResume?: (campaign: Campaign) => void;

  pageSize?: number;
};


export default function CampaignTable({
  campaigns,

  onNewCampaign,

  onEdit,

  onDelete,

  onPause,

  onResume,

  pageSize = 11,
}: Props) {

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [typeFilter, setTypeFilter] =
    useState("all");

  const [channelFilter, setChannelFilter] =
    useState("all");

  const [currentPage, setCurrentPage] =
    useState(1);


  /*
   * FILTER CAMPAIGNS
   */

  const filteredCampaigns = useMemo(() => {

    const query =
      search.trim().toLowerCase();

    return campaigns.filter((campaign) => {

      /*
       * Search
       */

      const matchesSearch =
        !query ||
        campaign.name
          .toLowerCase()
          .includes(query) ||
        campaign.type
          .toLowerCase()
          .includes(query) ||
        campaign.channel
          .toLowerCase()
          .includes(query);


      /*
       * Status
       */

      const matchesStatus =
        statusFilter === "all" ||
        campaign.status === statusFilter;


      /*
       * Type
       */

      const matchesType =
        typeFilter === "all" ||
        campaign.type === typeFilter;


      /*
       * Channel
       */

      const matchesChannel =
        channelFilter === "all" ||
        campaign.channel === channelFilter;


      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesChannel
      );

    });

  }, [
    campaigns,
    search,
    statusFilter,
    typeFilter,
    channelFilter,
  ]);


  /*
   * PAGINATION
   */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredCampaigns.length /
          pageSize
      )
    );


  /*
   * Keep page valid when filtering
   */

  const safePage =
    Math.min(
      currentPage,
      totalPages
    );


  const startIndex =
    (safePage - 1) * pageSize;


  const endIndex =
    Math.min(
      startIndex + pageSize,
      filteredCampaigns.length
    );


  const visibleCampaigns =
    filteredCampaigns.slice(
      startIndex,
      endIndex
    );


  /*
   * RESET PAGE WHEN FILTER CHANGES
   */

  const handleSearch = (
    value: string
  ) => {

    setSearch(value);

    setCurrentPage(1);
  };


  const handleStatusFilter = (
    value: string
  ) => {

    setStatusFilter(value);

    setCurrentPage(1);
  };


  const handleTypeFilter = (
    value: string
  ) => {

    setTypeFilter(value);

    setCurrentPage(1);
  };


  const handleChannelFilter = (
    value: string
  ) => {

    setChannelFilter(value);

    setCurrentPage(1);
  };


  /*
   * STATUS BADGE
   */

  const renderStatus = (
    status: CampaignStatus
  ) => {

    if (status === "active") {

      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-600">
          <Play
            size={10}
            fill="currentColor"
          />
          Active
        </span>
      );

    }


    if (status === "paused") {

      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-medium text-orange-600">
          <Pause
            size={10}
            fill="currentColor"
          />
          Paused
        </span>
      );

    }


    if (status === "draft") {

      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-500">
          <span className="text-[10px]">
            ✎
          </span>
          Drafts
        </span>
      );

    }


    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
        <span className="text-[10px]">
          ◉
        </span>
        Scheduled
      </span>
    );
  };


  /*
   * FORMAT TYPE
   */

  const formatType = (
    type: CampaignType
  ) => {

    return (
      type.charAt(0).toUpperCase() +
      type.slice(1)
    );
  };


  return (

    <div className="w-full">

      {/* ================================= */}
      {/* FILTER BAR */}
      {/* ================================= */}

      <div className="mb-6 flex flex-wrap items-center gap-3">

        {/* SEARCH */}

        <div className="min-w-[250px] flex-1">

          <input
            type="text"
            value={search}
            onChange={(e) =>
              handleSearch(
                e.target.value
              )
            }
            placeholder="Search by name, email or phone..."
            className="h-10 w-full rounded-md border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-orange-400"
          />

        </div>


        {/* STATUS */}

        <div className="relative">

          <select
            value={statusFilter}
            onChange={(e) =>
              handleStatusFilter(
                e.target.value
              )
            }
            className="h-10 appearance-none rounded-md border border-gray-200 bg-white py-2 pl-4 pr-9 text-sm text-gray-600 outline-none focus:border-orange-400"
          >

            <option value="all">
              All status
            </option>

            <option value="active">
              Active
            </option>

            <option value="paused">
              Paused
            </option>

            <option value="draft">
              Drafts
            </option>

            <option value="scheduled">
              Scheduled
            </option>

          </select>

          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-3 text-gray-500"
          />

        </div>


        {/* TYPE */}

        <div className="relative">

          <select
            value={typeFilter}
            onChange={(e) =>
              handleTypeFilter(
                e.target.value
              )
            }
            className="h-10 appearance-none rounded-md border border-gray-200 bg-white py-2 pl-4 pr-9 text-sm text-gray-600 outline-none focus:border-orange-400"
          >

            <option value="all">
              All types
            </option>

            <option value="birthday">
              Birthday
            </option>

            <option value="personal">
              Personal
            </option>

            <option value="inspiration">
              Inspiration
            </option>

            <option value="event">
              Event
            </option>

          </select>

          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-3 text-gray-500"
          />

        </div>


        {/* CHANNEL */}

        <div className="relative">

          <select
            value={channelFilter}
            onChange={(e) =>
              handleChannelFilter(
                e.target.value
              )
            }
            className="h-10 appearance-none rounded-md border border-gray-200 bg-white py-2 pl-4 pr-9 text-sm text-gray-600 outline-none focus:border-orange-400"
          >

            <option value="all">
              All channels
            </option>

            <option value="Email">
              Email
            </option>

            <option value="SMS">
              SMS
            </option>

            <option value="WhatsApp">
              WhatsApp
            </option>

            <option value="Slack">
              Slack
            </option>

            <option value="Socials">
              Socials
            </option>

          </select>

          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-3 text-gray-500"
          />

        </div>


        {/* NEW CAMPAIGN */}

        <button
          type="button"
          onClick={onNewCampaign}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-md bg-[var(--primary-color)] px-4 text-sm font-medium text-white transition hover:opacity-90"
        >

          <Plus size={15} />

          New campaign

        </button>

      </div>


      {/* ================================= */}
      {/* TABLE */}
      {/* ================================= */}

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[900px]">

            {/* HEADER */}

            <thead>

              <tr className="border-b border-gray-200">

                <th className="px-5 py-4 text-left text-[11px] font-medium text-gray-500">
                  CAMPAIGN
                </th>

                <th className="px-5 py-4 text-left text-[11px] font-medium text-gray-500">
                  TYPE
                </th>

                <th className="px-5 py-4 text-left text-[11px] font-medium text-gray-500">
                  CHANNEL
                </th>

                <th className="px-5 py-4 text-center text-[11px] font-medium text-gray-500">
                  CONTACTS
                </th>

                <th className="px-5 py-4 text-center text-[11px] font-medium text-gray-500">
                  SENT
                </th>

                <th className="px-5 py-4 text-left text-[11px] font-medium text-gray-500">
                  STATUS
                </th>

                <th className="px-5 py-4 text-left text-[11px] font-medium text-gray-500">
                  NEXT RUN
                </th>

                <th className="px-5 py-4 text-right text-[11px] font-medium text-gray-500">
                  ACTIONS
                </th>

              </tr>

            </thead>


            {/* BODY */}

            <tbody>

              {visibleCampaigns.length === 0 ? (

                <tr>

                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >

                    No campaigns found.

                  </td>

                </tr>

              ) : (

                visibleCampaigns.map(
                  (campaign) => (

                    <tr
                      key={campaign.id}
                      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                    >

                      {/* CAMPAIGN */}

                      <td className="px-5 py-3.5">

                        <span className="text-sm font-medium text-gray-800">
                          {campaign.name}
                        </span>

                      </td>


                      {/* TYPE */}

                      <td className="px-5 py-3.5">

                        <span className="text-xs text-gray-400">
                          {formatType(
                            campaign.type
                          )}
                        </span>

                      </td>


                      {/* CHANNEL */}

                      <td className="px-5 py-3.5">

                        <span className="text-sm text-gray-700">
                          {campaign.channel}
                        </span>

                      </td>


                      {/* CONTACTS */}

                      <td className="px-5 py-3.5 text-center">

                        <span className="text-sm text-gray-700">
                          {campaign.contacts.toLocaleString()}
                        </span>

                      </td>


                      {/* SENT */}

                      <td className="px-5 py-3.5 text-center">

                        <span className="text-sm text-gray-400">
                          {campaign.sent.toLocaleString()}
                        </span>

                      </td>


                      {/* STATUS */}

                      <td className="px-5 py-3.5">

                        {renderStatus(
                          campaign.status
                        )}

                      </td>


                      {/* NEXT RUN */}

                      <td className="px-5 py-3.5">

                        <span className="text-xs text-gray-400">
                          {campaign.nextRun ||
                            "—"}
                        </span>

                      </td>


                      {/* ACTIONS */}

                      <td className="px-5 py-3.5">

                        <div className="flex justify-end gap-2">

                          {/* EDIT */}

                          <button
                            type="button"
                            onClick={() =>
                              onEdit?.(
                                campaign
                              )
                            }
                            className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 transition hover:border-gray-300 hover:bg-gray-50"
                          >
                            <span className="inline-flex items-center gap-1">
                              <Pencil
                                size={11}
                              />
                              Edit
                            </span>
                          </button>


                          {/* ACTIVE */}

                          {campaign.status ===
                            "active" && (

                            <button
                              type="button"
                              onClick={() =>
                                onPause?.(
                                  campaign
                                )
                              }
                              className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs text-orange-600 transition hover:bg-orange-100"
                            >

                              <span className="inline-flex items-center gap-1">

                                <Pause
                                  size={11}
                                />

                                Pause

                              </span>

                            </button>

                          )}


                          {/* PAUSED / DRAFT */}

                          {(campaign.status ===
                            "paused" ||
                            campaign.status ===
                              "draft") && (

                            <button
                              type="button"
                              onClick={() =>
                                onResume?.(
                                  campaign
                                )
                              }
                              className="rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs text-green-600 transition hover:bg-green-100"
                            >

                              <span className="inline-flex items-center gap-1">

                                <Play
                                  size={11}
                                />

                                Resume

                              </span>

                            </button>

                          )}


                          {/* SCHEDULED */}

                          {campaign.status ===
                            "scheduled" && (

                            <button
                              type="button"
                              onClick={() =>
                                onPause?.(
                                  campaign
                                )
                              }
                              className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs text-orange-600 transition hover:bg-orange-100"
                            >

                              <span className="inline-flex items-center gap-1">

                                <Pause
                                  size={11}
                                />

                                Pause

                              </span>

                            </button>

                          )}


                          {/* DELETE */}

                          <button
                            type="button"
                            onClick={() =>
                              onDelete?.(
                                campaign
                              )
                            }
                            className="rounded-md border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs text-red-500 transition hover:bg-red-100"
                          >

                            <span className="inline-flex items-center gap-1">

                              <Trash2
                                size={11}
                              />

                              Delete

                            </span>

                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>


        {/* ================================= */}
        {/* FOOTER */}
        {/* ================================= */}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 px-5 py-4">

          {/* COUNT */}

          <div className="text-xs text-gray-500">

            {filteredCampaigns.length ===
            0 ? (
              "Showing 0 campaigns"
            ) : (
              <>
                Showing{" "}
                <strong className="font-medium text-gray-700">
                  {startIndex + 1}
                </strong>
                –
                <strong className="font-medium text-gray-700">
                  {endIndex}
                </strong>{" "}
                of{" "}
                <strong className="font-medium text-gray-700">
                  {filteredCampaigns.length}
                </strong>{" "}
                campaigns
              </>
            )}

          </div>


          {/* PAGINATION */}

          <div className="flex items-center gap-2">

            {/* PREVIOUS */}

            <button
              type="button"
              disabled={safePage === 1}
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.max(
                      1,
                      page - 1
                    )
                )
              }
              className="flex h-8 items-center gap-1 rounded-md border border-gray-200 px-3 text-xs text-gray-500 disabled:cursor-not-allowed disabled:opacity-40"
            >

              Previous

            </button>


            {/* PAGE NUMBERS */}

            {Array.from(
              {
                length: totalPages,
              },
              (_, index) =>
                index + 1
            )
              .slice(
                0,
                5
              )
              .map((page) => (

                <button
                  key={page}
                  type="button"
                  onClick={() =>
                    setCurrentPage(
                      page
                    )
                  }
                  className={`h-8 min-w-8 rounded-md border px-2 text-xs ${
                    safePage === page
                      ? "border-[var(--primary-color)] bg-[var(--primary-color)] text-white"
                      : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >

                  {page}

                </button>

              ))}


            {/* NEXT */}

            <button
              type="button"
              disabled={
                safePage >= totalPages
              }
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.min(
                      totalPages,
                      page + 1
                    )
                )
              }
              className="flex h-8 items-center gap-1 rounded-md border border-gray-200 px-3 text-xs text-gray-500 disabled:cursor-not-allowed disabled:opacity-40"
            >

              Next

              <ChevronRight
                size={13}
              />

            </button>

          </div>

        </div>

      </div>

    </div>
  );
}