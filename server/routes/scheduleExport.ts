import { Router, Request, Response } from "express";
import path from "node:path";
import fs from "node:fs";
import { generateScheduleWorkbook } from "../exportSchedule.js";

const router = Router();

interface ExportRequest {
  students: Array<{
    id: string;
    firstName?: string;
    fatherName?: string;
    grandName?: string;
    familyName?: string;
    classId: string;
  }>;
  absences: Array<{
    studentId: string;
    month: string;
    absenceCount: number;
  }>;
}

// POST /api/export/schedule
router.post("/schedule", async (req: Request, res: Response) => {
  try {
    const payload: ExportRequest = req.body;

    if (!payload || !Array.isArray(payload.students) || !Array.isArray(payload.absences)) {
      return res.status(400).json({ ok: false, error: "بيانات غير صحيحة" });
    }

    console.log("[routes] Received schedule export request");
    console.log(
      `[routes] Payload: students=${payload.students.length}, absences=${payload.absences.length}`
    );

    const result = await generateScheduleWorkbook({
      students: payload.students,
      absences: payload.absences,
    });

    console.log(`[routes] Schedule workbook generated successfully: ${result.filename}`);

    res.json({
      ok: true,
      id: result.id,
      filename: result.filename,
    });
  } catch (error) {
    console.error("[routes] Schedule export error:", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "خطأ غير معروف",
    });
  }
});

// GET /api/export/schedule/:id
router.get("/schedule/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exportsDir = path.resolve(process.cwd(), "exports");
    const files = await fs.promises.readdir(exportsDir);
    const file = files.find((f) => f.includes(id));

    if (!file) {
      return res.status(404).json({ ok: false, error: "الملف غير موجود" });
    }

    const filePath = path.resolve(exportsDir, file);
    res.download(filePath, file);
  } catch (error) {
    console.error("[routes] Download error:", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "خطأ في التحميل",
    });
  }
});

export default router;
