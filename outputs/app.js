const STORAGE_KEY = "cho-family-schedule-demo-v2";
    const HOMEWORK_KEY = "cho-family-homework-inbox-v1";
    const HOMEWORK_DONE_KEY = "cho-family-homework-completed-v1";
    const HOMEWORK_ITEMS_KEY = "cho-family-homework-items-v1";
    const FAMILY_KEY = "cho-family-settings-v1";
    const HOLIDAY_KEY = "cho-family-holidays-v1";
    const TEMPLATE_KEY = "cho-family-templates-v1";
    const AUTH_KEY = "cho-family-admin-session-v1";
    const ADMIN_PASSWORD = "admin1234";
    const AppStorage = {
      get(key, fallback, isValid = value => value != null) {
        try {
          const saved = JSON.parse(localStorage.getItem(key));
          if (isValid(saved)) return saved;
        } catch (error) {
          localStorage.removeItem(key);
        }
        return typeof fallback === "function" ? fallback() : fallback;
      },
      set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
      },
      remove(...keys) {
        keys.forEach(key => localStorage.removeItem(key));
      }
    };

    const HttpClient = {
      enabled: location.protocol === "http:" || location.protocol === "https:",
      request(method, url, payload) {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, false);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(payload ? JSON.stringify(payload) : null);
        if (xhr.status < 200 || xhr.status >= 300) throw new Error(`HTTP ${xhr.status}`);
        return xhr.responseText ? JSON.parse(xhr.responseText) : null;
      }
    };
    const defaultChildren = [
      { name: "민지", color: "#ffe07b", initial: "민" },
      { name: "준호", color: "#8bd7c8", initial: "준" },
      { name: "서윤", color: "#ffa18e", initial: "서" }
    ];
    const defaultGuardians = ["엄마", "아빠", "이모"];
    const defaultSchedules = [
      { id: "s1", child: "민지", title: "학교", time: "08:30 - 13:20", start: 90, dur: 210, lane: 0, type: "school", drop: "엄마", pick: "이모" },
      { id: "s2", child: "준호", title: "학교", time: "08:40 - 13:10", start: 95, dur: 205, lane: 1, type: "school", drop: "아빠", pick: "엄마" },
      { id: "s3", child: "서윤", title: "학교", time: "09:00 - 12:50", start: 110, dur: 185, lane: 2, type: "school", drop: "이모", pick: "엄마" },
      { id: "s4", child: "준호", title: "태권도", time: "15:20 - 16:20", start: 365, dur: 60, lane: 1, type: "academy", drop: "아빠", pick: "아빠" },
      { id: "s5", child: "민지", title: "피아노 숙제", time: "16:10 - 16:30", start: 415, dur: 30, lane: 0, type: "homework", drop: "엄마", pick: "아빠", changed: true },
      { id: "s6", child: "서윤", title: "저녁 식사", time: "18:20 - 19:00", start: 555, dur: 44, lane: 2, type: "meal", drop: "엄마", pick: "엄마" },
      { id: "s7", child: "민지", title: "여가시간", time: "20:00 - 20:35", start: 660, dur: 42, lane: 0, type: "leisure", drop: "가족", pick: "가족" }
    ];

    const defaultTemplates = {
      school: { type: "school", title: "학교", start: 90, dur: 210, child: "민지", drop: "엄마", pick: "이모", weekdays: ["월", "화", "수", "목", "금"], holidaySkip: true, lane: 0 },
      academy: { type: "academy", title: "학원", start: 570, dur: 60, child: "준호", drop: "아빠", pick: "아빠", weekdays: ["화", "목"], holidaySkip: true, lane: 1 },
      homework: { type: "homework", title: "숙제", start: 600, dur: 30, child: "민지", drop: "엄마", pick: "엄마", weekdays: ["월", "화", "수", "목", "금"], holidaySkip: false, lane: 0 }
    };

    const todos = [
      ["민지", "피아노 숙제", "16:10 · 오늘 변경됨", "숙제"],
      ["준호", "태권도 이동", "15:10 · 아빠 등원", "학원"],
      ["서윤", "독서 기록", "내일 아침까지", "완료"],
      ["민지", "영어 단어", "내일 등교 전", "대기"]
    ];

    const defaultHomeworkInboxItems = [
      { id: "hw1", child: "민지", title: "영어 단어", due: "내일", priority: "높음", duration: 15, time: "17:00 - 17:15", start: 600, dur: 15, lane: 0, drop: "엄마", pick: "엄마" },
      { id: "hw2", child: "준호", title: "과학 관찰일지", due: "오늘", priority: "보통", duration: 30, time: "17:10 - 17:40", start: 610, dur: 30, lane: 1, drop: "엄마", pick: "엄마" },
      { id: "hw3", child: "서윤", title: "독서 기록", due: "이번 주", priority: "낮음", duration: 10, time: "19:10 - 19:20", start: 730, dur: 10, lane: 2, drop: "엄마", pick: "엄마" }
    ];

    function normalizeHomeworkItems(items) {
      return items.map((item, index) => {
        const fallback = defaultHomeworkInboxItems[index] || defaultHomeworkInboxItems[0];
        const duration = Number(item.duration || item.dur || fallback.duration);
        return {
          ...fallback,
          ...item,
          due: item.due || fallback.due,
          priority: item.priority || fallback.priority,
          duration,
          dur: duration
        };
      });
    }

    const ScheduleApi = {
      adapter: HttpClient.enabled ? "http" : "localStorage",
      defaults() {
        return {
          schedules: defaultSchedules.map(item => ({ ...item })),
          homeworkItems: defaultHomeworkInboxItems.map(item => ({ ...item })),
          placedHomeworkIds: [],
          completedHomeworkIds: [],
          family: {
            children: defaultChildren.map(item => ({ ...item })),
            guardians: [...defaultGuardians]
          },
          holidays: [],
          templates: Object.fromEntries(Object.entries(defaultTemplates).map(([key, value]) => [key, { ...value, weekdays: [...value.weekdays] }]))
        };
      },
      loadSnapshot() {
        const fallback = this.defaults();
        if (HttpClient.enabled) {
          try {
            return HttpClient.request("GET", "/api/snapshot");
          } catch (error) {
            this.adapter = "localStorage-fallback";
          }
        }
        return {
          schedules: AppStorage.get(STORAGE_KEY, fallback.schedules, value => Array.isArray(value) && value.length),
          homeworkItems: AppStorage.get(HOMEWORK_ITEMS_KEY, fallback.homeworkItems, value => Array.isArray(value) && value.length),
          placedHomeworkIds: AppStorage.get(HOMEWORK_KEY, fallback.placedHomeworkIds, Array.isArray),
          completedHomeworkIds: AppStorage.get(HOMEWORK_DONE_KEY, fallback.completedHomeworkIds, Array.isArray),
          family: AppStorage.get(FAMILY_KEY, fallback.family, value => value?.children?.length && value?.guardians?.length),
          holidays: AppStorage.get(HOLIDAY_KEY, fallback.holidays, Array.isArray),
          templates: AppStorage.get(TEMPLATE_KEY, fallback.templates, value => value?.school && value?.academy && value?.homework)
        };
      },
      saveSnapshot(snapshot) {
        if (HttpClient.enabled) {
          try {
            HttpClient.request("PUT", "/api/snapshot", snapshot);
            this.adapter = "http";
            document.documentElement.dataset.apiAdapter = this.adapter;
            return;
          } catch (error) {
            this.adapter = "localStorage-fallback";
            document.documentElement.dataset.apiAdapter = this.adapter;
          }
        }
        AppStorage.set(STORAGE_KEY, snapshot.schedules);
        AppStorage.set(HOMEWORK_ITEMS_KEY, snapshot.homeworkItems);
        AppStorage.set(HOMEWORK_KEY, snapshot.placedHomeworkIds);
        AppStorage.set(HOMEWORK_DONE_KEY, snapshot.completedHomeworkIds);
        AppStorage.set(FAMILY_KEY, snapshot.family);
        AppStorage.set(HOLIDAY_KEY, snapshot.holidays);
        AppStorage.set(TEMPLATE_KEY, snapshot.templates);
      },
      resetSnapshot() {
        if (HttpClient.enabled) {
          try {
            const snapshot = HttpClient.request("POST", "/api/snapshot/reset");
            this.adapter = "http";
            document.documentElement.dataset.apiAdapter = this.adapter;
            return snapshot;
          } catch (error) {
            this.adapter = "localStorage-fallback";
            document.documentElement.dataset.apiAdapter = this.adapter;
          }
        }
        AppStorage.remove(STORAGE_KEY, HOMEWORK_ITEMS_KEY, HOMEWORK_KEY, HOMEWORK_DONE_KEY, FAMILY_KEY, HOLIDAY_KEY, TEMPLATE_KEY);
        return this.defaults();
      }
    };

    const AdminApi = {
      login(password) {
        if (HttpClient.enabled) {
          try {
            return HttpClient.request("POST", "/api/admin/login", { password }).ok === true;
          } catch (error) {
            return false;
          }
        }
        return password === ADMIN_PASSWORD;
      }
    };

    const initialSnapshot = ScheduleApi.loadSnapshot();
    let schedules = initialSnapshot.schedules;
    let homeworkInboxItems = normalizeHomeworkItems(initialSnapshot.homeworkItems || ScheduleApi.defaults().homeworkItems);
    let placedHomeworkIds = initialSnapshot.placedHomeworkIds;
    let completedHomeworkIds = initialSnapshot.completedHomeworkIds;
    let family = initialSnapshot.family;
    let holidays = initialSnapshot.holidays;
    let templates = initialSnapshot.templates || ScheduleApi.defaults().templates;
    let currentFilter = "all";
    let selectedId = "s5";
    let selectedRange = "only";
    let currentView = "day";
    let activeAdmin = "today";
    let activeTemplate = "school";
    let isAdminAuthed = loadAdminSession();
    let selectedHolidayDate = 4;
    let recentActions = [];
    let toastTimer;
    const appState = {
      get schedules() { return schedules; },
      get homework() { return { homeworkInboxItems, placedHomeworkIds, completedHomeworkIds }; },
      get family() { return family; },
      get holidays() { return holidays; },
      get templates() { return templates; },
      get ui() { return { currentFilter, selectedId, selectedRange, currentView, activeAdmin, activeTemplate, isAdminAuthed, selectedHolidayDate }; }
    };
    window.choScheduleDemo = { state: appState, storage: AppStorage, api: ScheduleApi };
    document.documentElement.dataset.apiAdapter = ScheduleApi.adapter;

    const mainTimeline = document.querySelector("#mainTimeline");
    const adminTimeline = document.querySelector("#adminTimeline");
    const todoList = document.querySelector("#todoList");
    const storageNote = document.querySelector("#storageNote");
    const rangeModal = document.querySelector("#rangeModal");
    const quickPanel = document.querySelector(".quick-panel");
    const actionLog = document.querySelector("#actionLog");
    const changePreview = document.querySelector("#changePreview");
    const toast = document.querySelector("#toast");
    const homeworkInbox = document.querySelector("#homeworkInbox");
    const weekSummary = document.querySelector("#weekSummary");
    const monthSummary = document.querySelector("#monthSummary");
    const repeatToggle = document.querySelector("#repeatToggle");
    const repeatControls = document.querySelector("#repeatControls");
    const settingsPanel = document.querySelector("#settingsPanel");
    const childManageList = document.querySelector("#childManageList");
    const guardianManageList = document.querySelector("#guardianManageList");
    const holidayDateGrid = document.querySelector("#holidayDateGrid");
    const holidayList = document.querySelector("#holidayList");
    const adminMonthGrid = document.querySelector("#adminMonthGrid");
    const templateChild = document.querySelector("#templateChild");
    const templateTitle = document.querySelector("#templateTitle");
    const templateStart = document.querySelector("#templateStart");
    const templateDuration = document.querySelector("#templateDuration");
    const templateDrop = document.querySelector("#templateDrop");
    const templatePick = document.querySelector("#templatePick");
    const templatePreview = document.querySelector("#templatePreview");
    const authModal = document.querySelector("#authModal");
    const adminPasswordInput = document.querySelector("#adminPasswordInput");
    const authError = document.querySelector("#authError");
    const adminSession = document.querySelector("#adminSession");

    function loadSchedules() {
      return ScheduleApi.loadSnapshot().schedules;
    }

    function loadPlacedHomeworkIds() {
      return ScheduleApi.loadSnapshot().placedHomeworkIds;
    }

    function loadCompletedHomeworkIds() {
      return ScheduleApi.loadSnapshot().completedHomeworkIds;
    }

    function loadFamilySettings() {
      return ScheduleApi.loadSnapshot().family;
    }

    function loadHolidays() {
      return ScheduleApi.loadSnapshot().holidays;
    }

    function loadAdminSession() {
      return AppStorage.get(AUTH_KEY, false, value => typeof value === "boolean");
    }

    function persistAdminSession() {
      AppStorage.set(AUTH_KEY, isAdminAuthed);
      updateAdminAuthUi();
    }

    function updateAdminAuthUi() {
      adminSession.textContent = isAdminAuthed ? "Admin 로그인됨" : "Admin 잠김";
      document.querySelector("#logoutAdmin").classList.toggle("hidden", !isAdminAuthed);
    }

    function openAuthModal() {
      authError.textContent = "";
      adminPasswordInput.value = "";
      authModal.classList.remove("hidden");
      setTimeout(() => adminPasswordInput.focus(), 0);
    }

    function closeAuthModal() {
      authModal.classList.add("hidden");
      authError.textContent = "";
      adminPasswordInput.value = "";
    }

    function confirmAdminLogin() {
      if (!AdminApi.login(adminPasswordInput.value)) {
        authError.textContent = "비밀번호가 맞지 않습니다. 기본 비밀번호는 admin1234 입니다.";
        adminPasswordInput.focus();
        showToast("Admin 비밀번호를 다시 확인하세요.");
        return;
      }
      isAdminAuthed = true;
      persistAdminSession();
      closeAuthModal();
      setMode("admin");
      showToast("Admin 화면에 로그인했습니다.");
    }

    function logoutAdmin() {
      isAdminAuthed = false;
      persistAdminSession();
      setMode("main");
      showToast("Admin에서 로그아웃했습니다.");
    }

    function persist(message = "저장됨") {
      ScheduleApi.saveSnapshot({ schedules, homeworkItems: homeworkInboxItems, placedHomeworkIds, completedHomeworkIds, family, holidays, templates });
      storageNote.textContent = `${message} · 새로고침 후에도 유지됩니다.`;
    }

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
    }

    function addAction(message) {
      recentActions.unshift(message);
      recentActions = recentActions.slice(0, 4);
      actionLog.innerHTML = recentActions.map(item => `<div>${item}</div>`).join("");
    }

    function avatarClass(name) {
      if (name === "민지") return "minji";
      if (name === "준호") return "jun";
      if (name === "서윤") return "seo";
      return "";
    }

    function renderFamily() {
      const childStrip = document.querySelector(".child-strip");
      childStrip.innerHTML = family.children.map(child => {
        const id = child.name === "민지" ? "minji" : child.name === "준호" ? "jun" : child.name === "서윤" ? "seo" : `child-${child.name}`;
        return `
          <article class="child-card" data-child-card="${child.name}">
            <div class="avatar ${avatarClass(child.name)}" style="background:${child.color}"><span>${child.initial}</span></div>
            <div>
              <h3>${child.name}</h3>
              <p id="${id}Status">숙제 상태 계산 중</p>
              <div class="progress" id="${id}Progress" style="--value: 40%"><span></span></div>
            </div>
          </article>
        `;
      }).join("");

      document.querySelector('[aria-label="아이 필터"]').innerHTML = `
        <button class="chip ${currentFilter === "all" ? "active" : ""}" data-filter="all">전체</button>
        ${family.children.map(child => `<button class="chip ${currentFilter === child.name ? "active" : ""}" data-filter="${child.name}">${child.name}</button>`).join("")}
      `;
      bindFilterButtons();

      document.querySelector(".admin-left .tool-card:nth-of-type(2) .chip-row").innerHTML = `
        <button class="chip ${currentFilter === "all" ? "active" : ""}" data-admin-child-filter="all">전체</button>
        ${family.children.map(child => `<button class="chip ${currentFilter === child.name ? "active" : ""}" data-admin-child-filter="${child.name}">${child.name}</button>`).join("")}
      `;
      bindAdminChildFilters();

      childManageList.innerHTML = family.children.map((child, index) => `
        <div class="manage-item">
          <span class="color-dot" style="--dot-color:${child.color}"></span>
          <div><strong>${child.name}</strong><span>캐릭터 ${child.initial} · 일정 ${schedules.filter(item => item.child === child.name).length}개</span></div>
          <button class="tiny-action" data-remove-child="${index}">삭제</button>
        </div>
      `).join("");

      guardianManageList.innerHTML = family.guardians.map((name, index) => `
        <div class="manage-item">
          <span class="color-dot" style="--dot-color:#eef3f7"></span>
          <div><strong>${name}</strong><span>담당자 칩에 반영됨</span></div>
          <button class="tiny-action" data-remove-guardian="${index}">삭제</button>
        </div>
      `).join("");

      renderGuardianChips("drop");
      renderGuardianChips("pick");
      bindManagementButtons();
    }

    function renderAdminCalendar() {
      adminMonthGrid.innerHTML = Array.from({ length: 30 }, (_, index) => {
        const day = index + 1;
        const isActive = day === selectedHolidayDate;
        const holiday = holidays.find(item => item.day === day);
        return `<button class="${isActive ? "active" : ""}" data-admin-day="${day}" aria-label="6월 ${day}일">${day}${holiday ? "*" : ""}</button>`;
      }).join("");
      adminMonthGrid.querySelectorAll("[data-admin-day]").forEach(btn => {
        btn.addEventListener("click", () => {
          selectedHolidayDate = Number(btn.dataset.adminDay);
          renderAdminCalendar();
          renderHolidaySettings();
          showToast(`6월 ${selectedHolidayDate}일 일정으로 전환했습니다.`);
        });
      });
    }

    function bindAdminChildFilters() {
      document.querySelectorAll("[data-admin-child-filter]").forEach(btn => {
        btn.addEventListener("click", () => {
          document.querySelectorAll("[data-admin-child-filter]").forEach(item => item.classList.remove("active"));
          btn.classList.add("active");
          currentFilter = btn.dataset.adminChildFilter;
          document.querySelectorAll("[data-filter]").forEach(item => item.classList.toggle("active", item.dataset.filter === currentFilter));
          renderTimeline(mainTimeline);
          renderTimeline(adminTimeline, true);
          showToast(currentFilter === "all" ? "전체 아이 일정을 표시합니다." : `${currentFilter} 일정만 표시합니다.`);
        });
      });
    }

    function timeLabelFromStart(start) {
      const total = 7 * 60 + Number(start);
      return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    }

    function renderTemplateEditor() {
      const template = templates[activeTemplate] || templates.school;
      const names = { school: "학교 기본 템플릿", academy: "학원 반복 템플릿", homework: "숙제 템플릿" };
      document.querySelectorAll("[data-template-card]").forEach(card => {
        card.classList.toggle("active", card.dataset.templateCard === activeTemplate);
      });
      document.querySelector("#templateEditorTitle").textContent = `${names[activeTemplate]} 편집`;
      document.querySelector("#templateEditorMeta").textContent = `${template.weekdays.join("/")} · ${template.holidaySkip ? "휴일 제외" : "휴일 포함"}`;
      templateChild.innerHTML = family.children.map(child => `<option value="${child.name}">${child.name}</option>`).join("");
      templateDrop.innerHTML = family.guardians.map(name => `<option value="${name}">${name}</option>`).join("");
      templatePick.innerHTML = family.guardians.map(name => `<option value="${name}">${name}</option>`).join("");
      templateChild.value = family.children.some(child => child.name === template.child) ? template.child : family.children[0].name;
      templateTitle.value = template.title;
      templateStart.value = String(template.start);
      templateDuration.value = String(template.dur);
      templateDrop.value = family.guardians.includes(template.drop) ? template.drop : family.guardians[0];
      templatePick.value = family.guardians.includes(template.pick) ? template.pick : family.guardians[0];
      document.querySelectorAll("[data-template-day]").forEach(btn => {
        btn.classList.toggle("active", template.weekdays.includes(btn.dataset.templateDay));
      });
      document.querySelector("#templateHolidaySkip").classList.toggle("active", template.holidaySkip);
      updateTemplatePreview();
    }

    function collectTemplateDraft() {
      const base = templates[activeTemplate] || templates.school;
      const weekdays = [...document.querySelectorAll("[data-template-day].active")].map(btn => btn.dataset.templateDay);
      return {
        ...base,
        type: activeTemplate === "homework" ? "homework" : activeTemplate,
        child: templateChild.value,
        title: templateTitle.value.trim() || base.title,
        start: Number(templateStart.value),
        dur: Number(templateDuration.value),
        drop: templateDrop.value,
        pick: templatePick.value,
        weekdays: weekdays.length ? weekdays : ["월"],
        holidaySkip: document.querySelector("#templateHolidaySkip").classList.contains("active"),
        lane: activeTemplate === "academy" ? 1 : 0
      };
    }

    function updateTemplatePreview() {
      const draft = collectTemplateDraft();
      const endTotal = 7 * 60 + draft.start + draft.dur;
      const end = `${String(Math.floor(endTotal / 60)).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`;
      templatePreview.textContent = `${draft.child} · ${draft.title} / ${timeLabelFromStart(draft.start)} - ${end} / ${draft.weekdays.join("/")} · 등원 ${draft.drop} · 하원 ${draft.pick} · ${draft.holidaySkip ? "휴일 제외" : "휴일 포함"}`;
    }

    function saveTemplateBase() {
      const draft = collectTemplateDraft();
      templates[activeTemplate] = { ...draft, weekdays: [...draft.weekdays] };
      persist("템플릿 원본이 저장되었습니다");
      renderTemplateEditor();
      addAction(`${draft.title}: ${draft.weekdays.join("/")} 템플릿 저장`);
      showToast("템플릿을 저장했습니다.");
    }

    function createScheduleFromTemplate() {
      const draft = collectTemplateDraft();
      templates[activeTemplate] = { ...draft, weekdays: [...draft.weekdays] };
      const schedule = {
        id: `tpl-${activeTemplate}-${Date.now()}`,
        child: draft.child,
        title: draft.title,
        time: formatTimeFromText(timeLabelFromStart(draft.start), draft.dur),
        start: draft.start,
        dur: draft.dur,
        lane: draft.lane,
        type: draft.type,
        drop: draft.drop,
        pick: draft.pick,
        changed: true,
        rangeLabel: "템플릿 생성",
        recurrence: {
          enabled: true,
          type: "weekly",
          weekdays: [...draft.weekdays],
          holidaySkip: draft.holidaySkip,
          until: "none"
        }
      };
      schedules.push(schedule);
      selectedId = schedule.id;
      persist("템플릿에서 오늘 일정이 생성되었습니다");
      addAction(`${schedule.child} ${schedule.title}: 템플릿에서 오늘 일정 생성`);
      showToast("템플릿으로 오늘 일정을 만들었습니다.");
      setAdminSection("today", false);
      refreshAll();
      selectSchedule(schedule.id, true);
    }

    function renderGuardianChips(groupName) {
      const group = document.querySelector(`[data-chip-group="${groupName}"]`);
      const current = group.querySelector(".active")?.textContent.trim() || family.guardians[0];
      group.innerHTML = family.guardians.map(name => `<button class="chip ${name === current ? "active" : ""}">${name}</button>`).join("");
      group.querySelectorAll(".chip").forEach(btn => {
        btn.addEventListener("click", () => {
          group.querySelectorAll(".chip").forEach(item => item.classList.remove("active"));
          btn.classList.add("active");
          updateChangePreview();
        });
      });
    }

    function bindFilterButtons() {
      document.querySelectorAll("[data-filter]").forEach(btn => {
        btn.addEventListener("click", () => {
          document.querySelectorAll("[data-filter]").forEach(item => item.classList.remove("active"));
          btn.classList.add("active");
          currentFilter = btn.dataset.filter;
          renderTimeline(mainTimeline);
          renderTimeline(adminTimeline, true);
        });
      });
    }

    function bindManagementButtons() {
      childManageList.querySelectorAll("[data-remove-child]").forEach(btn => {
        btn.addEventListener("click", () => removeChild(Number(btn.dataset.removeChild)));
      });
      guardianManageList.querySelectorAll("[data-remove-guardian]").forEach(btn => {
        btn.addEventListener("click", () => removeGuardian(Number(btn.dataset.removeGuardian)));
      });
    }

    function addChild() {
      const input = document.querySelector("#childNameInput");
      const name = input.value.trim();
      if (!name) return showToast("아이 이름을 입력하세요.");
      if (family.children.some(child => child.name === name)) return showToast("이미 등록된 아이입니다.");
      const colors = ["#c7d9ff", "#d9f5c7", "#ffd0e1", "#d8cdf8", "#bfe8f0"];
      family.children.push({ name, color: colors[family.children.length % colors.length], initial: name.slice(0, 1) });
      input.value = "";
      persist("아이 정보가 저장되었습니다");
      addAction(`${name}: 아이 추가`);
      showToast(`${name}을 추가했습니다.`);
      refreshAll();
    }

    function removeChild(index) {
      if (family.children.length <= 1) return showToast("아이 한 명은 남겨야 합니다.");
      const [removed] = family.children.splice(index, 1);
      if (currentFilter === removed.name) currentFilter = "all";
      persist("아이 정보가 저장되었습니다");
      addAction(`${removed.name}: 아이 삭제`);
      showToast(`${removed.name}을 삭제했습니다.`);
      refreshAll();
    }

    function addGuardian() {
      const input = document.querySelector("#guardianNameInput");
      const name = input.value.trim();
      if (!name) return showToast("보호자 이름을 입력하세요.");
      if (family.guardians.includes(name)) return showToast("이미 등록된 보호자입니다.");
      family.guardians.push(name);
      input.value = "";
      persist("보호자 정보가 저장되었습니다");
      addAction(`${name}: 보호자 추가`);
      showToast(`${name}을 담당자 칩에 추가했습니다.`);
      refreshAll();
      selectSchedule(selectedId, false);
    }

    function removeGuardian(index) {
      if (family.guardians.length <= 1) return showToast("보호자 한 명은 남겨야 합니다.");
      const [removed] = family.guardians.splice(index, 1);
      schedules.forEach(item => {
        if (item.drop === removed) item.drop = family.guardians[0];
        if (item.pick === removed) item.pick = family.guardians[0];
      });
      persist("보호자 정보가 저장되었습니다");
      addAction(`${removed}: 보호자 삭제`);
      showToast(`${removed}을 삭제하고 일정 담당자를 조정했습니다.`);
      refreshAll();
      selectSchedule(selectedId, false);
    }

    function addHoliday() {
      const titleInput = document.querySelector("#holidayTitleInput");
      const title = titleInput.value.trim() || "방학/휴일";
      const existing = holidays.find(item => item.day === selectedHolidayDate);
      if (existing) existing.title = title;
      else holidays.push({ day: selectedHolidayDate, title });
      titleInput.value = "";
      persist("휴일/방학 설정이 저장되었습니다");
      addAction(`6월 ${selectedHolidayDate}일: ${title} 등록`);
      showToast(`6월 ${selectedHolidayDate}일을 ${title}로 등록했습니다.`);
      refreshAll();
    }

    function removeHoliday(index) {
      const [removed] = holidays.splice(index, 1);
      persist("휴일/방학 설정이 저장되었습니다");
      addAction(`6월 ${removed.day}일: ${removed.title} 삭제`);
      showToast(`${removed.title}을 삭제했습니다.`);
      refreshAll();
    }

    function updateSummaries() {
      const homeworkCount = homeworkInboxItems.length - placedHomeworkIds.length;
      const completedCount = completedHomeworkIds.length;
      const completion = Math.round((completedCount / homeworkInboxItems.length) * 100);
      const leisureMinutesNumber = Math.round(60 * (completion / 100));
      const leisureMinutes = `${leisureMinutesNumber}분`;
      document.querySelector("#miniHomework").textContent = `${homeworkCount}개`;
      document.querySelector("#miniLeisure").textContent = leisureMinutes;
      document.querySelector("#nowStatus").textContent = completedCount >= 2 ? "여가 거의 활성" : `완료까지 ${homeworkInboxItems.length - completedCount}개 남음`;
      document.querySelector("#leisureFormula").textContent = `숙제 ${homeworkInboxItems.length}개 중 ${completedCount}개 완료 · 완료율 ${completion}% · 여가 ${leisureMinutes} 활성`;
      document.querySelector("#homeworkRule").textContent = `배치된 숙제는 ${placedHomeworkIds.length}개, 실제 완료는 ${completedCount}개입니다. 완료 체크 기준으로 여가시간이 열립니다.`;
      document.querySelector("#adminHomeworkRule").textContent = `배치 ${placedHomeworkIds.length}개 · 완료 ${completedCount}개 · 여가 ${leisureMinutes} 활성`;
      document.querySelector("#leisureMeter").style.setProperty("--value", `${completion}%`);
      updateChildStatuses(completion, leisureMinutes);
    }

    function updateChildStatuses(completion, leisureMinutes) {
      family.children.forEach((child, index) => {
        const card = document.querySelector(`[data-child-card="${child.name}"]`);
        if (!card) return;
        const value = Math.min(100, Math.max(30, completion + index * 10));
        card.querySelector("p").textContent = `숙제 ${value}% 완료 · 여가 ${leisureMinutes} 가능`;
        card.querySelector(".progress").style.setProperty("--value", `${value}%`);
      });
    }

    function homeworkPriorityScore(item) {
      const priority = { "높음": 3, "보통": 2, "낮음": 1 }[item.priority] || 1;
      const due = { "오늘": 3, "내일": 2, "이번 주": 1 }[item.due] || 1;
      return priority * 10 + due;
    }

    function recommendHomeworkSlot(homework) {
      const duration = Number(homework.duration || homework.dur || 20);
      const childBusy = schedules
        .filter(item => item.child === homework.child && item.id !== selectedId)
        .map(item => ({ start: item.start, end: item.start + durationFromRange(item.time, item.dur) }));
      const candidates = [480, 510, 540, 570, 600, 630, 660, 690, 720, 750];
      const start = candidates.find(candidate => {
        const end = candidate + duration;
        return childBusy.every(slot => end <= slot.start || candidate >= slot.end);
      }) || Number(homework.start || 600);
      const endTotal = 7 * 60 + start + duration;
      const time = `${timeLabelFromStart(start)} - ${String(Math.floor(endTotal / 60)).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`;
      return {
        start,
        time,
        reason: `${homework.priority} · 마감 ${homework.due}`
      };
    }

    function updateHomeworkItem(id, patch) {
      const item = homeworkInboxItems.find(homework => homework.id === id);
      if (!item) return;
      Object.assign(item, patch);
      const recommendation = recommendHomeworkSlot(item);
      item.start = recommendation.start;
      item.time = recommendation.time;
      item.dur = Number(item.duration || item.dur);
      persist("숙제 속성이 저장되었습니다");
      renderHomeworkInbox();
      updateSummaries();
      showToast(`${item.title} 속성을 업데이트했습니다.`);
    }

    function renderHomeworkInbox() {
      homeworkInbox.innerHTML = homeworkInboxItems.map(item => {
        const placed = placedHomeworkIds.includes(item.id);
        const completed = completedHomeworkIds.includes(item.id);
        const recommendation = recommendHomeworkSlot(item);
        return `
          <div class="homework-card ${placed ? 'placed' : ''} ${completed ? 'completed' : ''}" data-homework-card="${item.id}">
            <strong>${item.child} ${item.title}</strong>
            <span>${item.duration}분 · 마감 ${item.due} · 우선순위 ${item.priority}${completed ? ' · 완료됨' : placed ? ' · 배치됨' : ''}</span>
            <div class="homework-fields">
              <label>소요
                <select data-homework-duration="${item.id}">
                  ${[10, 15, 20, 30, 45].map(value => `<option value="${value}" ${item.duration === value ? "selected" : ""}>${value}분</option>`).join("")}
                </select>
              </label>
              <label>마감
                <select data-homework-due="${item.id}">
                  ${["오늘", "내일", "이번 주"].map(value => `<option value="${value}" ${item.due === value ? "selected" : ""}>${value}</option>`).join("")}
                </select>
              </label>
              <label>우선순위
                <select data-homework-priority="${item.id}">
                  ${["높음", "보통", "낮음"].map(value => `<option value="${value}" ${item.priority === value ? "selected" : ""}>${value}</option>`).join("")}
                </select>
              </label>
            </div>
            <span class="recommendation">추천 ${recommendation.time} · ${recommendation.reason}</span>
            <div class="homework-actions">
              <button class="tiny-action" data-homework-id="${item.id}" ${placed ? 'disabled' : ''}>추천 배치</button>
              <button class="tiny-action ${completed ? 'active' : ''}" data-complete-homework="${item.id}" ${placed ? '' : 'disabled'}>${completed ? '완료 취소' : '완료 체크'}</button>
            </div>
          </div>
        `;
      }).join("");

      homeworkInbox.querySelectorAll("[data-homework-duration]").forEach(select => {
        select.addEventListener("change", () => updateHomeworkItem(select.dataset.homeworkDuration, { duration: Number(select.value), dur: Number(select.value) }));
      });
      homeworkInbox.querySelectorAll("[data-homework-due]").forEach(select => {
        select.addEventListener("change", () => updateHomeworkItem(select.dataset.homeworkDue, { due: select.value }));
      });
      homeworkInbox.querySelectorAll("[data-homework-priority]").forEach(select => {
        select.addEventListener("change", () => updateHomeworkItem(select.dataset.homeworkPriority, { priority: select.value }));
      });
      homeworkInbox.querySelectorAll("[data-homework-id]").forEach(btn => {
        btn.addEventListener("click", () => placeHomeworkFromInbox(btn.dataset.homeworkId));
      });
      homeworkInbox.querySelectorAll("[data-complete-homework]").forEach(btn => {
        btn.addEventListener("click", () => toggleHomeworkComplete(btn.dataset.completeHomework));
      });
    }

    function renderWeekSummary() {
      const changedItems = schedules
        .filter(item => item.changed || item.rangeLabel)
        .slice(-5)
        .reverse()
        .map(item => `${item.child} ${item.title}`);
      const todayItems = changedItems.length ? changedItems : schedules.slice(0, 5).map(item => `${item.child} ${item.title}`);
      const days = [
        { name: "월", hint: "반복 일정", items: ["민지 학교", "준호 태권도", "서윤 독서"] },
        { name: "화", hint: "숙제 집중", items: ["민지 영어", "준호 수학", "가족 여가"] },
        { name: "수", hint: "학원 많은 날", items: ["준호 학교", "서윤 미술", "민지 피아노"] },
        { name: "목", hint: "오늘 변경 우선", items: todayItems },
        { name: "금", hint: "내일", items: ["민지 영어 단어", "준호 과학", "서윤 독서 기록"] }
      ];
      weekSummary.innerHTML = days.map(day => `
        <article class="week-day ${day.name === '목' ? 'today' : ''}">
          <h3>${day.name}요일 · ${day.hint}</h3>
          ${day.items.slice(0, 5).map(text => `<div class="week-item"><strong>${text}</strong><span>담당자와 숙제 상태 확인</span></div>`).join("")}
        </article>
      `).join("");
    }

    function renderMonthSummary() {
      const changedCount = schedules.filter(item => item.changed || item.rangeLabel).length;
      const remaining = homeworkInboxItems.length - completedHomeworkIds.length;
      const days = Array.from({ length: 14 }, (_, index) => index + 1);
      monthSummary.innerHTML = days.map(day => {
        const badges = [];
        const holiday = holidays.find(item => item.day === day);
        if (day === 4) badges.push(`<span class="month-badge changed">오늘 변경 ${changedCount}건</span>`);
        if ([5, 8, 11].includes(day)) badges.push(`<span class="month-badge homework">숙제 마감 ${remaining}개</span>`);
        if (holiday) badges.push(`<span class="month-badge holiday">${holiday.title} 휴일</span>`);
        else if (day === 6) badges.push(`<span class="month-badge holiday">재량휴업 후보</span>`);
        if (!badges.length) badges.push(`<span class="month-badge">기본 반복</span>`);
        return `
          <article class="month-day ${day === 4 ? 'today' : ''}">
            <strong>6월 ${day}일</strong>
            ${badges.join("")}
          </article>
        `;
      }).join("");
    }

    function renderHolidaySettings() {
      holidayDateGrid.innerHTML = Array.from({ length: 14 }, (_, index) => {
        const day = index + 1;
        const holiday = holidays.find(item => item.day === day);
        return `<button class="${day === selectedHolidayDate ? "active" : ""}" data-holiday-day="${day}">${day}${holiday ? "*" : ""}</button>`;
      }).join("");
      holidayList.innerHTML = holidays.length
        ? holidays.map((holiday, index) => `
          <div class="manage-item">
            <span class="color-dot" style="--dot-color:#e5edff"></span>
            <div><strong>6월 ${holiday.day}일</strong><span>${holiday.title} · 학교/학원 비활성 표시</span></div>
            <button class="tiny-action" data-remove-holiday="${index}">삭제</button>
          </div>
        `).join("")
        : `<div class="notice">등록된 휴일/방학이 없습니다.</div>`;

      holidayDateGrid.querySelectorAll("[data-holiday-day]").forEach(btn => {
        btn.addEventListener("click", () => {
          selectedHolidayDate = Number(btn.dataset.holidayDay);
          renderHolidaySettings();
          showToast(`6월 ${selectedHolidayDate}일을 선택했습니다.`);
        });
      });
      holidayList.querySelectorAll("[data-remove-holiday]").forEach(btn => {
        btn.addEventListener("click", () => removeHoliday(Number(btn.dataset.removeHoliday)));
      });
    }

    function renderTimeline(target, admin = false) {
      const visible = schedules.filter(item => currentFilter === "all" || item.child === currentFilter);
      target.innerHTML = visible.map(item => {
        const top = Math.round(item.start * 0.72);
        const height = Math.max(54, Math.round(item.dur * 0.72));
        const lane = admin ? "8px" : `calc(${item.lane * 33.333}% + 8px)`;
        const widthStyle = admin ? "width: calc(100% - 16px)" : "";
        const disabledByHoliday = holidays.some(holiday => holiday.day === 4) && ["school", "academy"].includes(item.type);
        return `
          <article class="schedule-card ${item.type} ${item.id === selectedId ? 'selected' : ''}" data-child="${item.child}" data-lane="${item.lane}" style="--top:${top}px; --height:${height}px; --lane:${lane}; ${widthStyle}">
            <div class="schedule-title">${item.child} · ${item.title}</div>
            <div class="schedule-time">${item.time}</div>
            <div class="schedule-guardians">등원 ${item.drop} · 하원 ${item.pick}</div>
            ${disabledByHoliday ? '<span class="changed">휴일 비활성</span>' : ''}
            ${item.changed ? '<span class="changed">오늘 변경됨</span>' : ''}
            ${item.recurrence?.enabled ? `<span class="changed">${repeatSummary(item)}</span>` : ''}
            ${item.rangeLabel ? `<span class="changed">${item.rangeLabel}</span>` : ''}
            <button aria-label="${item.child} ${item.title} 선택" data-select="${item.id}">선택</button>
          </article>
        `;
      }).join("");

      target.querySelectorAll("[data-select]").forEach(btn => {
        btn.addEventListener("click", () => selectSchedule(btn.dataset.select));
      });
    }

    function renderTodos() {
      todoList.innerHTML = todos.map(([child, title, meta, tag]) => `
        <div class="todo">
          <span class="dot"></span>
          <div><strong>${child} · ${title}</strong><span>${meta}</span></div>
          <span class="tag">${tag}</span>
        </div>
      `).join("");
    }

    function selectSchedule(id, openPanel = true) {
      selectedId = id;
      const item = schedules.find(s => s.id === id);
      if (!item) return;
      document.querySelector("#quickTitle").textContent = `${item.child} ${item.title}`;
      document.querySelector("#titleInput").value = `${item.child} ${item.title}`;
      document.querySelector("#quickNotice").textContent = `${item.time} · 등원 ${item.drop} · 하원 ${item.pick}`;
      setActiveChip("drop", item.drop);
      setActiveChip("pick", item.pick);
      setActiveTimeChip(item.start);
      setRepeatControls(item);
      updateChangePreview(false);
      renderTimeline(mainTimeline);
      renderTimeline(adminTimeline, true);
      if (openPanel && quickPanel) quickPanel.classList.add("open");
    }

    function setActiveChip(groupName, value) {
      const group = document.querySelector(`[data-chip-group="${groupName}"]`);
      if (!group) return;
      group.querySelectorAll(".chip").forEach(chip => chip.classList.toggle("active", chip.textContent.trim() === value));
    }

    function setActiveTimeChip(start) {
      const group = document.querySelector('[data-chip-group="time"]');
      if (!group) return;
      const fallback = [...group.querySelectorAll(".chip")][1];
      group.querySelectorAll(".chip").forEach(chip => chip.classList.remove("active"));
      const match = group.querySelector(`[data-start="${start}"]`) || fallback;
      match.classList.add("active");
    }

    function setRepeatControls(item) {
      const enabled = !!item.recurrence?.enabled;
      repeatToggle.classList.toggle("active", enabled);
      repeatToggle.setAttribute("aria-pressed", String(enabled));
      repeatToggle.setAttribute("aria-label", enabled ? "반복 끄기" : "반복 켜기");
      repeatControls.classList.toggle("hidden", !enabled);
      const type = item.recurrence?.type || "weekly";
      document.querySelectorAll('[data-chip-group="repeatType"] .chip').forEach(chip => {
        chip.classList.toggle("active", chip.dataset.repeat === type);
      });
      const days = item.recurrence?.weekdays || ["수", "목"];
      document.querySelectorAll("[data-weekdays] .chip").forEach(chip => {
        chip.classList.toggle("active", days.includes(chip.dataset.day));
      });
      document.querySelector("#holidaySkip").classList.toggle("active", item.recurrence?.holidaySkip !== false);
    }

    function collectRepeatControls() {
      return {
        enabled: repeatToggle.classList.contains("active"),
        type: document.querySelector('[data-chip-group="repeatType"] .active')?.dataset.repeat || "weekly",
        weekdays: [...document.querySelectorAll("[data-weekdays] .chip.active")].map(chip => chip.dataset.day),
        holidaySkip: document.querySelector("#holidaySkip").classList.contains("active"),
        until: "none"
      };
    }

    function repeatSummary(item) {
      if (!item.recurrence?.enabled) return "";
      const typeLabel = { daily: "매일", weekly: "매주", monthly: "매월" }[item.recurrence.type] || "반복";
      const days = item.recurrence.weekdays?.length ? item.recurrence.weekdays.join("/") : "요일 미선택";
      return `${typeLabel} ${days} · ${item.recurrence.holidaySkip ? "휴일 제외" : "휴일 포함"}`;
    }

    function selectedControls() {
      const drop = document.querySelector('[data-chip-group="drop"] .active')?.textContent.trim() || "미정";
      const pick = document.querySelector('[data-chip-group="pick"] .active')?.textContent.trim() || "미정";
      const timeChip = document.querySelector('[data-chip-group="time"] .active');
      return {
        drop,
        pick,
        start: Number(timeChip?.dataset.start || 415),
        startText: timeChip?.textContent.trim() || "16:10"
      };
    }

    function formatTimeFromText(startText, dur) {
      const [hour, minute] = startText.split(":").map(Number);
      const total = hour * 60 + minute;
      const hh = String(Math.floor(total / 60)).padStart(2, "0");
      const mm = String(total % 60).padStart(2, "0");
      const endTotal = total + Math.max(20, Math.round(dur / 10) * 10);
      const eh = String(Math.floor(endTotal / 60)).padStart(2, "0");
      const em = String(endTotal % 60).padStart(2, "0");
      return `${hh}:${mm} - ${eh}:${em}`;
    }

    function durationFromRange(range, fallback) {
      const match = range.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
      if (!match) return fallback;
      const [, sh, sm, eh, em] = match.map(Number);
      return (eh * 60 + em) - (sh * 60 + sm);
    }

    function clockFromStart(start) {
      const total = 7 * 60 + start;
      const hh = String(Math.floor(total / 60)).padStart(2, "0");
      const mm = String(total % 60).padStart(2, "0");
      return `${hh}:${mm}`;
    }

    function updateChangePreview(markPending = true) {
      const item = schedules.find(s => s.id === selectedId);
      if (!item) return;
      const controls = selectedControls();
      const time = formatTimeFromText(controls.startText, durationFromRange(item.time, item.dur));
      const draftRepeat = collectRepeatControls();
      const repeatText = draftRepeat.enabled
        ? ` / ${({ daily: "매일", weekly: "매주", monthly: "매월" }[draftRepeat.type] || "반복")} ${draftRepeat.weekdays.join("/") || "요일 미선택"} · ${draftRepeat.holidaySkip ? "휴일 제외" : "휴일 포함"}`
        : "";
      changePreview.textContent = `${item.child} · ${item.title} / ${time} / 등원 ${controls.drop} · 하원 ${controls.pick}${repeatText}`;
      if (markPending) document.querySelector("#quickNotice").textContent = "변경 예정 내용을 확인한 뒤 저장하세요.";
    }

    function setMode(mode) {
      if (mode === "admin" && !isAdminAuthed) {
        document.querySelectorAll("[data-mode]").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === "main"));
        openAuthModal();
        return;
      }
      document.querySelectorAll("[data-mode]").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));
      document.querySelector("#mainView").classList.toggle("hidden", mode !== "main");
      document.querySelector("#adminView").classList.toggle("hidden", mode !== "admin");
    }

    function refreshAll() {
      renderFamily();
      renderAdminCalendar();
      renderTimeline(mainTimeline);
      renderTimeline(adminTimeline, true);
      renderTodos();
      renderHomeworkInbox();
      renderWeekSummary();
      renderMonthSummary();
      renderHolidaySettings();
      renderTemplateEditor();
      updateSummaries();
      setMainView(currentView);
      setAdminSection(activeAdmin, false);
    }

    function setAdminSection(section, announce = true) {
      activeAdmin = section;
      const titles = {
        today: "오늘 관리",
        templates: "일정 템플릿",
        homework: "숙제 관리",
        settings: "휴일/설정"
      };
      const descriptions = {
        today: "반복 원본은 유지하고 오늘 필요한 변경만 빠르게 저장합니다.",
        templates: "반복 원본, 학교/학원/숙제 템플릿을 관리합니다.",
        homework: "숙제 대기함 배치와 완료 체크를 한 곳에서 처리합니다.",
        settings: "아이, 보호자, 휴일/방학 설정을 관리합니다."
      };
      document.querySelectorAll("[data-admin]").forEach(btn => btn.classList.toggle("active", btn.dataset.admin === section));
      document.querySelector("#adminView .date-stack h1").textContent = titles[section];
      document.querySelector("#adminView .date-stack p").textContent = descriptions[section];
      document.querySelectorAll("[data-admin-panel]").forEach(panel => {
        panel.classList.toggle("hidden", panel.dataset.adminPanel !== section);
      });
      settingsPanel.classList.toggle("hidden", section !== "settings");
      document.querySelector("#autoPlace").classList.toggle("hidden", section !== "homework");
      document.querySelector("#openSheet").classList.toggle("hidden", section !== "today");
      if (announce) showToast(`${titles[section]} 화면으로 전환했습니다.`);
    }

    function setMainView(view) {
      currentView = view;
      const board = document.querySelector("#mainView .schedule-board");
      board.classList.toggle("hidden", view !== "day");
      weekSummary.classList.toggle("hidden", view !== "week");
      monthSummary.classList.toggle("hidden", view !== "month");
      const subtitles = { day: "07:00 - 24:00", week: "아이별 요일 요약", month: "이번 달 주요 변경" };
      document.querySelector("#mainView .panel-head span").textContent = subtitles[view];
    }

    document.querySelectorAll("[data-mode]").forEach(btn => {
      btn.addEventListener("click", () => setMode(btn.dataset.mode));
    });

    document.querySelector("#confirmAuth").addEventListener("click", confirmAdminLogin);
    document.querySelector("#cancelAuth").addEventListener("click", closeAuthModal);
    document.querySelector("#logoutAdmin").addEventListener("click", logoutAdmin);
    adminPasswordInput.addEventListener("keydown", event => {
      if (event.key === "Enter") confirmAdminLogin();
    });
    authModal.addEventListener("click", event => {
      if (event.target === authModal) closeAuthModal();
    });

    document.querySelectorAll("[data-admin]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!isAdminAuthed) {
          openAuthModal();
          return;
        }
        setAdminSection(btn.dataset.admin);
      });
    });

    document.querySelectorAll("[data-view]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-view]").forEach(item => item.classList.remove("active"));
        btn.classList.add("active");
        const labels = { day: "오늘 시간표", week: "이번 주 요약", month: "6월 요약" };
        document.querySelector("#boardTitle").textContent = labels[btn.dataset.view];
        setMainView(btn.dataset.view);
      });
    });

    document.querySelectorAll("[data-filter]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-filter]").forEach(item => item.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        renderTimeline(mainTimeline);
        renderTimeline(adminTimeline, true);
      });
    });

    document.querySelectorAll("[data-chip-group] .chip").forEach(btn => {
      btn.addEventListener("click", () => {
        const group = btn.closest("[data-chip-group]");
        group.querySelectorAll(".chip").forEach(item => item.classList.remove("active"));
        btn.classList.add("active");
        updateChangePreview();
      });
    });

    repeatToggle.addEventListener("click", () => {
      repeatToggle.classList.toggle("active");
      const enabled = repeatToggle.classList.contains("active");
      repeatToggle.setAttribute("aria-pressed", String(enabled));
      repeatToggle.setAttribute("aria-label", enabled ? "반복 끄기" : "반복 켜기");
      repeatControls.classList.toggle("hidden", !enabled);
      updateChangePreview();
    });

    document.querySelectorAll("[data-weekdays] .chip").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.classList.toggle("active");
        updateChangePreview();
      });
    });

    document.querySelector("#holidaySkip").addEventListener("click", event => {
      event.target.classList.toggle("active");
      updateChangePreview();
    });

    document.querySelector("#repeatUntil").addEventListener("click", event => {
      event.target.classList.toggle("active");
      event.target.textContent = event.target.classList.contains("active") ? "종료 없음" : "종료 없음";
      updateChangePreview();
    });

    document.querySelectorAll("[data-add-type]").forEach(btn => {
      btn.addEventListener("click", () => createDraftSchedule(btn.dataset.addType));
    });

    document.querySelectorAll("[data-template-select]").forEach(btn => {
      btn.addEventListener("click", () => {
        activeTemplate = btn.dataset.templateSelect;
        renderTemplateEditor();
        showToast(`${btn.closest(".template-card").querySelector("strong").textContent}을 선택했습니다.`);
      });
    });

    [templateChild, templateTitle, templateStart, templateDuration, templateDrop, templatePick].forEach(control => {
      control.addEventListener("input", updateTemplatePreview);
      control.addEventListener("change", updateTemplatePreview);
    });

    document.querySelectorAll("[data-template-day]").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.classList.toggle("active");
        updateTemplatePreview();
      });
    });

    document.querySelector("#templateHolidaySkip").addEventListener("click", event => {
      event.currentTarget.classList.toggle("active");
      updateTemplatePreview();
    });
    document.querySelector("#saveTemplateBase").addEventListener("click", saveTemplateBase);
    document.querySelector("#saveTemplateToday").addEventListener("click", createScheduleFromTemplate);

    document.querySelector("#addChild").addEventListener("click", addChild);
    document.querySelector("#childNameInput").addEventListener("keydown", event => {
      if (event.key === "Enter") addChild();
    });
    document.querySelector("#addGuardian").addEventListener("click", addGuardian);
    document.querySelector("#guardianNameInput").addEventListener("keydown", event => {
      if (event.key === "Enter") addGuardian();
    });
    document.querySelector("#addHoliday").addEventListener("click", addHoliday);
    document.querySelector("#holidayTitleInput").addEventListener("keydown", event => {
      if (event.key === "Enter") addHoliday();
    });
    document.querySelector("#resetSettings").addEventListener("click", () => {
      const defaults = ScheduleApi.defaults();
      family = defaults.family;
      holidays = defaults.holidays;
      templates = defaults.templates;
      persist("가족/휴일 설정을 초기화했습니다");
      addAction("가족/휴일 설정 초기화");
      showToast("가족/휴일 설정을 초기화했습니다.");
      refreshAll();
      selectSchedule(selectedId, false);
    });

    adminTimeline.addEventListener("click", event => {
      if (event.target.closest(".schedule-card")) return;
      moveSelectedScheduleToSlot(event);
    });

    function moveSelectedScheduleToSlot(event) {
      const item = schedules.find(s => s.id === selectedId);
      if (!item) return;
      const rect = adminTimeline.getBoundingClientRect();
      const rawStart = (event.clientY - rect.top) / 0.72;
      const snapped = Math.max(0, Math.min(1020, Math.round(rawStart / 10) * 10));
      const duration = durationFromRange(item.time, item.dur);
      item.start = snapped;
      item.time = formatTimeFromText(clockFromStart(snapped), duration);
      item.changed = true;
      item.rangeLabel = "슬롯 변경";
      persist("시간표 슬롯 변경이 저장되었습니다");
      addAction(`${item.child} ${item.title}: 시간표 클릭으로 ${item.time} 이동`);
      showToast(`${clockFromStart(snapped)} 슬롯으로 이동했습니다.`);
      document.querySelector("#quickNotice").textContent = `${item.time} · 시간표 슬롯으로 변경`;
      refreshAll();
      selectSchedule(item.id, false);
      showSlotHint(snapped);
    }

    function showSlotHint(start) {
      adminTimeline.querySelector(".slot-hint")?.remove();
      const hint = document.createElement("div");
      hint.className = "slot-hint";
      hint.style.setProperty("--slot-top", `${Math.round(start * 0.72)}px`);
      adminTimeline.appendChild(hint);
      setTimeout(() => hint.remove(), 1600);
    }

    document.querySelector("#saveToday").addEventListener("click", () => {
      const item = schedules.find(s => s.id === selectedId);
      if (!item) return;
      const title = document.querySelector("#titleInput").value.replace(item.child + " ", "");
      const { drop, pick, start } = selectedControls();
      item.title = title || item.title;
      item.drop = drop;
      item.pick = pick;
      item.start = start;
      item.time = formatTimeFromText(selectedControls().startText, durationFromRange(item.time, item.dur));
      item.recurrence = collectRepeatControls();
      item.changed = true;
      item.rangeLabel = item.recurrence.enabled ? "반복 설정" : item.rangeLabel;
      document.querySelector("#quickNotice").textContent = "오늘만 저장되었습니다.";
      document.querySelector("#nowTitle").textContent = `${item.child} ${item.title}`;
      document.querySelector("#nowGuardian").textContent = `등원 ${item.drop} · 하원 ${item.pick}`;
      persist("오늘만 저장되었습니다");
      addAction(`${item.child} ${item.title}: 오늘만 ${item.time}, 등원 ${item.drop}, 하원 ${item.pick}${item.recurrence.enabled ? `, ${repeatSummary(item)}` : ""}로 저장`);
      showToast("오늘 변경이 Main 시간표에 반영됐습니다.");
      refreshAll();
      selectSchedule(item.id, false);
      if (item.recurrence.enabled) {
        rangeModal.classList.remove("hidden");
        document.querySelector("#quickNotice").textContent = "반복 설정을 어느 범위에 적용할지 선택하세요.";
      }
      if (window.innerWidth <= 760) quickPanel.classList.remove("open");
    });

    document.querySelector("#cancelToday").addEventListener("click", () => {
      const item = schedules.find(s => s.id === selectedId);
      if (!item) return;
      item.changed = true;
      item.title = `${item.title} 취소`;
      item.type = "meal";
      document.querySelector("#quickNotice").textContent = "오늘만 취소로 표시되었습니다.";
      persist("오늘 취소가 저장되었습니다");
      addAction(`${item.child} ${item.title}: 오늘만 취소`);
      showToast("오늘 취소가 Main에 반영됐습니다.");
      refreshAll();
      selectSchedule(item.id, false);
      if (window.innerWidth <= 760) quickPanel.classList.remove("open");
    });

    function autoPlaceHomework() {
      const next = homeworkInboxItems
        .filter(item => !placedHomeworkIds.includes(item.id))
        .sort((a, b) => homeworkPriorityScore(b) - homeworkPriorityScore(a))[0];
      if (!next) {
        document.querySelector("#quickNotice").textContent = "대기 중인 숙제가 모두 배치되었습니다.";
        showToast("배치할 숙제가 없습니다.");
        return;
      }
      placeHomeworkFromInbox(next.id);
    }

    window.autoPlaceHomework = autoPlaceHomework;
    document.querySelector("#autoPlace").addEventListener("click", autoPlaceHomework);
    document.querySelector("#autoPlacePanel").addEventListener("click", autoPlaceHomework);

    function createDraftSchedule(type) {
      const typeLabels = { school: "학교", academy: "학원", homework: "숙제", leisure: "여가시간" };
      const lanes = { school: 0, academy: 1, homework: 0, leisure: 2 };
      const id = `draft-${Date.now()}`;
      const draft = {
        id,
        child: "민지",
        title: `새 ${typeLabels[type]}`,
        time: type === "school" ? "08:30 - 13:20" : "16:30 - 17:00",
        start: type === "school" ? 90 : 435,
        dur: type === "school" ? 210 : 42,
        lane: lanes[type] ?? 0,
        type,
        drop: "엄마",
        pick: "엄마",
        changed: true,
        rangeLabel: "새 일정"
      };
      schedules.push(draft);
      selectedId = id;
      persist(`${typeLabels[type]} 일정 초안이 생성되었습니다`);
      addAction(`${draft.child} ${draft.title}: 새 일정 초안 생성`);
      showToast(`${typeLabels[type]} 일정을 추가했습니다. 빠른 수정 패널에서 저장하세요.`);
      refreshAll();
      selectSchedule(id, true);
    }

    function placeHomeworkFromInbox(id) {
      const homework = homeworkInboxItems.find(item => item.id === id);
      if (!homework) return;
      if (placedHomeworkIds.includes(id) || schedules.some(item => item.homeworkId === id)) {
        showToast("이미 배치된 숙제입니다.");
        return;
      }
      const recommendation = recommendHomeworkSlot(homework);
      const lane = Math.max(0, family.children.findIndex(child => child.name === homework.child));
      const schedule = {
        id: `hw-${id}-${Date.now()}`,
        homeworkId: id,
        child: homework.child,
        title: homework.title,
        time: recommendation.time,
        start: recommendation.start,
        dur: homework.duration,
        lane,
        type: "homework",
        drop: homework.drop,
        pick: homework.pick,
        changed: true,
        rangeLabel: `${homework.priority} 숙제`
      };
      schedules.push(schedule);
      placedHomeworkIds.push(id);
      selectedId = schedule.id;
      document.querySelector("#quickNotice").textContent = `${homework.child} ${homework.title}을 ${recommendation.time}에 배치했습니다.`;
      persist("숙제 대기함 배치가 저장되었습니다");
      addAction(`${homework.child} ${homework.title}: ${recommendation.time} 추천 배치`);
      showToast("숙제가 시간표에 배치됐습니다.");
      refreshAll();
      selectSchedule(schedule.id, true);
      if (window.innerWidth <= 760) quickPanel.classList.remove("open");
    }

    function toggleHomeworkComplete(id) {
      const homework = homeworkInboxItems.find(item => item.id === id);
      if (!homework || !placedHomeworkIds.includes(id)) return;
      const done = completedHomeworkIds.includes(id);
      completedHomeworkIds = done
        ? completedHomeworkIds.filter(itemId => itemId !== id)
        : [...completedHomeworkIds, id];
      persist(done ? "숙제 완료 체크를 취소했습니다" : "숙제 완료가 저장되었습니다");
      addAction(`${homework.child} ${homework.title}: ${done ? "완료 취소" : "완료 체크"} · 여가시간 재계산`);
      showToast(done ? "숙제 완료를 취소했습니다." : "숙제 완료로 여가시간을 다시 계산했습니다.");
      refreshAll();
    }

    document.querySelector("#saveSeries").addEventListener("click", () => {
      rangeModal.classList.remove("hidden");
    });

    document.querySelector("#closeRange").addEventListener("click", () => {
      rangeModal.classList.add("hidden");
    });

    rangeModal.addEventListener("click", event => {
      if (event.target === rangeModal) rangeModal.classList.add("hidden");
    });

    document.querySelector("#rangeOptions").addEventListener("click", event => {
      const option = event.target.closest("[data-range]");
      if (!option) return;
      selectedRange = option.dataset.range;
      document.querySelectorAll(".range-option").forEach(item => item.classList.remove("active"));
      option.classList.add("active");
    });

    document.querySelector("#confirmRange").addEventListener("click", () => {
      const item = schedules.find(s => s.id === selectedId);
      if (!item) return;
      const labels = {
        only: "이 일정만",
        future: "이후 모두",
        all: "전체 반복"
      };
      item.changed = true;
      item.rangeLabel = labels[selectedRange];
      rangeModal.classList.add("hidden");
      document.querySelector("#quickNotice").textContent = `${labels[selectedRange]} 범위로 저장했습니다.`;
      persist("반복 범위가 저장되었습니다");
      addAction(`${item.child} ${item.title}: ${repeatSummary(item) || "반복"} · 범위 '${labels[selectedRange]}' 저장`);
      showToast("반복 일정 수정 범위가 저장됐습니다.");
      refreshAll();
      selectSchedule(item.id, false);
    });

    document.querySelector("#openSheet").addEventListener("click", () => {
      quickPanel.classList.toggle("open");
    });

    document.querySelector("#closeSheet").addEventListener("click", () => {
      quickPanel.classList.remove("open");
    });

    document.querySelector("#titleInput").addEventListener("keydown", event => {
      if (event.key === "Enter") document.querySelector("#saveToday").click();
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        const hadOpenLayer = !rangeModal.classList.contains("hidden") || !authModal.classList.contains("hidden") || quickPanel.classList.contains("open");
        rangeModal.classList.add("hidden");
        authModal.classList.add("hidden");
        quickPanel.classList.remove("open");
        if (hadOpenLayer) showToast("열린 패널을 닫았습니다.");
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        document.querySelector("#saveToday").click();
      }
    });

    document.querySelector("#resetDemo").addEventListener("click", () => {
      const defaults = ScheduleApi.resetSnapshot();
      schedules = defaults.schedules;
      homeworkInboxItems = normalizeHomeworkItems(defaults.homeworkItems);
      placedHomeworkIds = defaults.placedHomeworkIds;
      completedHomeworkIds = defaults.completedHomeworkIds;
      family = defaults.family;
      holidays = defaults.holidays;
      templates = defaults.templates;
      currentFilter = "all";
      currentView = "day";
      activeAdmin = "today";
      selectedId = "s5";
      document.querySelectorAll("[data-filter]").forEach(btn => btn.classList.toggle("active", btn.dataset.filter === "all"));
      document.querySelectorAll("[data-view]").forEach(btn => btn.classList.toggle("active", btn.dataset.view === "day"));
      document.querySelector("#boardTitle").textContent = "오늘 시간표";
      document.querySelector("#quickNotice").textContent = "데모 상태를 초기화했습니다.";
      storageNote.textContent = "브라우저 저장을 초기화했습니다.";
      recentActions = [];
      actionLog.innerHTML = "<div>아직 이번 세션에서 저장한 변경이 없습니다.</div>";
      showToast("데모 상태를 초기화했습니다.");
      refreshAll();
      selectSchedule(selectedId, false);
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) quickPanel.classList.remove("open");
    });

    updateAdminAuthUi();
    refreshAll();
    selectSchedule(selectedId, false);
