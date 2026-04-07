"use client";

import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FaRegStar, FaRunning, FaStar } from "react-icons/fa";
import { MdOutlineQuiz, MdQuiz, MdForest } from "react-icons/md";
import { IoMdDownload, IoMdSettings } from "react-icons/io";
import { TiFolderOpen } from "react-icons/ti";

// --- Typdefinitionen ---
type BlockKey = "motto" | "morning" | "afternoon" | "evening" | "orgaTeam" | "sonstiges";

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

const startDate = new Date(2025, 6, 26);
const extraLabels: Record<string, string> = {
  "26.07.2025": " - Anreise",
  "02.08.2025": " - Bergfest",
  "09.08.2025": " - Abreise",
};

const initialDays: Day[] = Array.from({ length: 15 }, (_, i) => {
  const currentDate = new Date(startDate);
  currentDate.setDate(startDate.getDate() + i);
  const shortDate = currentDate.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).replace(/^(\w+)\./, "$1");

  const key = currentDate.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const label = extraLabels[key] ?? "";
  const fullDate = `${shortDate}${label}`;
  const defaultIcons: IconFlags = { star: false, q: false, f: false, s: false };

  return {
    date: fullDate,
    motto: "",
    morning: "",
    afternoon: "",
    evening: "",
    orgaTeam: "",
    sonstiges: "",
    iconsVisible: {
      motto: { ...defaultIcons },
      morning: { ...defaultIcons },
      afternoon: { ...defaultIcons },
      evening: { ...defaultIcons },
      orgaTeam: { ...defaultIcons },
      sonstiges: { ...defaultIcons },
    },
  };
});

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

