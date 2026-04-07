"use client";

import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FaRunning, FaStar } from "react-icons/fa";
import { MdQuiz, MdForest } from "react-icons/md";
import { IoMdDownload, IoMdSettings } from "react-icons/io";
import { TiFolderOpen } from "react-icons/ti";

type BlockKey =
  | "motto"
  | "morning"
  | "afternoon"
  | "evening"
  | "orgaTeam"
  | "sonstiges";

interface IconFlags {
  star: boolean;
  q: boolean;
  f: boolean;
  s: boolean;
}

interface Day {
  date: string;
  motto: string;
  morning: string;
  afternoon: string;
  evening: string;
  orgaTeam: string;
  sonstiges: string;
  iconsVisible: Record<BlockKey, IconFlags>;
}

interface DragData {
  index: number;
  block?: BlockKey;
  isFullDay?: boolean;
}

interface SpecialEvent {
  date: string; // yyyy-mm-dd
  label: string;
}

const blockLabels: Record<BlockKey, string> = {
  motto: "Motto",
  morning: "Vormittag",
  afternoon: "Nachmittag",
  evening: "Abend",
  orgaTeam: "Tagesleitung",
  sonstiges: "Sonstiges",
};

const colorMotto = "#4f8c67";
const colorOrga = "#4b85a3";
const colorAktion = "#c9e4de";
const maxWidth = "25em";
const minWidth = "10em";
const fontSize = "1.5em";

const defaultSpecialEvents: SpecialEvent[] = [
  { date: "2025-07-26", label: "Anreise" },
  { date: "2025-08-02", label: "Bergfest" },
  { date: "2025-08-09", label: "Abreise" },
];

const defaultIcons: IconFlags = { star: false, q: false, f: false, s: false };

function createEmptyIcons(): Record<BlockKey, IconFlags> {
  return {
    motto: { ...defaultIcons },
    morning: { ...defaultIcons },
    afternoon: { ...defaultIcons },
    evening: { ...defaultIcons },
    orgaTeam: { ...defaultIcons },
    sonstiges: { ...defaultIcons },
  };
}

