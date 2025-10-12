document.addEventListener('DOMContentLoaded', function () {
    // --- Global App State ---
    let appData = { classes: [] };
    let uploadedFile = null;
    let studentDataForProcessing = null;
    let isFileUploaded = false; // Flag to prevent double-upload bug

    // --- UI Elements ---
    const wrapper = document.querySelector('.wrapper');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarLinks = document.querySelectorAll('#sidebar .nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    const sectionsMap = {};
    contentSections.forEach(section => { sectionsMap[section.id] = section; });
    const loadingOverlay = document.getElementById('loading-overlay');
    const alertContainer = document.getElementById('alert-container');

    // --- Setup Page UI Elements ---
    const teacherNameInput = document.getElementById('teacher-name');
    const directorateNameInput = document.getElementById('directorate-name');
    const schoolNameInput = document.getElementById('school-name');
    const townNameInput = document.getElementById('town-name');
    const homeroomTeacherSwitch = document.getElementById('homeroom-teacher-switch');
    const homeroomTeacherSelection = document.getElementById('homeroom-teacher-selection');
    const homeroomClassSelect = document.getElementById('homeroom-class-select');
    const classSubjectContainer = document.getElementById('class-subject-container');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    const printCoverBtn = document.getElementById('print-cover-btn');
    const processMainGradebookBtn = document.getElementById('process-main-gradebook-btn');

    // --- Settings Logic ---
    function resetSettings() {
        if (!confirm('هل أنت متأكد أنك تريد مسح جميع التجهيزات المحفوظة؟')) {
            return;
        }
        localStorage.removeItem('appSettings');
        appData = { classes: [] };
        studentDataForProcessing = null;
        uploadedFile = null;
        isFileUploaded = false; // Reset the flag
        teacherNameInput.value = '';
        directorateNameInput.value = '';
        schoolNameInput.value = '';
        townNameInput.value = '';
        homeroomTeacherSwitch.checked = false;
        homeroomTeacherSelection.classList.add('d-none');
        document.querySelector('#setup-drop-zone .file-name').textContent = '';
        document.getElementById('setup-file-input').value = '';
        populateSetupUI();
        showAlert('تم مسح جميع التجهيزات بنجاح.', 'success');
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            teacherNameInput.value = settings.teacherName || '';
            directorateNameInput.value = settings.directorateName || '';
            schoolNameInput.value = settings.schoolName || '';
            townNameInput.value = settings.townName || '';
            homeroomTeacherSwitch.checked = settings.isHomeroomTeacher || false;
            
            if (settings.classes && settings.classes.length > 0) {
                appData.classes = settings.classes;
                populateSetupUI();
            }

            if (settings.isHomeroomTeacher) {
                homeroomTeacherSelection.classList.remove('d-none');
                setTimeout(() => {
                    homeroomClassSelect.value = settings.homeroomClassId || '';
                }, 0);
            }
        }
    }

    function saveSettings() {
        const groupedClasses = {};
        appData.classes.forEach(cls => {
            if (!groupedClasses[cls.class]) {
                groupedClasses[cls.class] = [];
            }
            groupedClasses[cls.class].push(cls);
        });

        const updatedClasses = [];
        Object.values(groupedClasses).forEach(divisions => {
            divisions.forEach(div => {
                const subjectInputs = document.querySelectorAll(`.subject-input[data-id='${div.id}']`);
                const subjects = Array.from(subjectInputs).map(input => input.value).filter(Boolean);
                updatedClasses.push({ ...div, subjects: subjects });
            });
        });

        const settings = {
            teacherName: teacherNameInput.value,
            directorateName: directorateNameInput.value,
            schoolName: schoolNameInput.value,
            townName: townNameInput.value,
            isHomeroomTeacher: homeroomTeacherSwitch.checked,
            homeroomClassId: homeroomClassSelect.value,
            classes: updatedClasses
        };

        localStorage.setItem('appSettings', JSON.stringify(settings));
        appData.classes = updatedClasses; // Update global state
        showAlert('تم حفظ التجهيزات بنجاح!', 'success');
    }

    function addSubjectInput(container, divisionId) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group mb-1';
        inputGroup.innerHTML = `
            <input type="text" class="form-control subject-input" data-id="${divisionId}" placeholder="أدخل اسم المادة">
            <button class="btn btn-outline-danger btn-sm remove-subject-btn" type="button"><i class="fas fa-times"></i></button>
        `;
        container.appendChild(inputGroup);
        inputGroup.querySelector('.remove-subject-btn').addEventListener('click', function() {
            inputGroup.remove();
        });
    }

    function populateSetupUI() {
        if (!appData.classes || appData.classes.length === 0) {
            classSubjectContainer.innerHTML = '<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>لم يتم استخلاص أي صفوف بعد. يرجى رفع ملف في الأعلى.</div>';
            return;
        }

        classSubjectContainer.innerHTML = '';
        homeroomClassSelect.innerHTML = '<option value="" disabled selected>اختر صفك...</option>';

        const groupedClasses = {};
        appData.classes.forEach(cls => {
            if (!groupedClasses[cls.class]) {
                groupedClasses[cls.class] = [];
            }
            groupedClasses[cls.class].push(cls);
        });

        Object.entries(groupedClasses).forEach(([className, divisions]) => {
            const classCard = document.createElement('div');
            classCard.className = 'card mb-2';
            classCard.innerHTML = `<div class="card-header py-2"><strong>الصف: ${className}</strong></div>`;
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body py-2';

            divisions.forEach(div => {
                const divisionContainer = document.createElement('div');
                divisionContainer.className = 'mb-2';
                divisionContainer.innerHTML = `<h6>الشعبة: ${div.division}</h6>`;
                
                const subjectsContainer = document.createElement('div');
                subjectsContainer.id = `subjects-for-${div.id}`;

                if (div.subjects && div.subjects.length > 0) {
                    div.subjects.forEach(subject => {
                        const inputGroup = document.createElement('div');
                        inputGroup.className = 'input-group mb-1';
                        inputGroup.innerHTML = `
                            <input type="text" class="form-control subject-input" data-id="${div.id}" value="${subject}" placeholder="أدخل اسم المادة">
                            <button class="btn btn-outline-danger btn-sm remove-subject-btn" type="button"><i class="fas fa-times"></i></button>
                        `;
                        subjectsContainer.appendChild(inputGroup);
                        inputGroup.querySelector('.remove-subject-btn').addEventListener('click', function() { inputGroup.remove(); });
                    });
                } else {
                    addSubjectInput(subjectsContainer, div.id);
                }

                const addBtn = document.createElement('button');
                addBtn.className = 'btn btn-outline-primary btn-sm mt-1';
                addBtn.innerHTML = '<i class="fas fa-plus me-1"></i> إضافة مادة أخرى';
                addBtn.addEventListener('click', () => addSubjectInput(subjectsContainer, div.id));

                divisionContainer.appendChild(subjectsContainer);
                divisionContainer.appendChild(addBtn);
                cardBody.appendChild(divisionContainer);

                const option = document.createElement('option');
                option.value = div.id;
                option.textContent = `${div.class} - ${div.division}`;
                homeroomClassSelect.appendChild(option);
            });

            classCard.appendChild(cardBody);
            classSubjectContainer.appendChild(classCard);
        });
    }

    // --- Event Listeners ---
    homeroomTeacherSwitch.addEventListener('change', function() {
        homeroomTeacherSelection.classList.toggle('d-none', !this.checked);
    });

    saveSettingsBtn.addEventListener('click', saveSettings);
    resetSettingsBtn.addEventListener('click', resetSettings);
    printCoverBtn.addEventListener('click', generateCoverFile);
    processMainGradebookBtn.addEventListener('click', () => {
        console.log('[DEBUG] Main gradebook button CLICKED. Calling generateMainGradebook...');
        generateMainGradebook();
    });


    // --- Sidebar Toggle Logic ---
    sidebarToggle.addEventListener('click', () => {
        wrapper.classList.toggle('sidebar-collapsed');
    });

    // --- Navigation Logic ---
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            contentSections.forEach(section => { if (!section.classList.contains('d-none')) { section.classList.add('d-none'); } });
            const targetSection = sectionsMap[this.getAttribute('data-target')];
            if (targetSection) { targetSection.classList.remove('d-none'); }
        });
    });
    document.querySelector('#sidebar .nav-link[data-target="settings"]').click();

    // --- UI Helpers ---
    const showLoader = () => loadingOverlay.classList.remove('d-none');
    const hideLoader = () => loadingOverlay.classList.add('d-none');

    function showAlert(message, type = 'success') {
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-times-circle';
        const color = type === 'success' ? '#198754' : '#dc3545';

        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert-custom';
        alertDiv.style.backgroundColor = '#fff';
        alertDiv.style.borderRight = `5px solid ${color}`;
        alertDiv.innerHTML = `
            <i class="fas ${icon} alert-icon" style="color: ${color};"></i>
            <div>${message}</div>
        `;
        alertContainer.appendChild(alertDiv);
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    // --- Drag and Drop Logic ---
    function setupDropZone(dropZoneId, inputId) {
        const dropZone = document.getElementById(dropZoneId);
        const input = document.getElementById(inputId);
        const fileNameDisplay = dropZone.querySelector('.file-name');

        const fileHandler = (file) => {
            if (file) {
                fileNameDisplay.textContent = file.name;
                dropZone.classList.add('has-file');
                uploadedFile = file;
                isFileUploaded = true; // Set the flag
                loadFileAndProcess(file);
            }
        };

        dropZone.addEventListener('click', () => {
            if (!isFileUploaded) { // Only allow click if no file is uploaded
                input.click();
            }
        });
        input.addEventListener('change', () => fileHandler(input.files[0]));
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length && !isFileUploaded) { // Only allow drop if no file is uploaded
                input.files = e.dataTransfer.files;
                fileHandler(e.dataTransfer.files[0]);
            }
        });
    }
    setupDropZone('setup-drop-zone', 'setup-file-input');

    // --- File Processing Logic ---
    async function loadFileAndProcess(file) {
        if (!file) return;
        showLoader();
        setTimeout(async () => {
            try {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data, { type: 'array' });
                extractDataFromWorkbook(workbook);
                showAlert('تم استخلاص البيانات من الملف بنجاح.', 'success');
            } catch (error) {
                console.error('Critical Error Reading File:', error);
                showAlert('حدث خطأ فادح أثناء قراءة الملف.', 'danger');
            } finally {
                hideLoader();
            }
        }, 50);
    }

    function extractDataFromWorkbook(workbook) {
        let studentData = {};
        const existingClasses = new Set(appData.classes.map(c => c.id));

        const targetString = 'العام الدراسي';
        workbook.SheetNames.forEach(sheetName => {
            const ws = workbook.Sheets[sheetName];
            if (!ws) return;
            const getVal = (cellRef) => {
                if (!cellRef) return null;
                const cellAddress = XLSX.utils.decode_cell(cellRef);
                let cell = ws[cellRef];
                if (ws['!merges']) {
                    for (const merge of ws['!merges']) {
                        if (cellAddress.r >= merge.s.r && cellAddress.r <= merge.e.r && cellAddress.c >= merge.s.c && cellAddress.c <= merge.e.c) {
                            cell = ws[XLSX.utils.encode_cell(merge.s)];
                            break;
                        }
                    }
                }
                return cell ? (cell.w || cell.v) : null;
            };
            
            let layoutConfig = null;
            for (const cellAddress in ws) {
                if (cellAddress[0] === '!') continue;
                const cellValue = (ws[cellAddress].w || ws[cellAddress].v);
                if (cellValue && typeof cellValue === 'string' && cellValue.trim().includes(targetString)) {
                     if (cellAddress.startsWith('I5')) {
                        layoutConfig = { classCell: 'D7', divisionCell: 'D15', startRow: 21 };
                    } else if (cellAddress.startsWith('I4')) {
                        layoutConfig = { classCell: 'D6', divisionCell: 'D14', startRow: 20 };
                    }
                    break;
                }
            }

            if (layoutConfig) {
                const classInfo = getVal(layoutConfig.classCell);
                const divisionInfo = getVal(layoutConfig.divisionCell);
                if (classInfo && divisionInfo) {
                    const classId = `${classInfo}-${divisionInfo}`;
                    
                    if (!existingClasses.has(classId)) {
                        appData.classes.push({
                            id: classId,
                            class: classInfo,
                            division: divisionInfo,
                            subjects: []
                        });
                        existingClasses.add(classId);
                    }

                    if (!studentData[classId]) {
                        studentData[classId] = { id: classId, class: classInfo, division: divisionInfo, names: [] };
                    }
                    
                    let names = [];
                    for (let i = layoutConfig.startRow; i < 500; i++) {
                        const name = getVal(`AE${i}`);
                        if (name && String(name).trim()) {
                            names.push(String(name).trim());
                        } else {
                            if (i > layoutConfig.startRow) { break; }
                        }
                    }
                    studentData[classId].names.push(...names);
                }
            }
        });
        
        studentDataForProcessing = Object.values(studentData);
        populateSetupUI();
    }

    const processMarksBtn = document.getElementById('process-marks-btn');
    const processPerfBtn = document.getElementById('process-perf-btn');

    processMarksBtn.addEventListener('click', () => {
        processMarksFile(studentDataForProcessing);
    });

    processPerfBtn.addEventListener('click', () => {
        processPerfFile(studentDataForProcessing);
    });

    function processMarksFile(studentData) {
        if (!studentData || studentData.length === 0) {
            showAlert('الرجاء رفع ملف وتجهيز البيانات أولاً.', 'danger');
            return;
        }
        showLoader();
        setTimeout(() => generateMarksExcel(studentData), 50);
    }

    function processPerfFile(studentData) {
        if (!studentData || studentData.length === 0) {
            showAlert('الرجاء رفع ملف وتجهيز البيانات أولاً.', 'danger');
            return;
        }
        showLoader();
        setTimeout(() => generatePerfExcel(studentData), 50);
    }

    // --- File Generation Logic (using ExcelJS) ---
    function triggerDownload(buffer, fileName) {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    async function cloneSheet(templateSheet, targetWorkbook, newSheetName) {
        const newSheet = targetWorkbook.addWorksheet(newSheetName);
        newSheet.properties = templateSheet.properties;
        newSheet.views = templateSheet.views;
        newSheet.pageSetup = templateSheet.pageSetup;
        templateSheet.columns.forEach((column, index) => {
            const newCol = newSheet.getColumn(index + 1);
            newCol.width = column.width;
            newCol.style = column.style;
        });
        templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
            const newRow = newSheet.getRow(rowNumber);
            newRow.height = row.height;
            newRow.style = row.style;
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const newCell = newRow.getCell(colNumber);
                newCell.value = cell.value;
                if (cell.style) {
                    newCell.font = cell.font ? Object.assign({}, cell.font) : undefined;
                    newCell.alignment = cell.alignment ? Object.assign({}, cell.alignment) : undefined;
                    newCell.border = cell.border ? Object.assign({}, cell.border) : undefined;
                    newCell.fill = cell.fill ? Object.assign({}, cell.fill) : undefined;
                    newCell.numFmt = cell.numFmt ? cell.numFmt : undefined;
                }
            });
        });
        templateSheet.model.merges.forEach(merge => { newSheet.mergeCells(merge); });
        return newSheet;
    }

    async function generateCoverFile() {
        showLoader();
        try {
            const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            if (!savedSettings.classes || savedSettings.classes.length === 0) {
                showAlert('الرجاء حفظ التجهيزات أولاً.', 'warning');
                return;
            }

            const response = await fetch('cover.xlsx');
            const arrayBuffer = await response.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            const classesAndDivisions = [...new Set(savedSettings.classes.map(c => c.id.replace('-', ' ')))].join(' . ');
            const allSubjects = [...new Set(savedSettings.classes.flatMap(c => c.subjects))].join(' . ');

            workbook.worksheets.forEach(sheet => {
                sheet.getCell('B1').value = savedSettings.directorateName || '';
                sheet.getCell('B2').value = savedSettings.schoolName || '';
                sheet.getCell('B5').value = classesAndDivisions;
                sheet.getCell('B7').value = allSubjects;
                sheet.getCell('B10').value = savedSettings.teacherName || '';
            });

            const buffer = await workbook.xlsx.writeBuffer();
            triggerDownload(buffer, 'ملف_الغلاف.xlsx');
            showAlert('تم إنشاء ملف الغلاف بنجاح!', 'success');

        } catch (error) {
            console.error('Error generating cover file:', error);
            showAlert('حدث خطأ أثناء إنشاء ملف الغلاف.', 'danger');
        } finally {
            hideLoader();
        }
    }

    async function generateMainGradebook() {
        showLoader();
        try {
            const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{');
            if (!savedSettings.classes || savedSettings.classes.length === 0) throw new Error('الرجاء حفظ التجهيزات أولاً.');
            if (!studentDataForProcessing) throw new Error('الرجاء رفع ملف كشف الطلبة أولاً.');

            const response = await fetch('mark_o.xlsx');
            const arrayBuffer = await response.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            // --- Populate Headers ---
            const classesWithSubjects = savedSettings.classes.filter(c => c.subjects && c.subjects.length > 0);
            const classesAndDivisions = [...new Set(classesWithSubjects.map(c => c.id.replace('-', ' ')))].join(', ');
            const allSubjects = [...new Set(classesWithSubjects.flatMap(c => c.subjects))].join(', ');
            [workbook.worksheets[1], workbook.worksheets[2]].forEach(sheet => {
                if (sheet) {
                    sheet.getCell('B1').value = savedSettings.directorateName || '';
                    sheet.getCell('B2').value = savedSettings.townName || '';
                    sheet.getCell('B3').value = savedSettings.schoolName || '';
                    sheet.getCell('B4').value = classesAndDivisions;
                    sheet.getCell('B5').value = allSubjects;
                    sheet.getCell('B6').value = savedSettings.teacherName || '';
                }
            });

            // --- FINAL CORRECTED STRATEGY: All operations on the Index Sheet ---
            const refMap = new Map(); // Map<referenceNumber, {sheet: Worksheet, row: number}>
            const sheetsToSearch = [workbook.worksheets[0], workbook.worksheets[1]];

            sheetsToSearch.forEach(sheet => {
                if (!sheet) return;
                for (let i = 1; i <= 1000; i++) {
                    const processCell = (cell) => {
                        if (!cell || !cell.value) return;
                        let value;
                        if (typeof cell.value === 'object' && cell.value.result) {
                            value = cell.value.result;
                        } else {
                            value = cell.value;
                        }
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue) && !refMap.has(numValue)) {
                            refMap.set(numValue, { sheet: sheet, row: i });
                        }
                    };
                    processCell(sheet.getCell(`J${i}`));
                    processCell(sheet.getCell(`K${i}`));
                }
            });

            if (refMap.size === 0) throw new Error("Could not find any reference numbers in the index sheets.");

            const sortedRefs = Array.from(refMap.keys()).sort((a, b) => a - b);
            let lastUsedRef = 0;

            function findNextAvailableRef(minRef) {
                const ref = sortedRefs.find(r => r >= minRef);
                return ref === undefined ? null : ref;
            }

            // --- Main Processing Loop ---
            ProcessingLoop: // Label for breaking out of all loops
            for (let classIdx = 0; classIdx < savedSettings.classes.length; classIdx++) {
                const classSetting = savedSettings.classes[classIdx];

                if (!classSetting.subjects || classSetting.subjects.length === 0) continue;
                const classGroup = studentDataForProcessing.find(d => d.id === classSetting.id);
                if (!classGroup) continue;

                for (let subjectIdx = 0; subjectIdx < classSetting.subjects.length; subjectIdx++) {
                    const subject = classSetting.subjects[subjectIdx];

                    let studentsToProcess = [...classGroup.names];
                    if (studentsToProcess.length === 0) continue;

                    let studentStartIndex = 0;

                    const targetStartRef = (lastUsedRef === 0) ? 1 : lastUsedRef + 2;
                    let currentRef = findNextAvailableRef(targetStartRef);
                    if (currentRef === null) {
                        // No more space for any new subjects, break all loops and save.
                        break ProcessingLoop;
                    }

                    while (studentsToProcess.length > 0) {
                        const currentSlot = refMap.get(currentRef);
                        const currentSheet = currentSlot.sheet;
                        const currentRow = currentSlot.row;

                        currentSheet.getCell(`D${currentRow}`).value = `الصف: ${classGroup.class}`;
                        currentSheet.getCell(`I${currentRow}`).value = `الشعبة (${classGroup.division})`;

                        const subjectRefTarget = currentRef + 1;
                        const subjectRef = findNextAvailableRef(subjectRefTarget);
                        if (subjectRef !== null) {
                            const subjectSlot = refMap.get(subjectRef);
                            subjectSlot.sheet.getCell(`O${subjectSlot.row}`).value = subject;
                        }

                        const studentsForThisPage = studentsToProcess.splice(0, 25);
                        const studentStartRow = currentRow + 5;
                        
                        studentsForThisPage.forEach((name, index) => {
                            currentSheet.getCell(`A${studentStartRow + index}`).value = studentStartIndex + index + 1;
                            currentSheet.getCell(`B${studentStartRow + index}`).value = name;
                        });
                        studentStartIndex += studentsForThisPage.length;

                        lastUsedRef = currentRef;

                        if (studentsToProcess.length > 0) { // Overflow
                            const targetOverflowRef = currentRef + 2;
                            currentRef = findNextAvailableRef(targetOverflowRef);
                            if (currentRef === null) {
                                // Ran out of references, stop processing and save.
                                break ProcessingLoop;
                            }
                        }
                    } // End while

                    // After a subject is finished, check for the special end condition
                    console.log(`[DEBUG] Subject finished. Last used ref: ${lastUsedRef}, Final available ref: ${sortedRefs[sortedRefs.length - 1]}`);
                    if (lastUsedRef === sortedRefs[sortedRefs.length - 1]) {
                        let nextSubject = null;
                        // Try to find next subject in the same class
                        if (subjectIdx + 1 < classSetting.subjects.length) {
                            nextSubject = classSetting.subjects[subjectIdx + 1];
                        } else if (classIdx + 1 < savedSettings.classes.length) {
                            // Try to find first subject in the next class
                            const nextClassSetting = savedSettings.classes[classIdx + 1];
                            if (nextClassSetting.subjects && nextClassSetting.subjects.length > 0) {
                                nextSubject = nextClassSetting.subjects[0];
                            }
                        }

                        console.log(`[DEBUG] Found next subject to be: ${nextSubject}`);
                        if (nextSubject) {
                            const sheet2 = workbook.worksheets[1];
                            if (sheet2) {
                                sheet2.getCell('O32').value = nextSubject;
                            }
                        }
                        // Stop all processing after handling the final ref
                        break ProcessingLoop;
                    }
                } // End for subject
            } // End for class

            const buffer = await workbook.xlsx.writeBuffer();
            triggerDownload(buffer, 'دفتر_العلامات_الرئيسي_النهائي.xlsx');
            showAlert('تم إنشاء الدفتر الرئيسي بنجاح!', 'success');

        } catch (error) {
            console.error('Error generating main gradebook file:', error);
            showAlert(error.message, 'danger');
        } finally {
            hideLoader();
        }
    }

    async function generateMarksExcel(allStudentData) {
        try {
            const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            if (!savedSettings.classes || savedSettings.classes.length === 0) {
                showAlert('الرجاء تكوين المواد في صفحة التجهيزات أولاً.', 'danger');
                return;
            }

            const response = await fetch('mark_s.xlsx');
            const arrayBuffer = await response.arrayBuffer();
            const templateWorkbook = new ExcelJS.Workbook();
            await templateWorkbook.xlsx.load(arrayBuffer);
            const templateSheet = templateWorkbook.worksheets[0];
            
            const outputWorkbook = new ExcelJS.Workbook();
            if (templateWorkbook.creator) {
                outputWorkbook.creator = templateWorkbook.creator;
            }

            let sheetGenerated = false;
            for (const classSetting of savedSettings.classes) {
                if (classSetting.subjects && classSetting.subjects.length > 0) {
                    const classGroup = allStudentData.find(d => d.id === classSetting.id);
                    if (!classGroup) continue;

                    for (const subject of classSetting.subjects) {
                        const sheetName = `${classGroup.class} - ${classGroup.division} - ${subject}`.substring(0, 31);
                        const newSheet = await cloneSheet(templateSheet, outputWorkbook, sheetName);
                        
                        newSheet.getCell('B2').value = classGroup.class;
                        newSheet.getCell('F2').value = classGroup.division;
                        newSheet.getCell('B3').value = savedSettings.teacherName || '';
                        newSheet.getCell('K2').value = subject;

                        classGroup.names.forEach((name, index) => {
                            newSheet.getCell(`B${7 + index}`).value = name;
                        });

                        sheetGenerated = true;
                    }
                }
            }

            if (!sheetGenerated) {
                showAlert('لم يتم العثور على مواد مجهزة لإنشاء السجلات.', 'warning');
                return;
            }

            const buffer = await outputWorkbook.xlsx.writeBuffer();
            triggerDownload(buffer, 'سجلات_العلامات_النهائية.xlsx');
            showAlert('تم إنشاء ملف سجلات العلامات بنجاح!', 'success');
        } catch (error) {
            console.error('Error generating marks excel file with ExcelJS:', error);
            showAlert('حدث خطأ أثناء إنشاء ملف الإكسل.', 'danger');
        } finally {
            hideLoader();
        }
    }

    async function generatePerfExcel(allStudentData) {
        try {
            const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            if (!savedSettings.classes || savedSettings.classes.length === 0) {
                showAlert('الرجاء تكوين المواد في صفحة التجهيزات أولاً.', 'danger');
                return;
            }

            const response = await fetch('adaa.xlsx');
            const arrayBuffer = await response.arrayBuffer();
            const templateWorkbook = new ExcelJS.Workbook();
            await templateWorkbook.xlsx.load(arrayBuffer);
            const templateSheet = templateWorkbook.worksheets[0];

            const outputWorkbook = new ExcelJS.Workbook();
            if (templateWorkbook.creator) {
                outputWorkbook.creator = templateWorkbook.creator;
            }

            let sheetGenerated = false;
            for (const classSetting of savedSettings.classes) {
                if (classSetting.subjects && classSetting.subjects.length > 0) {
                    const classGroup = allStudentData.find(d => d.id === classSetting.id);
                    if (!classGroup) continue;

                    for (const subject of classSetting.subjects) {
                        const sheetName = `${classGroup.class} - ${classGroup.division} - ${subject}`.substring(0, 31);
                        const newSheet = await cloneSheet(templateSheet, outputWorkbook, sheetName);
                        
                        newSheet.getCell('B1').value = `الصف: ${classGroup.class}`;
                        newSheet.getCell('B2').value = `الشعبة: ${classGroup.division}`;
                        newSheet.getCell('B3').value = `المادة: ${subject}`;

                        classGroup.names.forEach((name, index) => {
                            newSheet.getCell(`B${6 + index}`).value = name;
                        });

                        sheetGenerated = true;
                    }
                }
            }

            if (!sheetGenerated) {
                showAlert('لم يتم العثور على مواد مجهزة لإنشاء السجلات.', 'warning');
                return;
            }

            const buffer = await outputWorkbook.xlsx.writeBuffer();
            triggerDownload(buffer, 'سجلات_الأداء_النهائية.xlsx');
            showAlert('تم إنشاء ملف سجلات الأداء والملاحظة بنجاح!', 'success');
        } catch (error) {
            console.error('Error generating performance excel file with ExcelJS:', error);
            showAlert('حدث خطأ أثناء إنشاء ملف الإكسل.', 'danger');
        } finally {
            hideLoader();
        }
    }
    
    // Initial Load
    loadSettings();
});