export default function FerienlagerPlanung() {
  const [days, setDays] = useState<Day[]>(initialDays);
  const [dragData, setDragData] = useState<DragData | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inhalte aus localStorage nachträglich laden (damit `date` erhalten bleibt)
  useEffect(() => {
    const saved = localStorage.getItem("ferientage");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Day[];
        const defaultIcons: IconFlags = { star: false, q: false, f: false, s: false };

        const mergedDays = initialDays.map((initialDay, index) => {
          const savedDay = parsed[index];
          if (!savedDay) return initialDay;

          const filledIcons: Record<BlockKey, IconFlags> = {
            motto: { ...defaultIcons, ...savedDay.iconsVisible?.motto },
            morning: { ...defaultIcons, ...savedDay.iconsVisible?.morning },
            afternoon: { ...defaultIcons, ...savedDay.iconsVisible?.afternoon },
            evening: { ...defaultIcons, ...savedDay.iconsVisible?.evening },
            orgaTeam: { ...defaultIcons, ...savedDay.iconsVisible?.orgaTeam },
            sonstiges: { ...defaultIcons, ...savedDay.iconsVisible?.sonstiges },
          };

          return {
            ...initialDay,
            motto: savedDay.motto ?? "",
            morning: savedDay.morning ?? "",
            afternoon: savedDay.afternoon ?? "",
            evening: savedDay.evening ?? "",
            orgaTeam: savedDay.orgaTeam ?? "",
            sonstiges: savedDay.sonstiges ?? "",
            iconsVisible: filledIcons,
          };
        });

        setDays(mergedDays);
      } catch (e) {
        console.warn("Fehler beim Parsen von localStorage-Daten:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("ferientage", JSON.stringify(days));
  }, [days]);

  useEffect(() => {
    setTimeout(() => (document.title = "TagesOrga"), 100);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleDragStart = (index: number, block?: BlockKey, isFullDay = false) => {
    setDragData({ index, block, isFullDay });
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

  const importFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      const dataSheet = workbook.Sheets["LagerTage"];
      const iconSheet = workbook.Sheets["Markierungen"];

      if (!dataSheet) {
        alert('Die Datei enthält kein Blatt "LagerTage".');
        return;
      }

      const dataRows = XLSX.utils.sheet_to_json<(string | undefined)[]>(dataSheet, {
        header: 1,
      });

      const iconRows = iconSheet
        ? XLSX.utils.sheet_to_json<(string | undefined)[]>(iconSheet, { header: 1 })
        : [];

      const decodeIcons = (value: string | undefined): IconFlags => {
        const code = value ?? "";
        return {
          s: code.includes("s"),
          star: code.includes("f"),
          q: code.includes("q"),
          f: code.includes("w"),
        };
      };

      const rowMap: Record<string, BlockKey> = {
        Motto: "motto",
        Vormittag: "morning",
        Nachmittag: "afternoon",
        Abend: "evening",
        Sonstiges: "sonstiges",
        "Orga-Team": "orgaTeam",
      };

      const nextDays = initialDays.map((day) => ({
        ...day,
        iconsVisible: {
          motto: { star: false, q: false, f: false, s: false },
          morning: { star: false, q: false, f: false, s: false },
          afternoon: { star: false, q: false, f: false, s: false },
          evening: { star: false, q: false, f: false, s: false },
          orgaTeam: { star: false, q: false, f: false, s: false },
          sonstiges: { star: false, q: false, f: false, s: false },
        },
      }));

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

      setDays(nextDays);
    } catch (error) {
      console.error("Fehler beim Einlesen der Excel-Datei:", error);
      alert("Die Excel-Datei konnte nicht eingelesen werden.");
    } finally {
      e.target.value = "";
    }
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

    const encodeIcons = (flags: IconFlags): string => {
      let code = "";
      if (flags.s) code += "s";
      if (flags.star) code += "f";
      if (flags.q) code += "q";
      if (flags.f) code += "w";
      return code;
    };

    const iconRows = [
      ["Motto", ...days.map((d) => encodeIcons(d.iconsVisible.motto))],
      ["Vormittag", ...days.map((d) => encodeIcons(d.iconsVisible.morning))],
      ["Nachmittag", ...days.map((d) => encodeIcons(d.iconsVisible.afternoon))],
      ["Abend", ...days.map((d) => encodeIcons(d.iconsVisible.evening))],
      ["Sonstiges", ...days.map((d) => encodeIcons(d.iconsVisible.sonstiges))],
      ["Orga-Team", ...days.map((d) => encodeIcons(d.iconsVisible.orgaTeam))],
    ];

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([headerRow, ...contentRows]);
    const ws2 = XLSX.utils.aoa_to_sheet([headerRow, ...iconRows]);

    XLSX.utils.book_append_sheet(wb, ws1, "LagerTage");
    XLSX.utils.book_append_sheet(wb, ws2, "Markierungen");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "LagerTage.xlsx");
  };

  return (
    <div style={{ padding: "20px", backgroundColor: "black" }}>
      <div style={{ background: "white", borderRadius: "8px", padding: "0.5rem", marginBottom: "1em", display: "flex", gap: "1em", alignItems: "flex-start", position: "relative" }}>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button onClick={() => fileInputRef.current?.click()} style={{ padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: ".3em" }}>open <TiFolderOpen /></button>
          <button onClick={exportToExcel} style={{ padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: ".3em" }}>save <IoMdDownload /></button>
          <input type="file" accept=".xlsx,.xls" ref={fileInputRef} style={{ display: "none" }} onChange={importFromExcel} />
        </div>
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "0.5rem" }}>
          {Object.keys(blockLabels).map((block) => (
            <div key={block} style={{ background: getBlockColor(block), borderRadius: "8px", padding: "0.5rem", fontWeight: "bold", color: "black" }}>{blockLabels[block as BlockKey]}</div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {days.map((day, dayIndex) => (
          <div
            key={dayIndex}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(dayIndex)}
            style={{ background: "white", borderRadius: "1rem", padding: "1rem", color: "black", flexGrow: 1, maxWidth, minWidth }}
          >
            <div
              draggable
              onDragStart={() => handleDragStart(dayIndex, undefined, true)}
              style={{ fontWeight: "bold", textAlign: "center", fontSize, cursor: "move" }}
            >
              {day.date}
            </div>
            {Object.keys(blockLabels).map((block) => (
              <div
                key={block}
                draggable
                onDragStart={() => handleDragStart(dayIndex, block as BlockKey)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(dayIndex, block as BlockKey)}
                style={{ position: "relative", display: "flex", flexDirection: "column" }}
              >
                <input
                  type="text"
                  placeholder={blockLabels[block as BlockKey]}
                  value={day[block as BlockKey]}
                  onChange={(e) => handleInputChange(dayIndex, block as BlockKey, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, dayIndex, block as BlockKey)}
                  style={{
                    padding: "0.3rem",
                    borderRadius: ".3em",
                    color: "black",
                    fontSize,
                    backgroundColor: getBlockColor(block, "af"),
                    border: "solid " + getBlockColor(block, "ff"),
                    marginTop: ".2em",
                    height: "1.7em",
                  }}
                />
                <div style={{ position: "absolute", top: "7px", right: "3px", display: "flex", gap: "0.3em" }}>
                  {day.iconsVisible[block as BlockKey].star && <FaStar style={{ color: "red" }} />}
                </div>
                <div style={{ position: "absolute", bottom: "5px", right: "3px", display: "flex", gap: "0.3em" }}>
                  {day.iconsVisible[block as BlockKey].q && <MdQuiz style={{ color: "blue" }} />}
                  {day.iconsVisible[block as BlockKey].f && <MdForest style={{ color: "green" }} />}
                  {day.iconsVisible[block as BlockKey].s && <FaRunning style={{ color: "#ff0083" }} />}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function getBlockColor(type: string, opacity: string = "f5"): string {
  switch (type) {
    case "orgaTeam": return colorOrga + opacity;
    case "morning":
    case "afternoon":
    case "evening": return colorAktion + opacity;
    case "motto": return colorMotto + opacity;
    default: return "#eee";
  }
}
