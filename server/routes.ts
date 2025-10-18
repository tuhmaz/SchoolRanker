import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import { nanoid } from "nanoid";
import { generateMainGradebook, type MainGradebookPayload } from "./exportMainGradebook";
import { generateAttendanceWorkbook, type AttendancePayload } from "./exportAttendance";
import { generatePerformanceCover, type PerformanceCoverPayload } from "./exportPerformanceCover";
import { generateScheduleWorkbook, type ScheduleExportPayload } from "./exportSchedule";

// keep a map of generated files for download by id (memory-only)
const exportFiles = new Map<string, string>();

// Helper to get current directory with fallback
const getCurrentDir = () => {
  if (typeof import.meta.dirname !== 'undefined') {
    return import.meta.dirname;
  }
  // Fallback for environments where import.meta.dirname is not available
  return dirname(fileURLToPath(import.meta.url));
};

const resolveTemplatePath = (filename: string) => {
  const projectRoot = path.resolve(getCurrentDir(), "..");
  const candidates: string[] = [
    path.resolve(projectRoot, "templates", filename),
    path.resolve(projectRoot, filename),
    path.resolve(projectRoot, "dist", "templates", filename),
  ];
  const cwd = process.cwd();
  if (cwd && cwd !== projectRoot) {
    candidates.push(path.resolve(cwd, "templates", filename));
    candidates.push(path.resolve(cwd, filename));
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

const sendExportAndCleanup = (res: Response, id: string, exportPath: string) => {
  res.download(exportPath, path.basename(exportPath), (err) => {
    if (!err) {
      fs.promises.unlink(exportPath).catch(() => {});
    }
    exportFiles.delete(id);
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  app.post("/api/export/main-gradebook", async (req, res) => {
    try {
      const payload = req.body as MainGradebookPayload;
      const result = await generateMainGradebook(payload);
      exportFiles.set(result.id, result.exportPath);
      return res.json({ ok: true, id: result.id, filename: result.filename });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "failed to export main gradebook" });
    }
  });

  app.post("/api/export/performance-cover", async (req, res) => {
    try {
      const payload = req.body as PerformanceCoverPayload;
      if (!payload) {
        return res.status(400).json({ message: "invalid payload" });
      }

      const result = await generatePerformanceCover(payload);
      exportFiles.set(result.id, result.exportPath);
      return res.json({ ok: true, id: result.id, filename: result.filename });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "failed to export cover" });
    }
  });

  app.post("/api/export/attendance", async (req, res) => {
    try {
      console.log("[routes] Received attendance export request");
      const payload = req.body as AttendancePayload;
      console.log("[routes] Payload:", JSON.stringify({ 
        month: payload.month, 
        year: payload.year,
        classCount: payload.classes?.length,
        studentCount: payload.students?.length,
        attendanceCount: payload.attendance?.length
      }));
      
      const result = await generateAttendanceWorkbook(payload);
      console.log("[routes] Attendance workbook generated successfully:", result.filename);
      
      exportFiles.set(result.id, result.exportPath);
      return res.json({ ok: true, id: result.id, filename: result.filename });
    } catch (e: any) {
      console.error("[routes] Error exporting attendance:", e);
      console.error("[routes] Error stack:", e?.stack);
      return res.status(500).json({ message: e?.message || "failed to export attendance" });
    }
  });

  // Generate Side Gradebook Excel at project root mark_s.xlsx
  app.post("/api/export/side-gradebook", async (req, res) => {
    try {
      const body = req.body as {
        school?: string;
        directorate?: string;
        program?: string;
        teacherName?: string;
        town?: string;
        year?: string;
        isHomeroom?: boolean;
        homeroomClass?: string;
        classes: { className: string; divisions: { id: string; division: string; subjects: { id: string; name: string }[] }[] }[];
        students: { id: string; name: string; class: string; division: string; nationalId?: string }[];
      };

      if (!body || !Array.isArray(body.classes) || !Array.isArray(body.students)) {
        return res.status(400).json({ message: "invalid payload" });
      }

      const projectRoot = path.resolve(getCurrentDir(), "..");
      const templatePath = resolveTemplatePath("mark_s.xlsx");
      if (!templatePath) {
        return res.status(500).json({ message: "قالب mark_s.xlsx غير متوفر على الخادم" });
      }
      const exportsDir = path.resolve(projectRoot, "exports");
      await fs.promises.mkdir(exportsDir, { recursive: true });

      let templateWorkbook = new ExcelJS.Workbook();
      let templateSheet: ExcelJS.Worksheet | null = null;
      try {
        await templateWorkbook.xlsx.readFile(templatePath);
        templateSheet = templateWorkbook.worksheets[0] ?? null;
      } catch (error) {
        return res.status(500).json({ message: "تعذر قراءة قالب mark_s.xlsx" });
      }

      if (!templateSheet) {
        return res.status(500).json({ message: "تعذر تحديد ورقة العمل من قالب mark_s.xlsx" });
      }

      const cloneWorksheet = (source: ExcelJS.Worksheet, target: ExcelJS.Workbook, name: string) => {
        const worksheet = target.addWorksheet(name, {
          properties: { ...source.properties },
          pageSetup: { ...source.pageSetup },
          views: source.views?.map((view) => ({ ...view })) ?? undefined,
        });

        if (source.columns?.length) {
          worksheet.columns = source.columns.map((column) => ({
            header: column.header,
            key: column.key,
            width: column.width,
            hidden: column.hidden,
            outlineLevel: column.outlineLevel,
            style: column.style ? { ...column.style } : undefined,
          }));
        }

        source.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          const targetRow = worksheet.getRow(rowNumber);
          targetRow.height = row.height;
          targetRow.outlineLevel = row.outlineLevel;
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const targetCell = targetRow.getCell(colNumber);
            targetCell.value = cell.value;
            if (cell.style) targetCell.style = { ...cell.style };
            if (cell.alignment) targetCell.alignment = { ...cell.alignment };
            if (cell.font) targetCell.font = { ...cell.font };
            if (cell.border) targetCell.border = { ...cell.border };
            if (cell.fill) targetCell.fill = { ...cell.fill };
            if (cell.numFmt) targetCell.numFmt = cell.numFmt;
          });
        });

        const merges = ((source as unknown as { model?: { merges?: string[] } }).model?.merges) ?? [];
        merges.forEach((mergeRef) => {
          worksheet.mergeCells(mergeRef);
        });

        return worksheet;
      };

      const cellValueToString = (value: ExcelJS.CellValue | undefined): string | undefined => {
        if (value == null) return undefined;
        if (typeof value === "string") return value;
        if (typeof value === "number" || typeof value === "boolean") return String(value);
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "object") {
          const anyValue = value as any;
          if (Array.isArray(anyValue.richText)) {
            return anyValue.richText.map((part: any) => part?.text ?? "").join("");
          }
          if (anyValue.text) return String(anyValue.text);
          if (anyValue.result != null) return cellValueToString(anyValue.result as ExcelJS.CellValue);
          if (anyValue.formula) return String(anyValue.formula);
          if (anyValue.sharedFormula) return String(anyValue.sharedFormula);
          if (anyValue.hyperlink) return String(anyValue.hyperlink);
        }
        return undefined;
      };

      const findCell = (worksheet: ExcelJS.Worksheet, matcher: (value: string) => boolean): { r: number; c: number } | null => {
        const maxRows = Math.max(worksheet.rowCount, worksheet.actualRowCount ?? 0);
        let maxCols = worksheet.columnCount;
        worksheet.eachRow({ includeEmpty: true }, (row) => {
          if (row.cellCount > maxCols) maxCols = row.cellCount;
        });

        for (let r = 1; r <= maxRows; r++) {
          const row = worksheet.getRow(r);
          for (let c = 1; c <= maxCols; c++) {
            const cell = row.getCell(c);
            const text = cellValueToString(cell.value as ExcelJS.CellValue | undefined);
            if (text && matcher(text)) {
              return { r: r - 1, c: c - 1 };
            }
          }
        }
        return null;
      };

      const setNextToLabel = (worksheet: ExcelJS.Worksheet, regex: RegExp, value?: string) => {
        if (!value) return;
        const pos = findCell(worksheet, (text) => regex.test(text));
        if (!pos) return;

        const targetCell = worksheet.getCell(pos.r + 1, pos.c + 2);
        const existing = cellValueToString(targetCell.value as ExcelJS.CellValue | undefined);
        if (existing && existing.trim().length > 0 && existing.trim() !== value.trim()) {
          return;
        }
        setCell(worksheet, pos.r, pos.c + 1, value);
      };

      const setCell = (worksheet: ExcelJS.Worksheet, r: number, c: number, value: string | number | undefined) => {
        if (value == null) return;
        worksheet.getCell(r + 1, c + 1).value = value;
      };

      const ensureUniqueSheetName = (base: string, workbook: ExcelJS.Workbook) => {
        let trimmed = base.trim() ? base.trim().slice(0, 31) : "";
        if (!trimmed) trimmed = `Sheet_${workbook.worksheets.length + 1}`;
        if (!workbook.getWorksheet(trimmed)) return trimmed;
        let index = 1;
        while (index < 50) {
          const suffix = `_${index}`;
          const candidate = `${trimmed.slice(0, Math.max(0, 31 - suffix.length))}${suffix}`;
          if (!workbook.getWorksheet(candidate)) return candidate;
          index += 1;
        }
        return `${trimmed.slice(0, 25)}_${Date.now()}`.slice(0, 31);
      };

      const outWorkbook = new ExcelJS.Workbook();
      outWorkbook.views = templateWorkbook.views?.map((view) => ({ ...view }));

      for (const group of body.classes) {
        for (const div of group.divisions) {
          const subjects = Array.isArray(div.subjects) && div.subjects.length > 0 ? div.subjects : [{ id: "__default", name: "" }];

          for (const subject of subjects) {
            const subjectName = subject?.name?.trim() ?? "";
            const baseSheetName = [group.className, div.division, subjectName].filter(Boolean).join(" - ");
            const sheetKey = ensureUniqueSheetName(baseSheetName || `${group.className}-${div.division}`, outWorkbook);
            const worksheet = cloneWorksheet(templateSheet!, outWorkbook, sheetKey);

            setCell(worksheet, 1, 1, group.className);
            setCell(worksheet, 1, 5, div.division);
            if (subjectName) setCell(worksheet, 1, 10, subjectName);
            if (body.isHomeroom && body.teacherName && body.homeroomClass === `${group.className}-${div.division}`) {
              setCell(worksheet, 2, 1, body.teacherName);
            }
            const footerLabel = (baseSheetName || [group.className, div.division].filter(Boolean).join(" - ")).trim();
            if (footerLabel) {
              worksheet.headerFooter.differentOddEven = false;
              worksheet.headerFooter.oddFooter = `&C${footerLabel}`;
            }

            setNextToLabel(worksheet, /الصف/, group.className);
            setNextToLabel(worksheet, /الشعبة/, div.division);
            setNextToLabel(worksheet, /(المادة|المادة\s*الدراسية|المبحث)/, subjectName);
            setNextToLabel(worksheet, /المدرسة/, body.school);
            setNextToLabel(worksheet, /المديرية/, body.directorate);
            setNextToLabel(worksheet, /(اسم\s*المعلم|المعلم)/, body.teacherName);
            setNextToLabel(worksheet, /(البلدة|الموقع)/, body.town);
            setNextToLabel(worksheet, /(البرنامج|المسار)/, body.program);
            setNextToLabel(worksheet, /(العام\s*الدراسي|السنة\s*الدراسية)/, body.year);

            const nameHeaderPos = findCell(worksheet, (text) => /(الاسم|اسم\s*الطالب)/.test(text));
            const numberHeaderPos = findCell(worksheet, (text) => /(الرقم\s*المتسلسل|^\s*م\s*$)/.test(text));
            const nameCol = nameHeaderPos ? nameHeaderPos.c : 1;
            const numCol = numberHeaderPos ? numberHeaderPos.c : 0;
            const startRow = nameHeaderPos ? nameHeaderPos.r + 3 : 6;

            const students = body.students
              .filter((s) => s.class === group.className && s.division === div.division)
              .slice()
              .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar", { sensitivity: "base" }));

            students.forEach((student, idx) => {
              setCell(worksheet, startRow + idx, nameCol, student.name);
              setCell(worksheet, startRow + idx, numCol, idx + 1);
            });
          }
        }
      }

      const id = nanoid(10);
      const filename = `سجلات_العلامات_النهائية_${id}.xlsx`;
      const exportPath = path.resolve(exportsDir, filename);
      await outWorkbook.xlsx.writeFile(exportPath);
      exportFiles.set(id, exportPath);
      return res.json({ ok: true, id, filename });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "failed to export" });
    }
  });

  app.post("/api/export/performance", async (req, res) => {
    try {
      const body = req.body as {
        teacherName?: string;
        classes: { className: string; divisions: { id: string; division: string; subjects: { id: string; name: string }[] }[] }[];
        students: { id: string; name: string; class: string; division: string }[];
      };

      if (!body || !Array.isArray(body.classes) || !Array.isArray(body.students)) {
        return res.status(400).json({ message: "invalid payload" });
      }

      const projectRoot = path.resolve(getCurrentDir(), "..");
      const templatesDir = path.resolve(projectRoot, "templates");
      const templatePath = fs.existsSync(path.resolve(templatesDir, "adaa.xlsx"))
        ? path.resolve(templatesDir, "adaa.xlsx")
        : path.resolve(projectRoot, "adaa.xlsx");
      const exportsDir = path.resolve(projectRoot, "exports");
      await fs.promises.mkdir(exportsDir, { recursive: true });

      let templateWorkbook = new ExcelJS.Workbook();
      let templateSheet: ExcelJS.Worksheet | null = null;
      try {
        if (fs.existsSync(templatePath)) {
          await templateWorkbook.xlsx.readFile(templatePath);
          templateSheet = templateWorkbook.worksheets[0] ?? null;
        }
      } catch {}

      if (!templateSheet) {
        templateWorkbook = new ExcelJS.Workbook();
        templateSheet = templateWorkbook.addWorksheet("Template", {
          views: [{ rightToLeft: true }],
        });
        templateSheet.getCell("A1").value = "الصف:";
        templateSheet.getCell("A2").value = "الشعبة:";
        templateSheet.getCell("B3").value = "المادة:";
        templateSheet.getCell("B4").value = "المعلم:";
        templateSheet.getCell("A6").value = "م";
        templateSheet.getCell("B6").value = "اسم الطالب";
      }

      const cloneWorksheet = (source: ExcelJS.Worksheet, target: ExcelJS.Workbook, name: string) => {
        const worksheet = target.addWorksheet(name, {
          properties: { ...source.properties },
          pageSetup: { ...source.pageSetup },
          views: source.views?.map((view) => ({ ...view })) ?? undefined,
        });

        if (source.columns?.length) {
          worksheet.columns = source.columns.map((column) => ({
            header: column.header,
            key: column.key,
            width: column.width,
            hidden: column.hidden,
            outlineLevel: column.outlineLevel,
            style: column.style ? { ...column.style } : undefined,
          }));
        }

        source.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          const targetRow = worksheet.getRow(rowNumber);
          targetRow.height = row.height;
          targetRow.outlineLevel = row.outlineLevel;
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const targetCell = targetRow.getCell(colNumber);
            targetCell.value = cell.value;
            if (cell.style) targetCell.style = { ...cell.style };
            if (cell.alignment) targetCell.alignment = { ...cell.alignment };
            if (cell.font) targetCell.font = { ...cell.font };
            if (cell.border) targetCell.border = { ...cell.border };
            if (cell.fill) targetCell.fill = { ...cell.fill };
            if (cell.numFmt) targetCell.numFmt = cell.numFmt;
          });
        });

        const merges = ((source as unknown as { model?: { merges?: string[] } }).model?.merges) ?? [];
        merges.forEach((mergeRef) => {
          worksheet.mergeCells(mergeRef);
        });

        return worksheet;
      };

      const cellValueToString = (value: ExcelJS.CellValue | undefined): string | undefined => {
        if (value == null) return undefined;
        if (typeof value === "string") return value;
        if (typeof value === "number" || typeof value === "boolean") return String(value);
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "object") {
          const anyValue = value as any;
          if (Array.isArray(anyValue.richText)) {
            return anyValue.richText.map((part: any) => part?.text ?? "").join("");
          }
          if (anyValue.text) return String(anyValue.text);
          if (anyValue.result != null) return cellValueToString(anyValue.result as ExcelJS.CellValue);
          if (anyValue.formula) return String(anyValue.formula);
          if (anyValue.sharedFormula) return String(anyValue.sharedFormula);
          if (anyValue.hyperlink) return String(anyValue.hyperlink);
        }
        return undefined;
      };

      const findCell = (worksheet: ExcelJS.Worksheet, matcher: (value: string) => boolean): { r: number; c: number } | null => {
        const maxRows = Math.max(worksheet.rowCount, worksheet.actualRowCount ?? 0);
        let maxCols = worksheet.columnCount;
        worksheet.eachRow({ includeEmpty: true }, (row) => {
          if (row.cellCount > maxCols) maxCols = row.cellCount;
        });

        for (let r = 1; r <= maxRows; r++) {
          const row = worksheet.getRow(r);
          for (let c = 1; c <= maxCols; c++) {
            const cell = row.getCell(c);
            const text = cellValueToString(cell.value as ExcelJS.CellValue | undefined);
            if (text && matcher(text)) {
              return { r: r - 1, c: c - 1 };
            }
          }
        }
        return null;
      };

      const setCell = (worksheet: ExcelJS.Worksheet, r: number, c: number, value: string | number | undefined) => {
        if (value == null) return;
        worksheet.getCell(r + 1, c + 1).value = value;
      };

      const ensureUniqueSheetName = (base: string, workbook: ExcelJS.Workbook) => {
        let trimmed = base.trim() ? base.trim().slice(0, 31) : "";
        if (!trimmed) trimmed = `Sheet_${workbook.worksheets.length + 1}`;
        if (!workbook.getWorksheet(trimmed)) return trimmed;
        let index = 1;
        while (index < 50) {
          const suffix = `_${index}`;
          const candidate = `${trimmed.slice(0, Math.max(0, 31 - suffix.length))}${suffix}`;
          if (!workbook.getWorksheet(candidate)) return candidate;
          index += 1;
        }
        return `${trimmed.slice(0, 25)}_${Date.now()}`.slice(0, 31);
      };

      const outWorkbook = new ExcelJS.Workbook();
      outWorkbook.views = templateWorkbook.views?.map((view) => ({ ...view }));

      for (const group of body.classes) {
        for (const div of group.divisions) {
          const subjects = Array.isArray(div.subjects) && div.subjects.length > 0 ? div.subjects : [{ id: "__default", name: "" }];

          for (const subject of subjects) {
            const subjectName = subject?.name?.trim() ?? "";
            const baseSheetName = [group.className, div.division, subjectName].filter(Boolean).join(" - ");
            const sheetKey = ensureUniqueSheetName(baseSheetName || `${group.className}-${div.division}`, outWorkbook);
            const worksheet = cloneWorksheet(templateSheet!, outWorkbook, sheetKey);

            if (group.className?.trim()) worksheet.getCell("A1").value = `الصف: ${group.className}`;
            if (div.division?.trim()) worksheet.getCell("A2").value = `الشعبة: ${div.division}`;
            if (subjectName) worksheet.getCell("B3").value = `المادة: ${subjectName}`;
            if (body.teacherName?.trim()) worksheet.getCell("B4").value = `المعلم: ${body.teacherName}`;

            const nameHeaderPos = findCell(worksheet, (text) => /(الاسم|اسم\s*الطالب)/.test(text));
            const numberHeaderPos = findCell(worksheet, (text) => /(الرقم\s*المتسلسل|^\s*م\s*$)/.test(text));
            const nameCol = nameHeaderPos ? nameHeaderPos.c : 1;
            const numCol = numberHeaderPos ? numberHeaderPos.c : 0;
            const startRow = nameHeaderPos ? nameHeaderPos.r + 1 : 5;

            const students = body.students
              .filter((s) => s.class === group.className && s.division === div.division)
              .slice()
              .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar", { sensitivity: "base" }));

            students.forEach((student, idx) => {
              setCell(worksheet, startRow + idx, nameCol, student.name);
              setCell(worksheet, startRow + idx, numCol, idx + 1);
            });
          }
        }
      }

      const id = nanoid(10);
      const filename = `سجلات_الاداء_والملاحظات_${id}.xlsx`;
      const exportPath = path.resolve(exportsDir, filename);
      await outWorkbook.xlsx.writeFile(exportPath);
      exportFiles.set(id, exportPath);
      return res.json({ ok: true, id, filename });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "failed to export performance" });
    }
  });

  // Download last generated main gradebook
  app.get("/api/export/main-gradebook", async (req, res) => {
    try {
      const id = (req.query.id as string) || "";
      const exportPath = exportFiles.get(id);
      if (!exportPath || !fs.existsSync(exportPath)) {
        return res.status(404).json({ message: "file not found" });
      }
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      sendExportAndCleanup(res, id, exportPath);
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "download failed" });
    }
  });

  // Download last generated side gradebook
  app.get("/api/export/side-gradebook", async (req, res) => {
    try {
      const id = (req.query.id as string) || "";
      const exportPath = exportFiles.get(id);
      if (!exportPath || !fs.existsSync(exportPath)) {
        return res.status(404).json({ message: "file not found" });
      }
      res.type(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      sendExportAndCleanup(res, id, exportPath);
      return;
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "download failed" });
    }
  });

  // Download last generated performance tracker
  app.get("/api/export/performance", async (req, res) => {
    try {
      const id = (req.query.id as string) || "";
      const exportPath = exportFiles.get(id);
      if (!exportPath || !fs.existsSync(exportPath)) {
        return res.status(404).json({ message: "file not found" });
      }
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      sendExportAndCleanup(res, id, exportPath);
      return;
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "download failed" });
    }
  });

  app.get("/api/export/performance-cover", async (req, res) => {
    try {
      const id = (req.query.id as string) || "";
      const exportPath = exportFiles.get(id);
      if (!exportPath || !fs.existsSync(exportPath)) {
        return res.status(404).json({ message: "file not found" });
      }
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      sendExportAndCleanup(res, id, exportPath);
      return;
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "download failed" });
    }
  });

  app.get("/api/export/attendance", async (req, res) => {
    try {
      const id = (req.query.id as string) || "";
      const exportPath = exportFiles.get(id);
      if (!exportPath || !fs.existsSync(exportPath)) {
        return res.status(404).json({ message: "file not found" });
      }
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      sendExportAndCleanup(res, id, exportPath);
      return;
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "download failed" });
    }
  });

  app.post("/api/export/schedule", async (req, res) => {
    try {
      console.log("[routes] Received schedule export request");
      const payload = req.body as ScheduleExportPayload;
      console.log("[routes] Payload:", JSON.stringify({
        studentCount: payload.students?.length,
        absenceCount: payload.absences?.length
      }));

      const result = await generateScheduleWorkbook(payload);
      console.log("[routes] Schedule workbook generated successfully:", result.filename);

      exportFiles.set(result.id, result.exportPath);
      return res.json({ ok: true, id: result.id, filename: result.filename });
    } catch (e: any) {
      console.error("[routes] Error exporting schedule:", e);
      return res.status(500).json({ message: e?.message || "failed to export schedule" });
    }
  });

  app.get("/api/export/schedule/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const exportPath = exportFiles.get(id);
      if (!exportPath || !fs.existsSync(exportPath)) {
        return res.status(404).json({ message: "file not found" });
      }
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      sendExportAndCleanup(res, id, exportPath);
      return;
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "download failed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
