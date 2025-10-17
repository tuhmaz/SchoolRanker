# SchoolRanker - Project Structure

## نظام إدارة سجلات الطلبة
**Student Records Management System - Compatible with Ajyal Platform (Ministry of Education)**

---

## 📁 Project Directory Structure

```
SchoolRanker/
├── client/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/              # Reusable React components
│   │   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── AppSidebar.tsx       # Main navigation sidebar
│   │   │   ├── ThemeToggle.tsx      # Dark/Light theme toggle
│   │   │   ├── AdBanner.tsx         # Google AdSense banner component
│   │   │   ├── AdSidebar.tsx        # Right sidebar ads
│   │   │   ├── AdFooter.tsx         # Footer ads
│   │   │   ├── AdContentTop.tsx     # Top content ads
│   │   │   ├── FileUploadZone.tsx   # Excel file upload
│   │   │   ├── ClassSubjectManager.tsx # Class/subject management
│   │   │   └── ...
│   │   ├── pages/                   # Page components
│   │   │   ├── Settings.tsx         # Initial setup & configuration
│   │   │   ├── MainGradebook.tsx    # Main grades management
│   │   │   ├── SideGradebook.tsx    # Side grades
│   │   │   ├── Attendance.tsx       # Attendance tracking
│   │   │   ├── Performance.tsx      # Performance analytics
│   │   │   ├── StudentSchedule.tsx  # Schedule export
│   │   │   ├── Templates.tsx        # Template management
│   │   │   ├── Instructions.tsx     # User guide
│   │   │   └── About.tsx            # About page
│   │   ├── lib/                     # Utility functions
│   │   │   ├── excelParser.ts       # Excel file parsing
│   │   │   ├── queryClient.ts       # React Query setup
│   │   │   └── ...
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── types/                   # TypeScript type definitions
│   │   ├── App.tsx                  # Main app component
│   │   ├── main.tsx                 # Entry point with AdSense script loader
│   │   └── index.css                # Global styles (Tailwind + custom)
│   ├── index.html                   # HTML template
│   └── vite.config.ts               # Vite configuration
│
├── server/                          # Backend (Express + Node.js)
│   ├── index.ts                     # Server entry point
│   ├── exportSchedule.ts            # Schedule export logic (Excel generation)
│   ├── routes/                      # API routes
│   ├── middleware/                  # Express middleware
│   └── ...
│
├── shared/                          # Shared types/utilities
│   └── types.ts                     # Shared TypeScript types
│
├── scripts/                         # Utility scripts
│   └── ...
│
├── templates/                       # Excel template files
│   ├── Student_schedule.xlsx        # Schedule template
│   └── ...
│
├── exports/                         # Generated export files (runtime)
│   └── ...
│
├── LICENSE                          # MIT License
├── FOLDER_STRUCTURE.md              # This file
├── package.json                     # Project dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
├── tailwind.config.ts               # Tailwind CSS configuration
├── vite.config.ts                   # Vite build configuration
├── drizzle.config.ts                # Database configuration
└── README.md                        # Project documentation

```

---

## 🔑 Key Features

### Frontend (`client/`)
- **React 18** with TypeScript
- **Vite** for fast development & builds
- **Tailwind CSS** for styling
- **shadcn/ui** for component library
- **Dark/Light theme** toggle
- **Google AdSense** integration (sidebar + footer)
- **Excel file parsing** for student data import
- **Responsive design** (mobile, tablet, desktop)

### Backend (`server/`)
- **Express.js** REST API
- **Excel generation** (ExcelJS) for schedule exports
- **Database** integration (Drizzle ORM)
- **File handling** for templates and exports

### Ad Integration
- **AdSense script loader** in `main.tsx`
- **AdBanner component** for flexible ad placement
- **AdSidebar**: Right sidebar ads (300x600, 300x300)
- **AdFooter**: Footer horizontal ads (728x90)
- **AdContentTop**: Optional top-of-content ads (728x90)

---

## 📝 Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, project metadata |
| `tsconfig.json` | TypeScript compiler options |
| `tailwind.config.ts` | Tailwind CSS theme & plugins |
| `vite.config.ts` | Vite build & dev server config |
| `drizzle.config.ts` | Database ORM configuration |
| `LICENSE` | MIT License |

---

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Production
```bash
npm run start
```

### Database
```bash
npm run db:push
```

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

**Copyright © 2025 SchoolRanker Project**

---

## 🌐 AdSense Setup

To enable Google AdSense:

1. Replace `YOUR_ADSENSE_CLIENT_ID` in:
   - `client/src/main.tsx`
   - `client/src/components/AdBanner.tsx`

2. Replace slot IDs in:
   - `client/src/components/AdSidebar.tsx` (SIDEBAR_SLOT_1, SIDEBAR_SLOT_2)
   - `client/src/components/AdFooter.tsx` (FOOTER_SLOT_1)
   - `client/src/components/AdContentTop.tsx` (CONTENT_TOP_SLOT)

3. Remove placeholder `<div>` content from AdBanner components

---

## 📞 Support

For issues or questions, please refer to the project documentation or contact the development team.