function formatDateKey(date: Date): string {
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function createInitialDays(start: string, count: number, events: SpecialEvent[]): Day[] {
  const startDate = new Date(start);
  const eventMap: Record<string, string> = {};

  for (const event of events) {
    if (!event.date || !event.label.trim()) continue;
    const d = new Date(event.date);
    eventMap[formatDateKey(d)] = event.label.trim();
  }

  return Array.from({ length: count }, (_, i) => {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    const shortDate = currentDate
      .toLocaleDateString("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      })
      .replace(/^(\w+)\./, "$1");

    const key = formatDateKey(currentDate);
    const label = eventMap[key] ? ` - ${eventMap[key]}` : "";

    return {
      date: `${shortDate}${label}`,
      motto: "",
      morning: "",
      afternoon: "",
      evening: "",
      orgaTeam: "",
      sonstiges: "",
      iconsVisible: createEmptyIcons(),
    };
  });
}

function getBlockColor(type: string, opacity: string = "f5"): string {
  switch (type) {
    case "orgaTeam":
      return colorOrga + opacity;
    case "morning":
    case "afternoon":
    case "evening":
      return colorAktion + opacity;
    case "motto":
      return colorMotto + opacity;
    default:
      return "#eee";
  }
}

export default function FerienlagerPlanung() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState("2025-07-26");
  const [dayCount, setDayCount] = useState(15);
  const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>(defaultSpecialEvents);

  const [days, setDays] = useState<Day[]>(
    createInitialDays("2025-07-26", 15, defaultSpecialEvents)
  );
  const [dragData, setDragData] = useState<DragData | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);

  useEffect(() => {
    const savedSettings = localStorage.getItem("ferienSettings");
    const savedDays = localStorage.getItem("ferientage");

    let start = "2025-07-26";
    let count = 15;
    let events = defaultSpecialEvents;

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.rangeStart) start = parsed.rangeStart;
        if (typeof parsed.dayCount === "number") count = parsed.dayCount;
        if (Array.isArray(parsed.specialEvents)) events = parsed.specialEvents;
      } catch (e) {
        console.warn("Fehler beim Laden der Settings:", e);
      }
    }

    setRangeStart(start);
    setDayCount(count);
    setSpecialEvents(events);

    const generatedDays = createInitialDays(start, count, events);

    if (savedDays) {
      try {
        const parsed = JSON.parse(savedDays) as Day[];

        const mergedDays = generatedDays.map((generatedDay, index) => {
          const savedDay = parsed[index];
          if (!savedDay) return generatedDay;

          return {
            ...generatedDay,
            motto: savedDay.motto ?? "",
            morning: savedDay.morning ?? "",
            afternoon: savedDay.afternoon ?? "",
            evening: savedDay.evening ?? "",
            orgaTeam: savedDay.orgaTeam ?? "",
            sonstiges: savedDay.sonstiges ?? "",
            iconsVisible: {
              motto: { ...defaultIcons, ...savedDay.iconsVisible?.motto },
              morning: { ...defaultIcons, ...savedDay.iconsVisible?.morning },
              afternoon: { ...defaultIcons, ...savedDay.iconsVisible?.afternoon },
              evening: { ...defaultIcons, ...savedDay.iconsVisible?.evening },
              orgaTeam: { ...defaultIcons, ...savedDay.iconsVisible?.orgaTeam },
              sonstiges: { ...defaultIcons, ...savedDay.iconsVisible?.sonstiges },
            },
          };
        });

        setDays(mergedDays);
      } catch (e) {
        console.warn("Fehler beim Parsen von localStorage-Daten:", e);
        setDays(generatedDays);
      }
    } else {
      setDays(generatedDays);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("ferientage", JSON.stringify(days));
  }, [days]);

  useEffect(() => {
    localStorage.setItem(
      "ferienSettings",
      JSON.stringify({
        rangeStart,
        dayCount,
        specialEvents,
      })
    );
  }, [rangeStart, dayCount, specialEvents]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    index: number,
    block?: BlockKey,
    isFullDay = false
    ) => {
    setDragData({ index, block, isFullDay });
    setDraggingId(isFullDay ? `day-${index}` : `block-${index}-${block}`);

    const preview = document.createElement("div");
    preview.style.position = "fixed";
    preview.style.top = "0";
    preview.style.left = "0";
    preview.style.transform = "translate(-9999px, -9999px)";
    preview.style.pointerEvents = "none";
    preview.style.zIndex = "9999";
    preview.style.opacity = "1";
    preview.style.background = "white";
    preview.style.color = "black";
    preview.style.padding = "0.5rem 0.75rem";
    preview.style.borderRadius = "8px";
    preview.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)";
    preview.style.fontSize = fontSize;
    preview.style.fontWeight = "bold";

    if (isFullDay) {
        preview.textContent = days[index].date;
    } else if (block) {
        preview.style.background = getBlockColor(block, "ff");
        preview.style.border = "1px solid " + getBlockColor(block, "ff");
        preview.textContent = days[index][block] || blockLabels[block];
    }

    document.body.appendChild(preview);
    dragPreviewRef.current = preview;

  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setDragImage(preview, 20, 20);

  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setHoverTargetId(null);

    if (dragPreviewRef.current) {
        document.body.removeChild(dragPreviewRef.current);
        dragPreviewRef.current = null;
    }
  };

  const handleDrop = (targetIndex: number, targetBlock?: BlockKey) => {
    if (!dragData) return;
    const updatedDays = [...days];

    if (dragData.isFullDay) {
      const sourceDay = updatedDays[dragData.index];
      const targetDay = updatedDays[targetIndex];

      (Object.keys(blockLabels) as BlockKey[]).forEach((block) => {
        const tempContent = sourceDay[block];
        const tempIcons = sourceDay.iconsVisible[block];

        sourceDay[block] = targetDay[block];
        targetDay[block] = tempContent;

        sourceDay.iconsVisible[block] = targetDay.iconsVisible[block];
        targetDay.iconsVisible[block] = tempIcons;
      });
    } else if (dragData.block && targetBlock) {
      const draggedValue = updatedDays[dragData.index][dragData.block];
      const targetValue = updatedDays[targetIndex][targetBlock];

      updatedDays[dragData.index][dragData.block] = targetValue;
      updatedDays[targetIndex][targetBlock] = draggedValue;

      const draggedIcons = updatedDays[dragData.index].iconsVisible[dragData.block];
      const targetIcons = updatedDays[targetIndex].iconsVisible[targetBlock];

      updatedDays[dragData.index].iconsVisible[dragData.block] = targetIcons;
      updatedDays[targetIndex].iconsVisible[targetBlock] = draggedIcons;
    }

    setDays(updatedDays);
    setDragData(null);
    setDraggingId(null);
    setHoverTargetId(null);
  };

  const handleInputChange = (dayIndex: number, block: BlockKey, value: string) => {
    const updatedDays = [...days];
    updatedDays[dayIndex][block] = value;
    setDays(updatedDays);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    dayIndex: number,
    block: BlockKey
  ) => {
    if (e.ctrlKey) {
      const key = e.key.toLowerCase();
      const updatedDays = [...days];
      const icons = updatedDays[dayIndex].iconsVisible[block];

      if (["y", "q", "f", "s"].includes(key)) {
        e.preventDefault();
        if (key === "y") icons.star = !icons.star;
        if (key === "q") icons.q = !icons.q;
        if (key === "f") icons.f = !icons.f;
        if (key === "s") icons.s = !icons.s;
        setDays(updatedDays);
      }
    }
  };

  const encodeIcons = (flags: IconFlags): string => {
    let code = "";
    if (flags.s) code += "s";
    if (flags.star) code += "f";
    if (flags.q) code += "q";
    if (flags.f) code += "w";
    return code;
  };

  const decodeIcons = (value: string | undefined): IconFlags => {
    const code = value ?? "";
    return {
      s: code.includes("s"),
      star: code.includes("f"),
      q: code.includes("q"),
      f: code.includes("w"),
    };
  };

  const exportToExcel = () => {
    const headerRow = ["", ...days.map((d) => d.date)];
    const contentRows = [
      ["Motto", ...days.map((d) => d.motto)],
      ["Vormittag", ...days.map((d) => d.morning)],
      ["Nachmittag", ...days.map((d) => d.afternoon)],
      ["Abend", ...days.map((d) => d.evening)],
      ["Sonstiges", ...days.map((d) => d.sonstiges)],
      ["Orga-Team", ...days.map((d) => d.orgaTeam)],
    ];

    const iconRows = [
      ["Motto", ...days.map((d) => encodeIcons(d.iconsVisible.motto))],
      ["Vormittag", ...days.map((d) => encodeIcons(d.iconsVisible.morning))],
      ["Nachmittag", ...days.map((d) => encodeIcons(d.iconsVisible.afternoon))],
      ["Abend", ...days.map((d) => encodeIcons(d.iconsVisible.evening))],
      ["Sonstiges", ...days.map((d) => encodeIcons(d.iconsVisible.sonstiges))],
      ["Orga-Team", ...days.map((d) => encodeIcons(d.iconsVisible.orgaTeam))],
    ];

    const settingsRows = [
      ["Startdatum", rangeStart],
      ["Anzahl Tage", dayCount],
      [],
      ["Sondertermine"],
      ["Datum", "Bezeichnung"],
      ...specialEvents.map((event) => [event.date, event.label]),
    ];

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([headerRow, ...contentRows]);
    const ws2 = XLSX.utils.aoa_to_sheet([headerRow, ...iconRows]);
    const ws3 = XLSX.utils.aoa_to_sheet(settingsRows);

    XLSX.utils.book_append_sheet(wb, ws1, "LagerTage");
    XLSX.utils.book_append_sheet(wb, ws2, "Markierungen");
    XLSX.utils.book_append_sheet(wb, ws3, "Settings");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "LagerTage.xlsx");
  };

  const importFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      const dataSheet = workbook.Sheets["LagerTage"];
      const iconSheet = workbook.Sheets["Markierungen"];
      const settingsSheet = workbook.Sheets["Settings"];

      if (!dataSheet) {
        alert('Die Datei enthält kein Blatt "LagerTage".');
        return;
      }

      let importedRangeStart = rangeStart;
      let importedDayCount = dayCount;
      let importedSpecialEvents = [...specialEvents];

      if (settingsSheet) {
        const settingsRows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(
          settingsSheet,
          { header: 1 }
        );

        const specialIndex = settingsRows.findIndex((row) => row?.[0] === "Sondertermine");

        for (const row of settingsRows) {
          if (!row?.length) continue;
          if (row[0] === "Startdatum" && typeof row[1] === "string") {
            importedRangeStart = row[1];
          }
          if (row[0] === "Anzahl Tage" && row[1] !== undefined) {
            importedDayCount = Number(row[1]);
          }
        }

        if (specialIndex >= 0) {
          const eventRows = settingsRows.slice(specialIndex + 2);
          importedSpecialEvents = eventRows
            .filter((row) => row?.[0] || row?.[1])
            .map((row) => ({
              date: String(row[0] ?? ""),
              label: String(row[1] ?? ""),
            }))
            .filter((event) => event.date || event.label);
        }
      }

      const dataRows = XLSX.utils.sheet_to_json<(string | undefined)[]>(dataSheet, {
        header: 1,
      });

      const iconRows = iconSheet
        ? XLSX.utils.sheet_to_json<(string | undefined)[]>(iconSheet, { header: 1 })
        : [];

      const rowMap: Record<string, BlockKey> = {
        Motto: "motto",
        Vormittag: "morning",
        Nachmittag: "afternoon",
        Abend: "evening",
        Sonstiges: "sonstiges",
        "Orga-Team": "orgaTeam",
      };

      const nextDays = createInitialDays(
        importedRangeStart,
        importedDayCount,
        importedSpecialEvents
      );

      for (let rowIndex = 1; rowIndex < dataRows.length; rowIndex++) {
        const row = dataRows[rowIndex];
        const label = row?.[0];

        if (!label || !(label in rowMap)) continue;
        const block = rowMap[label];

        for (let colIndex = 1; colIndex < row.length; colIndex++) {
          const dayIndex = colIndex - 1;
          if (!nextDays[dayIndex]) continue;
          nextDays[dayIndex][block] = String(row[colIndex] ?? "");
        }
      }

      for (let rowIndex = 1; rowIndex < iconRows.length; rowIndex++) {
        const row = iconRows[rowIndex];
        const label = row?.[0];

        if (!label || !(label in rowMap)) continue;
        const block = rowMap[label];

        for (let colIndex = 1; colIndex < row.length; colIndex++) {
          const dayIndex = colIndex - 1;
          if (!nextDays[dayIndex]) continue;
          nextDays[dayIndex].iconsVisible[block] = decodeIcons(
            typeof row[colIndex] === "string" ? row[colIndex] : String(row[colIndex] ?? "")
          );
        }
      }

      setRangeStart(importedRangeStart);
      setDayCount(importedDayCount);
      setSpecialEvents(importedSpecialEvents);
      setDays(nextDays);
    } catch (error) {
      console.error("Fehler beim Einlesen der Excel-Datei:", error);
      alert("Die Excel-Datei konnte nicht eingelesen werden.");
    } finally {
      e.target.value = "";
    }
  };

  const updateSpecialEvent = (
    index: number,
    field: "date" | "label",
    value: string
  ) => {
    const updated = [...specialEvents];
    updated[index] = { ...updated[index], [field]: value };
    setSpecialEvents(updated);
  };

  const addSpecialEvent = () => {
    setSpecialEvents([...specialEvents, { date: "", label: "" }]);
  };

  const removeSpecialEvent = (index: number) => {
    setSpecialEvents(specialEvents.filter((_, i) => i !== index));
  };

  const applySettings = () => {
    const regeneratedDays = createInitialDays(rangeStart, dayCount, specialEvents);

    const mergedDays = regeneratedDays.map((newDay, index) => {
      const oldDay = days[index];
      if (!oldDay) return newDay;

      return {
        ...newDay,
        motto: oldDay.motto,
        morning: oldDay.morning,
        afternoon: oldDay.afternoon,
        evening: oldDay.evening,
        orgaTeam: oldDay.orgaTeam,
        sonstiges: oldDay.sonstiges,
        iconsVisible: oldDay.iconsVisible,
      };
    });

    setDays(mergedDays);
    setSettingsOpen(false);
  };

  return (
    <div style={{ padding: "20px", backgroundColor: "black", minHeight: "100vh" }}>
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          padding: "0.5rem",
          marginBottom: "1em",
          display: "flex",
          gap: "1em",
          alignItems: "flex-start",
          position: "relative",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <a
            onClick={() => fileInputRef.current?.click()}
            className="btn"
          >
            open <TiFolderOpen />
          </a>

          <input
            type="file"
            accept=".xlsx,.xls"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={importFromExcel}
          />

          <a
            onClick={exportToExcel}
            className="btn"
          >
            save <IoMdDownload />
          </a>

          <a
            onClick={() => setSettingsOpen(true)}
            className="btn"
          >
            settings <IoMdSettings />
          </a>
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: "80%",
          }}
        >
          {Object.keys(blockLabels).map((block) => (
            <div
              key={block}
              style={{
                background: getBlockColor(block),
              }}
              className="header-elem"
            >
              {blockLabels[block as BlockKey]}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {days.map((day, dayIndex) => (
          <div
            key={dayIndex}
            onDragOver={(e) => {
                if (!dragData?.isFullDay) return;
                e.preventDefault();
                setHoverTargetId(`day-${dayIndex}`);
            }}
            onDrop={(e) => {
                if (!dragData?.isFullDay) return;
                e.preventDefault();
                handleDrop(dayIndex);
            }}
            className={[
                "dayCard",
                dragData?.isFullDay ? "dayDragMode" : "",
                draggingId === `day-${dayIndex}` ? "dayDragging" : "",
                dragData?.isFullDay && hoverTargetId === `day-${dayIndex}` ? "dropTargetHover" : "",
            ]
                .filter(Boolean)
                .join(" ")}
            style={{
              background: "white",
              borderRadius: "1rem",
              padding: "1rem",
              color: "black",
              flexGrow: 1,
              maxWidth,
              minWidth,
            }}
          >
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, dayIndex, undefined, true)}
              style={{ fontWeight: "bold", textAlign: "center", fontSize, cursor: "move"}}
              onDragEnd={handleDragEnd}
              className={
                draggingId === `day-${dayIndex}` ? "draggableItem dragging" : "draggableItem"
              }
            >
              {day.date}
            </div>

            {Object.keys(blockLabels).map((block) => (
              <div
                key={block}
                draggable
                onDragStart={(e) => handleDragStart(e, dayIndex, block as BlockKey)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => {
                if (dragData?.isFullDay || !dragData?.block) return;
                e.preventDefault();
                e.stopPropagation();
                setHoverTargetId(`block-${dayIndex}-${block}`);
                }}
                onDrop={(e) => {
                if (dragData?.isFullDay || !dragData?.block) return;
                e.preventDefault();
                e.stopPropagation();
                handleDrop(dayIndex, block as BlockKey);
                }}
                className={[
                    "draggableItem",
                    draggingId === `block-${dayIndex}-${block}` ? "dragging" : "",
                ]
                    .filter(Boolean)
                    .join(" ")
                }
                style={{ position: "relative", display: "flex", flexDirection: "column" }}
              >
                <input
                  type="text"
                  placeholder={blockLabels[block as BlockKey]}
                  value={day[block as BlockKey]}
                  onChange={(e) =>
                    handleInputChange(dayIndex, block as BlockKey, e.target.value)
                  }
                  onKeyDown={(e) => handleKeyDown(e, dayIndex, block as BlockKey)}
                  className={[
                    "draggable-input",
                    hoverTargetId === `block-${dayIndex}-${block}` ? "dropTargetHover" : "",
                    ]
                    .filter(Boolean)
                    .join(" ")
                  }
                  style={{
                    backgroundColor: getBlockColor(block, "af"),
                    border: "solid " + getBlockColor(block, "ff"),
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    top: "7px",
                    right: "3px",
                    display: "flex",
                    gap: "0.3em",
                  }}
                >
                  {day.iconsVisible[block as BlockKey].star && <FaStar style={{ color: "red" }} />}
                </div>

                <div
                  style={{
                    position: "absolute",
                    bottom: "5px",
                    right: "3px",
                    display: "flex",
                    gap: "0.3em",
                  }}
                >
                  {day.iconsVisible[block as BlockKey].q && (
                    <MdQuiz style={{ color: "blue" }} />
                  )}
                  {day.iconsVisible[block as BlockKey].f && (
                    <MdForest style={{ color: "green" }} />
                  )}
                  {day.iconsVisible[block as BlockKey].s && (
                    <FaRunning style={{ color: "#ff0083" }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {settingsOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "white",
              color: "black",
              padding: "1.5rem",
              borderRadius: "1rem",
              width: "min(700px, 90vw)",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Settings</h2>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginBottom: "1rem",
                flexWrap: "wrap",
              }}
            >
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                Start date
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                Number of days
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={dayCount}
                  onChange={(e) => setDayCount(Number(e.target.value))}
                />
              </label>
            </div>

            <h3>Special events</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {specialEvents.map((event, index) => (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "180px 1fr auto",
                    gap: ".5rem",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="date"
                    value={event.date}
                    onChange={(e) => updateSpecialEvent(index, "date", e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="e.g. Bergfest"
                    value={event.label}
                    onChange={(e) => updateSpecialEvent(index, "label", e.target.value)}
                  />
                  <button onClick={() => removeSpecialEvent(index)}>remove</button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "1rem", display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              <button onClick={addSpecialEvent}>add event</button>
              <button onClick={applySettings}>save settings</button>
              <button onClick={() => setSettingsOpen(false)}>cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}