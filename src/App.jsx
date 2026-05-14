import React, { useState, useEffect, useRef } from "react";
import {
  Settings,
  Plus,
  X,
  Edit3,
  CheckCircle,
  ExternalLink,
  Image as ImageIcon,
  Upload,
  ArrowRight,
  ClipboardList,
  FileDown,
  Trash2,
  Layout,
  Calendar,
  Users,
  Save,
  ChevronUp,
  ChevronDown,
  Check,
  Home,
  List,
  FileText,
  Share2,
  Printer,
  Clock,
  FileImage,
  Archive
} from "lucide-react";

const THEME = {
  primary: "#0F172A",
  secondary: "#338F88",
  accent: "#B89F5D",
  highlight: "#FCEBAF",
  bg: "#F8FAFC",
  border: "#E2E8F0",
};

const FONT_FAMILY =
  '"Noto Sans TC", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif';

const INITIAL_CLEAN_CONFIG = {
  cover: { title: "", desc: "", titleFontSize: 72 },
  attendees: "",
  topics: [],
  sessionDate: "",
};

const QUICK_TAGS = [
  { label: "決議", prefix: "【決議】", color: "bg-white/80 text-[#338F88] border-[#338F88]/30 hover:bg-[#338F88] hover:text-white" },
  { label: "待辦", prefix: "【待辦】", color: "bg-white/80 text-[#A66E5E] border-[#A66E5E]/30 hover:bg-[#A66E5E] hover:text-white" },
  { label: "風險", prefix: "【風險】", color: "bg-white/80 text-[#8C5E6B] border-[#8C5E6B]/30 hover:bg-[#8C5E6B] hover:text-white" },
  { label: "追蹤", prefix: "【追蹤】", color: "bg-white/80 text-[#5E7A8C] border-[#5E7A8C]/30 hover:bg-[#5E7A8C] hover:text-white" },
];

const App = () => {
  // ==========================================
  // [狀態管理與模式判斷]
  // ==========================================
  const urlParams = new URLSearchParams(window.location.search);
  const isViewer = urlParams.get("mode") === "viewer";
  const meetingId = urlParams.get("id");

  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // 一版一連：記錄最後一次存檔的內容與 ID
  const [lastSharedInfo, setLastSharedInfo] = useState({ dataStr: null, id: null });

  const [config, setConfig] = useState(() => {
    try {
      const savedData = sessionStorage.getItem("strategyMeetingData");
      if (savedData) return JSON.parse(savedData);
    } catch (err) {
      console.error("讀取暫存失敗", err);
    }
    return INITIAL_CLEAN_CONFIG;
  });

  // [編輯模式] 本地即時暫存
  useEffect(() => {
    if (!isViewer) {
      try {
        sessionStorage.setItem("strategyMeetingData", JSON.stringify(config));
      } catch (err) {
        console.warn("寫入 SessionStorage 失敗", err);
      }
    }
  }, [config, isViewer]);

  // [與會者模式] 透過真實 API 載入雲端資料
  useEffect(() => {
    if (isViewer && meetingId) {
      fetch(`/api/get?id=${meetingId}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            const parsedData = typeof data.result === 'string' ? JSON.parse(data.result) : (data.result || data);
            setConfig(parsedData);
          } else {
            alert("此會議紀錄不存在或已失效。");
          }
        })
        .catch(err => {
          console.error("讀取資料失敗", err);
          alert("無法取得雲端會議紀錄，請確認您的網路與伺服器狀態。");
        });
    }
  }, [isViewer, meetingId]);

  const [activePage, setActivePage] = useState("cover");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [fullscreenImg, setFullscreenImg] = useState(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportingTopicId, setExportingTopicId] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportSelection, setExportSelection] = useState({ cover: true, agenda: true });

  const [tempConfig, setTempConfig] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const notesRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (!document.getElementById("google-fonts-noto")) {
      const link = document.createElement("link");
      link.id = "google-fonts-noto";
      link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [activePage]);

  const getAttendeePreview = (attendees) => {
    if (!attendees || typeof attendees !== "string") return "尚未填寫";
    const list = attendees.split(/[,，]/).filter((item) => item.trim() !== "");
    if (list.length === 0) return "尚未填寫";
    return list.length > 1 ? `${list[0]} 等 ${list.length} 人` : list[0];
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 動態載入畫圖與 PDF、ZIP 打包引擎
  useEffect(() => {
    const scripts = [
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
    ];
    scripts.forEach((src) => {
      if (!document.querySelector(`script[src="${src}"]`)) {
        const script = document.createElement("script");
        script.src = src; script.async = true; document.body.appendChild(script);
      }
    });
  }, []);

  const openConfig = () => {
    setTempConfig(JSON.parse(JSON.stringify(config)));
    setIsConfigOpen(true);
  };
  const applyConfig = () => {
    setConfig(tempConfig);
    setIsConfigOpen(false);
  };

  // ==========================================
  // [真實雲端 API + 一版一連防護機制]
  // ==========================================
  const generateShareLink = async () => {
    const currentDataStr = JSON.stringify(config);

    if (lastSharedInfo.dataStr === currentDataStr && lastSharedInfo.id) {
      const existingLink = `${window.location.origin}/?mode=viewer&id=${lastSharedInfo.id}`;
      try {
        await navigator.clipboard.writeText(existingLink);
        alert(`ℹ️ 會議內容未變更，已自動為您複製現有的分享連結！\n\n${existingLink}`);
      } catch (e) {
        alert(`ℹ️ 內容未變更，請直接使用以下連結：\n\n${existingLink}`);
      }
      return;
    }

    setIsGeneratingLink(true);
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configData: config })
      });

      if (!response.ok) {
        throw new Error(`伺服器回應錯誤 (${response.status})`);
      }

      const result = await response.json();
      if (result.id) {
        const link = `${window.location.origin}/?mode=viewer&id=${result.id}`;
        setLastSharedInfo({ dataStr: currentDataStr, id: result.id });
        
        try {
          await navigator.clipboard.writeText(link);
          alert(`✅ 已為新版本產生分享連結，並自動複製到剪貼簿！\n\n${link}`);
        } catch (e) {
          alert(`✅ 已為新版本產生分享連結！請手動複製以下網址：\n\n${link}`);
        }
      } else {
        throw new Error("伺服器未回傳會議 ID。");
      }
    } catch (err) {
      console.error("產生連結失敗", err);
      alert(`❌ 產生雲端連結失敗：\n${err.message}\n\n⚠️ 提示：請確認您的 Vercel KV 已正確綁定，且 API 路由設定正確。`);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const openExportModal = (format) => {
    const initialSelection = { cover: true, agenda: true };
    config.topics?.forEach(t => initialSelection[t.id] = true);
    setExportSelection(initialSelection);
    setExportFormat(format);
    setShowExportModal(true);
  };

  const toggleExportSelection = (key) => {
    setExportSelection(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirmExport = async () => {
    setShowExportModal(false);
    const format = exportFormat;
    
    if (!window.html2canvas || (format === 'pdf' && !window.jspdf)) {
      alert("匯出模組載入中，請稍候。");
      return;
    }
    
    setIsExporting(true);
    setExportingTopicId('full-report'); 

    const rawTitle = config.cover?.title || "戰略會議報告";
    const safeTitle = rawTitle.replace(/[\/\?<>\\:\*\|":\s]/g, '_'); 
    const safeDate = config.sessionDate || "未定日期";
    const fileNameBase = `${safeTitle}_${safeDate}`;

    await new Promise((r) => setTimeout(r, 1500));
    const target = document.getElementById("full-report-export-target");

    if (!target) {
      alert("匯出畫布建置失敗，請重新整理網頁後再試。");
      setIsExporting(false);
      return;
    }

    try {
      if (format === 'png') {
        const canvas = await window.html2canvas(target, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#F8FAFC", windowWidth: 1200, logging: false, removeContainer: true });
        if(canvas.width === 0 || canvas.height === 0) throw new Error("畫面擷取為空");
        const link = document.createElement("a");
        link.download = `${fileNameBase}_合併長圖.png`;
        link.href = canvas.toDataURL("image/png", 1.0);
        link.click();

      } else if (format === 'zip') {
        const zip = new window.JSZip();
        const folder = zip.folder(fileNameBase);
        const sections = target.querySelectorAll('[data-export-section]');

        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];
          const canvas = await window.html2canvas(section, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#F8FAFC", windowWidth: 1200, logging: false, removeContainer: true, ignoreElements: (el) => el.tagName === 'IFRAME' });
          const base64Data = canvas.toDataURL("image/png", 1.0).replace(/^data:image\/(png|jpg);base64,/, "");
          const type = section.getAttribute('data-export-section');
          let fileName = type === 'cover'
            ? `00_會議封面.png`
            : type === 'agenda'
            ? `01_議程總覽.png`
            : `${String(i + 2).padStart(2, '0')}_${section.getAttribute('data-topic-title') || type}.png`;
          folder.file(fileName, base64Data, { base64: true });
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(zipBlob);
        link.download = `${fileNameBase}_獨立報告圖檔集.zip`;
        link.click();

      } else if (format === 'pdf') {
        // ==========================================
        // PDF 匯出核心邏輯（修正版）
        //
        // 原則：
        // 1. 封面 → 整頁深色滿版
        // 2. 議程目錄 → 新頁開始；以議程目錄第一個 block 的寬高計算
        //    「統一縮放比例 (unifiedScale)」，後續所有 block 均沿用此比例
        // 3. 每個 Topic → 強制換新頁，並沿用 unifiedScale
        // 4. Topic 內的子 block（如筆記段落、圖片）→ 若放不下就再換頁，
        //    但不強制新頁（除非是 Topic 的第一個 block）
        // ==========================================
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
        const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
        const margin = 10; // mm
        const usableHeight = pdfHeight - margin * 2;         // 277mm

        const blocks = target.querySelectorAll('[data-pdf-block="true"]');
        if (blocks.length === 0) throw new Error("無可用匯出的報告區塊");

        let isFirstPage = true;
        let currentY = margin;

        // ── 第一步：以「A4 可用寬度 / 渲染來源寬度 1200px」為統一縮放基準 ──
// 所有非封面 block 均以此比例縮放，確保 1:1 等比例呈現於 A4 頁面
const unifiedScale = pdfWidth / 210 * (210 / pdfWidth); // 恆等於 1，接著由下方實際比例覆蓋
// 實際比例：PDF 可用寬 210mm 對應 1200px，1px = 210/1200 mm
// 因此每個 block 的 mm 寬 = canvas.width/2（scale=2）* (210/1200)
// 統一以「議程目錄頭部 ExportHeader block」的縮放係數為基準：
// ExportHeader 渲染寬度固定 1200px → 對應 PDF 可用寬 pdfWidth(210mm) → scale = 1.0
// 不再動態量測，直接以 pdfWidth / (1200 * (2/2)) * mm_per_px 計算
const MM_PER_PX = pdfWidth / 1200; // 每 px 對應多少 mm（scale=2 已在 canvas 內部處理）

        // ── 第二步：逐一處理每個 pdf-block ──
        // 紀錄目前所在的 section（用 data-export-section 判斷）
        let lastSectionKey = null; // 格式："cover" | "agenda" | "topic-<id>"

        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i];
          const isFullPage = block.getAttribute('data-pdf-full-page') === 'true';

          // 找出此 block 所屬的 section
          const sectionEl = block.closest('[data-export-section]');
          const sectionType = sectionEl?.getAttribute('data-export-section') || null;
          // sectionType 本身已包含唯一 ID（如 "topic-Topic 1"），直接使用
          const sectionKey = sectionType;

          // 判斷是否為新的 section 起點
          const isNewSection = sectionKey !== null && sectionKey !== lastSectionKey;
          if (isNewSection) lastSectionKey = sectionKey;

          // ── 封面：整頁深色滿版 ──
          if (isFullPage) {
            if (!isFirstPage) pdf.addPage();
            pdf.setFillColor(10, 15, 28);
            pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

            const coverWrapper = document.createElement('div');
            coverWrapper.style.cssText = `position:fixed;top:-99999px;left:-99999px;width:1200px;background:#0A0F1C;pointer-events:none;`;
            const coverClone = block.cloneNode(true);
            disableAnimations(coverClone);
            coverWrapper.appendChild(coverClone);
            document.body.appendChild(coverWrapper);
            await new Promise(r => setTimeout(r, 80));
            let coverCanvas;
            try {
              coverCanvas = await window.html2canvas(coverWrapper, {
                scale: 2, useCORS: true, allowTaint: true,
                backgroundColor: '#0A0F1C', windowWidth: 1200, logging: false,
              });
            } finally {
              document.body.removeChild(coverWrapper);
            }
            if (coverCanvas && coverCanvas.width > 0) {
              pdf.addImage(coverCanvas.toDataURL("image/jpeg", 0.95), 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }
            isFirstPage = false;
            currentY = pdfHeight; // 封面用掉整頁
            continue;
          }

  

          // ── 強制換新頁：每個新 section 的第一個 block 必定換頁 ──
          // 直接用 isNewSection 判斷，不再依賴 isSectionFirstBlock（避免 DOM 查找失敗）
          if (isNewSection) {
            if (!isFirstPage) {
              pdf.addPage();
              pdf.setFillColor(248, 250, 252);
              pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
            } else {
              pdf.setFillColor(248, 250, 252);
              pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
            }
            currentY = margin;
            isFirstPage = false;
          }

          // 截圖此 block
          const wrapper = document.createElement('div');
          wrapper.style.cssText = `position:fixed;top:-99999px;left:-99999px;width:1200px;background:#F8FAFC;pointer-events:none;`;
          const clone = block.cloneNode(true);
          disableAnimations(clone);
          wrapper.appendChild(clone);
          document.body.appendChild(wrapper);
          await new Promise(r => setTimeout(r, 80));

          let canvas;
          try {
            canvas = await window.html2canvas(wrapper, {
              scale: 2, useCORS: true, allowTaint: true,
              backgroundColor: '#F8FAFC', windowWidth: 1200, logging: false,
            });
          } finally {
            document.body.removeChild(wrapper);
          }

          if (!canvas || canvas.width === 0 || canvas.height === 0) continue;

          const imgData = canvas.toDataURL("image/jpeg", 0.95);

          // ── 套用 MM_PER_PX 等比縮放（canvas scale=2，故除以 2）──
          // canvas.width 是 scale=2 下的像素寬，實際對應 1200px → pdfWidth mm
          const scaledWidth = (canvas.width / 2) * MM_PER_PX;
          const scaledHeight = (canvas.height / 2) * MM_PER_PX;
          const xOffset = (pdfWidth - scaledWidth) / 2;

          // ── 換頁判斷：放不下就換頁（section 首 block 已在前面強制換頁）──
          if (currentY + scaledHeight > pdfHeight - margin && currentY > margin + 5) {
            pdf.addPage();
            pdf.setFillColor(248, 250, 252);
            pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
            currentY = margin;
          }

          pdf.addImage(imgData, 'JPEG', xOffset, currentY, scaledWidth, scaledHeight);
          currentY += scaledHeight + 3;

          // 更新 isFirstPage flag
          if (isFirstPage) isFirstPage = false;
        }

        pdf.save(`${fileNameBase}.pdf`);
      }
    } catch (err) { 
      console.error(err); 
      alert("匯出過程中發生錯誤，請重試。\n" + (err?.message || String(err)));
    } finally {
      setIsExporting(false); 
    }
  };

  // 輔助函式：停用動畫與濾鏡（避免 html2canvas 渲染異常）
  function disableAnimations(el) {
    el.querySelectorAll('*').forEach(child => {
      try {
        child.style.animation = 'none';
        child.style.transition = 'none';
        child.style.backdropFilter = 'none';
        child.style.webkitBackdropFilter = 'none';
      } catch(e) {}
    });
  }

  const exportConfigJSON = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    const rawTitle = config.cover?.title || "戰略會議專案";
    const safeTitle = rawTitle.replace(/[\/\?<>\\:\*\|":\s]/g, '_');
    const safeDate = config.sessionDate || "未定日期";
    linkElement.setAttribute("download", `${safeTitle}_${safeDate}.json`);
    linkElement.click();
  };

  const importConfigJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.topics) {
          imported.topics = imported.topics.map((t) => ({
            ...t, images: t.images || (t.previewContent ? [t.previewContent] : []),
          }));
        }
        setTempConfig({ ...INITIAL_CLEAN_CONFIG, ...imported });
      } catch (err) {
        console.error("專案檔案讀取失敗", err);
        alert("無法讀取專案，檔案可能已損毀或格式不正確。");
      }
    };
    reader.readAsText(file);
  };

  const appendQuickTag = (tagPrefix) => {
    const targetTopic = config.topics.find((t) => t.id === activePage);
    if (!targetTopic) return;
    const currentNotes = targetTopic.notes || "";
    const separator = currentNotes.length > 0 && !currentNotes.endsWith("\n") ? "\n" : "";
    updateTopic(targetTopic.id, "notes", currentNotes + separator + tagPrefix + " ");
    setTimeout(() => { if (notesRef.current) notesRef.current.focus(); }, 10);
  };

  const addTopic = () => {
    const nextNum = (tempConfig.topics || []).length + 1;
    setTempConfig((prev) => ({
      ...prev,
      topics: [
        ...(prev.topics || []),
        { id: `Topic ${nextNum}`, title: `新議題 ${nextNum}`, desc: "", status: "discussing", notes: "", systems: [], images: [] },
      ],
    }));
  };

  const updateTopic = (id, field, value) => {
    setConfig((prev) => ({ ...prev, topics: prev.topics.map((t) => t.id === id ? { ...t, [field]: value } : t) }));
  };

  const moveTopic = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === tempConfig.topics.length - 1)) return;
    const newTopics = [...tempConfig.topics];
    const temp = newTopics[index];
    newTopics[index] = newTopics[index + direction];
    newTopics[index + direction] = temp;
    setTempConfig({ ...tempConfig, topics: newTopics });
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image(); img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1920; const MAX_HEIGHT = 1920;
          let width = img.width; let height = img.height;
          if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
          else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, width, height); ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
      };
    });
  };

  const currentTopic = (config.topics || []).find((t) => t.id === activePage);
  const currentTopicImages = currentTopic?.images?.length > 0 ? currentTopic.images : currentTopic?.previewContent ? [currentTopic.previewContent] : [];
  const displayConfig = isConfigOpen && tempConfig ? tempConfig : config;

  const selectedTopicsList = config.topics?.filter(t => exportSelection[t.id]) || [];

  const exportHeaderJSX = (
    <div className="w-full px-20 pt-16 pb-6 bg-[#F8FAFC]">
      <div className="flex justify-between items-end border-b-[3px] border-[#B89F5D]/30 pb-6">
        <div className="flex flex-col gap-3">
          <span className="text-[14px] font-black text-[#B89F5D] tracking-[0.3em] uppercase">Strategic Session Record</span>
          <span className="text-4xl font-black text-slate-800 tracking-tight">{config.cover?.title || "未命名戰略會議"}</span>
        </div>
        <div className="text-xl font-bold text-slate-600 bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
          <Calendar className="w-5 h-5" /> {config.sessionDate || "TBD"}
        </div>
      </div>
    </div>
  );

  const renderFullReportExport = () => {
    return (
      <div id="full-report-export-target" className="text-slate-800 bg-[#F8FAFC]" style={{ width: "1200px", fontFamily: FONT_FAMILY }}>
        
        {exportSelection.cover && (
          <div data-export-section="cover" data-pdf-block="true" data-pdf-full-page="true" className="w-full flex flex-row items-center justify-between px-20 bg-[#0A0F1C] border-b-[24px] border-[#B89F5D] relative overflow-hidden" style={{ height: "1697px" }}>
            <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-bl from-[#338F88]/20 via-[#B89F5D]/10 to-transparent rounded-full blur-[100px] pointer-events-none" />
            
            <div className="w-[55%] flex flex-col justify-center text-white relative z-10">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-12 h-1.5 bg-[#B89F5D] rounded-full" />
                <span className="text-[#B89F5D] font-black tracking-[0.4em] text-2xl uppercase">Strategic Session</span>
              </div>
              <h1 className="font-bold mb-10 tracking-tight leading-[1.25] drop-shadow-lg whitespace-pre-wrap" style={{ fontSize: `${config.cover?.titleFontSize || 72}px` }}>
                {config.cover?.title || "未命名會議"}
              </h1>
              {config.cover?.desc && <p className="text-3xl text-slate-300 mb-16 leading-[1.8] font-medium border-l-4 border-[#338F88] pl-8 text-left">{config.cover?.desc}</p>}
              
              <div className="flex gap-16 py-10 border-t border-white/10 w-full max-w-[700px]">
                <div className="flex flex-col"><span className="text-lg text-slate-500 font-bold uppercase tracking-[0.2em] mb-3">Meeting Date</span><span className="text-2xl font-bold text-slate-200 flex items-center gap-3"><Calendar className="w-6 h-6 text-[#B89F5D]" /> {config.sessionDate || "TBD"}</span></div>
                <div className="flex flex-col"><span className="text-lg text-slate-500 font-bold uppercase tracking-[0.2em] mb-3">Attendees</span><span className="text-2xl font-bold text-slate-200 flex items-center gap-3"><Users className="w-6 h-6 text-[#B89F5D]" /> {getAttendeePreview(config.attendees)}</span></div>
              </div>
            </div>

            <div className="w-[40%] flex flex-col justify-center items-center relative z-10">
              <div className="w-48 h-48 bg-gradient-to-br from-[#B89F5D]/30 to-[#338F88]/20 rounded-[40px] rotate-45 border border-white/10 flex items-center justify-center">
                <div className="w-32 h-32 bg-[#0A0F1C] rounded-[24px] border border-white/10 flex items-center justify-center">
                  <div className="w-12 h-12 bg-gradient-to-tr from-[#B89F5D] to-[#FCEBAF] rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        )}

        {exportSelection.agenda && config.topics?.length > 0 && (
          <div data-export-section="agenda" className="w-full bg-[#F8FAFC] pb-10">
            {exportHeaderJSX}
            <div data-pdf-block="true" className="w-full bg-[#F8FAFC]">
              {exportHeaderJSX}
              <div className="px-20 pt-6 pb-10">
              <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-16 py-10 border-b border-slate-100">
                  <h2 className="text-5xl font-black text-slate-900 flex items-center gap-6">
                    <div className="w-4 h-12 bg-[#B89F5D] rounded-full"></div> 議程目錄
                  </h2>
                </div>
                 </div>
            </div>
                {config.topics.map((t, idx, arr) => (
                  <div key={`agenda-${t.id}`} className={`px-16 py-8 flex gap-10 items-start ${idx !== arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <div className="text-5xl font-black text-[#338F88]/30 w-16 pt-1">{String(idx + 1).padStart(2, "0")}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-xl font-bold text-[#B89F5D] tracking-widest uppercase">{t.id}</span>
                        <span className={`px-4 py-1.5 rounded-lg text-sm font-bold ${t.status === "resolved" ? "bg-[#338F88]/10 text-[#338F88]" : "bg-slate-100 text-slate-500"}`}>{t.status === "resolved" ? "已決議" : "討論中"}</span>
                      </div>
                      <h3 className="text-4xl font-bold text-slate-900 leading-tight mb-4">{t.title}</h3>
                      <p className="text-2xl text-slate-600 leading-relaxed opacity-90 whitespace-pre-wrap">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTopicsList.map((t, index) => {
          const images = t.images?.length > 0 ? t.images : t.previewContent ? [t.previewContent] : [];
          return (
           <div data-export-section={`topic-${t.id}`} data-topic-title={t.title} key={`topic-${t.id}`} className="w-full bg-[#F8FAFC] pb-10">
              <div data-pdf-block="true" className="w-full bg-[#F8FAFC]">
                {exportHeaderJSX}
                <div className="px-20 pt-8 pb-10">
                <div className="bg-white px-16 py-14 rounded-[40px] shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-lg font-black tracking-widest uppercase text-slate-400 bg-slate-100 px-4 py-1.5 rounded-full">{t.id}</span>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${t.status === "resolved" ? "bg-[#F2F9F8] text-[#338F88] border-[#338F88]/20" : "bg-[#FDF9F0] text-[#B89F5D] border-[#B89F5D]/20"}`}>
                      {t.status === "resolved" ? "決議完成 RESOLVED" : "尚在討論 IN PROGRESS"}
                    </span>
                  </div>
                    </div>
                  <h2 className="text-[57px] font-black text-slate-900 leading-[1.3] tracking-tight mb-8">
                    {t.title}
                  </h2>
                  {t.desc && (
                    <div className="border-l-8 border-[#B89F5D] bg-slate-50 p-8 rounded-r-3xl text-2xl text-slate-700 leading-relaxed font-medium mt-8 whitespace-pre-wrap">
                      {t.desc}
                    </div>
                  )}
                </div>
              </div>

              {t.notes && (
                <div data-pdf-block="true" className="w-full px-20 pt-2 mb-6">
                  <div className="bg-[#0F172A] rounded-[40px] px-14 pt-7 pb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-bl-full pointer-events-none" />
                    <h3 className="text-2xl font-bold text-[#B89F5D] mb-4 flex items-center gap-5 uppercase tracking-widest"><Edit3 className="w-8 h-8" /> Live Resolution Note</h3>
                    {t.notes.split('\n').map((para, i) => (
                      <div key={i} className="text-[26px] text-slate-100 leading-[1.8] font-medium whitespace-pre-wrap min-h-[2rem]">{para || " "}</div>
                    ))}
                  </div>
                </div>
              )}

              {images.length > 0 && (
                <div data-pdf-block="true" className="w-full px-20 pb-6 pt-4">
                  <h3 className="text-2xl font-bold text-slate-400 flex items-center gap-4 uppercase tracking-widest pl-4"><ImageIcon className="w-8 h-8" /> Visual Assets</h3>
                </div>
              )}
              {images.map((img, imgIdx) => (
                <div data-pdf-block="true" key={`img-${t.id}-${imgIdx}`} className="w-full px-20 pb-12">
                  <div className="bg-white rounded-[40px] p-10 shadow-sm flex flex-col items-center border border-slate-200">
                    <img src={img} className="max-w-full rounded-2xl" style={{ maxHeight: "1100px" }} alt={`img-${imgIdx}`} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <style>{`
        .custom-scrollbar-dark::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background: rgba(184, 159, 93, 0.6); }

        .custom-scrollbar-light::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-light::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.15); border-radius: 10px; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb:hover { background: rgba(51, 143, 136, 0.6); }
      `}</style>

      {/* 隱藏的完整報告渲染區塊 */}
      <div style={{ position: "fixed", top: "-99999px", left: "-99999px", width: "1200px", pointerEvents: "none", zIndex: -1 }}>
        {renderFullReportExport()}
      </div>

      {/* 匯出中遮罩 */}
      {isExporting && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,15,28,0.85)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
          <div style={{ width: "48px", height: "48px", border: "4px solid rgba(184,159,93,0.3)", borderTop: "4px solid #B89F5D", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "#B89F5D", fontWeight: "bold", fontSize: "16px", letterSpacing: "0.2em" }}>正在產生 PDF，請稍候...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div className="h-screen flex overflow-hidden bg-[#0A0F1C] text-slate-800" style={{ fontFamily: FONT_FAMILY }}>
        <aside className={`bg-[#0A0F1C] border-r border-slate-800 flex flex-col z-40 relative transition-all duration-500 ease-in-out overflow-hidden shrink-0 ${isSidebarOpen ? "w-[320px]" : "w-[88px]"}`}>
          <div className="pt-10 pb-6 flex-1 overflow-y-auto custom-scrollbar-dark flex flex-col items-center">
            
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`flex items-center mb-8 text-[#B89F5D] hover:text-[#FCEBAF] transition-all duration-300 cursor-pointer group outline-none ${isSidebarOpen ? 'w-full px-8 justify-start' : 'w-full justify-center'}`} title={isSidebarOpen ? "收起側欄" : "展開側欄"}>
              <div className="w-5 h-5 bg-[#B89F5D] group-hover:bg-[#FCEBAF] group-hover:scale-110 rounded-sm rotate-45 shrink-0 transition-all duration-300 shadow-sm" />
              <h1 className={`font-bold tracking-[0.2em] text-[10px] uppercase whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100 max-w-[200px] ml-3' : 'opacity-0 max-w-0 ml-0'}`}>
                Strategic Navigator
              </h1>
            </button>

            {!isViewer && (
              <div className={`mb-10 transition-all duration-500 flex items-center justify-center w-full ${isSidebarOpen ? "px-6" : "px-0"}`}>
                <div className={`relative flex items-center justify-center rounded-[20px] bg-[#0F172A] border shadow-lg overflow-hidden transition-all duration-500 ${isSidebarOpen ? "w-full py-5 px-4 border-slate-700/60" : "w-[68px] h-12 border-slate-700/30"}`}>
                  <div className={`flex flex-col items-center justify-center transition-all duration-500 ${isSidebarOpen ? "opacity-100 scale-100" : "opacity-0 scale-50 absolute pointer-events-none"}`}>
                    <span className="text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase mb-1.5">
                      Current Time
                    </span>
                    <span className="text-white font-mono text-3xl tracking-widest font-bold drop-shadow-md">
                      {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={`absolute flex items-center justify-center transition-all duration-500 ${isSidebarOpen ? "opacity-0 scale-50 pointer-events-none" : "opacity-100 scale-100"}`}>
                    <div className="relative flex items-center justify-center">
                      <span className="text-[#B89F5D] font-mono text-[14px] font-bold tracking-widest">
                        {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <nav className="w-full flex flex-col min-h-[calc(100vh-250px)]">
              <div className="px-3 space-y-2">
                <button onClick={() => setActivePage("cover")} className={`w-full rounded-2xl font-bold flex items-center transition-all ${isSidebarOpen ? "px-4 py-3.5 text-[15px] justify-start" : "p-3.5 justify-center"} ${activePage === "cover" ? "bg-white/10 text-[#B89F5D]" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
                  {!isSidebarOpen ? <Home className="w-5 h-5" /> : "會議首頁"}
                </button>
                <button onClick={() => setActivePage("agenda")} className={`w-full mt-1 rounded-2xl font-bold flex items-center transition-all ${isSidebarOpen ? "px-4 py-3.5 text-[15px] justify-start" : "p-3.5 justify-center"} ${activePage === "agenda" ? "bg-white/10 text-[#B89F5D]" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
                  {!isSidebarOpen ? <List className="w-5 h-5" /> : "議程目錄"}
                </button>
              </div>

              <div className={`py-6 flex-1 flex flex-col ${isSidebarOpen ? "px-3" : "items-center px-0"}`}>
                <p className={`text-xs font-black text-slate-500 uppercase tracking-widest mb-4 transition-all duration-300 overflow-hidden ${isSidebarOpen ? "max-h-[20px] px-4 block text-left opacity-100" : "max-h-0 text-[8px] px-0 text-center scale-90 opacity-0"}`}>
                  {isSidebarOpen ? "議題進度清單" : "TOPICS"}
                </p>
                <div className={`w-full flex flex-col space-y-1 ${!isSidebarOpen && "items-center"}`}>
                  {config.topics?.map((t, idx) => (
                    <div key={t.id} onClick={() => setActivePage(t.id)} className={`group cursor-pointer rounded-xl font-bold flex items-center transition-all ${isSidebarOpen ? "w-full px-4 py-3 gap-3 text-[15px] justify-start" : "w-11 h-11 justify-center relative my-1"} ${activePage === t.id ? isSidebarOpen ? "bg-white/10 text-[#B89F5D]" : "bg-white/10 text-[#B89F5D] ring-1 ring-[#B89F5D]" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
                      {isSidebarOpen ? (
                        <>
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0`} style={{ backgroundColor: t.status === "resolved" ? "#338F88" : "#B89F5D" }} />
                          <span className="truncate flex-1 text-left select-none">{t.title}</span>
                          {!isViewer && (
                            <button onClick={(e) => { e.stopPropagation(); updateTopic(t.id, "status", t.status === "resolved" ? "discussing" : "resolved"); }} className="p-1.5 rounded-md hover:bg-white/20 transition-colors shrink-0 flex items-center justify-center">
                              {t.status === "resolved" ? <CheckCircle className="w-4 h-4 text-[#338F88]" /> : <CheckCircle className="w-4 h-4 opacity-0 group-hover:opacity-40 transition-opacity" />}
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-[13px] font-mono tracking-tighter z-10">{String(idx + 1).padStart(2, '0')}</span>
                          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full z-20" style={{ backgroundColor: t.status === "resolved" ? "#338F88" : "transparent" }} />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {!isViewer && (
                <div className={`mt-auto pt-4 pb-6 border-t border-slate-800/50 flex flex-col gap-2 px-4 w-full`}>
                  <button onClick={generateShareLink} disabled={isGeneratingLink} className={`w-full py-3 rounded-xl border border-slate-700/50 bg-[#0F172A] text-slate-400 hover:bg-[#338F88]/10 hover:border-[#338F88]/40 hover:text-[#338F88] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50`} title="推送到雲端並產生永久連結">
                    <Share2 className="w-4 h-4" />
                    {isSidebarOpen && <span className="text-[12px] font-bold tracking-wider">{isGeneratingLink ? "處理中..." : "分享連結"}</span>}
                  </button>
                  <div className={`flex ${isSidebarOpen ? 'flex-row' : 'flex-col'} gap-2 w-full`}>
                    <button onClick={() => openExportModal('pdf')} disabled={isExporting} className={`flex-1 py-3 rounded-xl border border-slate-700/50 bg-[#0F172A] text-slate-400 hover:bg-[#B89F5D]/10 hover:border-[#B89F5D]/40 hover:text-[#B89F5D] transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm disabled:opacity-50`} title="匯出 1:1 等比例 PDF">
                      <FileDown className={`w-4 h-4 ${isExporting && exportFormat === 'pdf' ? 'animate-bounce text-[#B89F5D]' : ''}`} />
                      {isSidebarOpen && <span className="text-[11px] font-bold tracking-wider">匯出 PDF</span>}
                    </button>
                    <button onClick={() => openExportModal('png')} disabled={isExporting} className={`flex-1 py-3 rounded-xl border border-slate-700/50 bg-[#0F172A] text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm disabled:opacity-50`} title="選擇內容並合併成單一長圖">
                      <ImageIcon className={`w-4 h-4 ${isExporting && exportFormat === 'png' ? 'animate-pulse text-white' : ''}`} />
                      {isSidebarOpen && <span className="text-[11px] font-bold tracking-wider">合併長圖</span>}
                    </button>
                    <button onClick={() => openExportModal('zip')} disabled={isExporting} className={`flex-1 py-3 rounded-xl border border-slate-700/50 bg-[#0F172A] text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm disabled:opacity-50`} title="按議題各自打包為 ZIP">
                      <Archive className={`w-4 h-4 ${isExporting && exportFormat === 'zip' ? 'animate-pulse text-white' : ''}`} />
                      {isSidebarOpen && <span className="text-[11px] font-bold tracking-wider">打包 ZIP</span>}
                    </button>
                  </div>
                </div>
              )}
            </nav>
          </div>
        </aside>

        <main ref={scrollContainerRef} className={`flex-1 relative overflow-y-auto custom-scrollbar-light transition-all duration-500 ${activePage === "cover" ? "bg-[#0A0F1C]" : "bg-slate-50"} ${isNotesOpen ? "rounded-l-[48px] shadow-2xl" : ""}`}>
          {!isViewer && (
            <div className="fixed top-8 right-8 z-50 flex items-center gap-3">
              <button onClick={openConfig} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm opacity-50 hover:opacity-100 backdrop-blur-sm ${activePage === "cover" ? "bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white" : "bg-white text-slate-400 border border-slate-200 hover:text-slate-800 hover:border-slate-300"}`} title="打開控制中心設定">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex-1 w-full relative">
            {activePage === "cover" && (
              <div className="min-h-screen flex flex-col justify-center px-8 md:px-16 pt-32 pb-16 text-white relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-gradient-to-bl from-[#338F88]/20 via-[#B89F5D]/5 to-transparent rounded-full blur-[120px] opacity-40 pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-[#0F172A] rounded-full blur-[120px] opacity-80 pointer-events-none" />
                
                <div className="z-10 w-full max-w-[1200px] mx-auto relative flex flex-col lg:flex-row items-center justify-between gap-12">
                  <div className="w-full lg:w-[55%] relative z-10 flex flex-col justify-center">
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-12 h-1.5 bg-[#B89F5D] rounded-full" />
                      <span className="text-[#B89F5D] font-black tracking-[0.4em] text-xs md:text-sm uppercase">Strategic Session</span>
                    </div>
                    <h1 className="font-bold mb-10 tracking-tight leading-[1.25] drop-shadow-lg break-words whitespace-pre-wrap transition-all duration-300" style={{ fontSize: `clamp(36px, ${displayConfig.cover?.titleFontSize || 72}px, 88px)` }}>
                      {displayConfig.cover?.title || "未命名會議"}
                    </h1>
                    {displayConfig.cover?.desc && <p className="text-[16px] md:text-[18px] text-slate-300 mb-12 max-w-[600px] leading-[1.8] font-medium border-l-[5px] border-[#338F88] pl-6">{displayConfig.cover?.desc}</p>}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 py-8 border-y border-white/10 w-full max-w-[650px]">
                      <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Meeting Date</span><span className="text-sm md:text-[15px] font-bold text-slate-200 flex items-center gap-2"><Calendar className="w-4 h-4 text-[#B89F5D]" /> {displayConfig.sessionDate || "TBD"}</span></div>
                      <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Attendees</span><span className="text-sm md:text-[15px] font-bold text-slate-200 flex items-center gap-2 truncate" title={displayConfig.attendees}><Users className="w-4 h-4 text-[#B89F5D]" /> {getAttendeePreview(displayConfig.attendees)}</span></div>
                      <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Agenda</span><span className="text-sm md:text-[15px] font-bold text-[#B89F5D] flex items-center gap-2"><ClipboardList className="w-4 h-4" /> {displayConfig.topics?.length || 0} ITEMS</span></div>
                    </div>
                    <button onClick={() => { if (displayConfig.topics?.length > 0) setActivePage("agenda"); else if (!isViewer) openConfig(); }} className="px-6 py-3.5 bg-white text-[#0A0F1C] rounded-2xl font-bold text-[15px] flex items-center gap-3 transition-all hover:bg-slate-200 shadow-xl group w-fit">
                      {displayConfig.topics?.length > 0 ? "開始進行會議" : isViewer ? "目前無會議議題" : "設定會議內容"} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                  
                  <div className="hidden lg:flex w-[45%] justify-center items-center pointer-events-none z-0 relative">
                    <div className="relative w-[360px] h-[360px] xl:w-[460px] xl:h-[460px] flex justify-center items-center">
                      <div className="absolute inset-0 border border-white/5 rounded-full animate-[spin_60s_linear_infinite]" />
                      <div className="absolute inset-10 border border-[#B89F5D]/20 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
                      <div className="absolute inset-20 border border-dashed border-[#338F88]/30 rounded-full animate-[spin_80s_linear_infinite]" />

                      <div className="w-64 h-64 bg-gradient-to-br from-[#B89F5D]/80 to-[#338F88]/80 rounded-[40px] rotate-45 shadow-[0_0_100px_rgba(184,159,93,0.2)] backdrop-blur-3xl flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />
                        <div className="w-56 h-56 bg-[#0A0F1C] rounded-[32px] flex items-center justify-center border border-white/10 shadow-inner relative overflow-hidden">
                          <div className="w-24 h-24 bg-gradient-to-tr from-[#B89F5D] to-[#FCEBAF] rounded-2xl shadow-[0_0_50px_rgba(252,235,175,0.4)] animate-pulse" />
                        </div>
                      </div>

                      <div className="absolute top-12 right-0 bg-[#0F172A]/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl transform translate-x-8 hover:-translate-y-1 transition-transform">
                        <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase block mb-1.5">System Status</span>
                        <span className="text-sm font-bold text-[#338F88] flex items-center gap-2">
                          <div className="w-2 h-2 bg-[#338F88] rounded-full animate-ping" />{" "}Synchronized
                        </span>
                      </div>

                      <div className="absolute bottom-16 left-0 bg-[#0F172A]/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl transform -translate-x-4 hover:-translate-y-1 transition-transform">
                        <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase block mb-1.5">Active Workspace</span>
                        <span className="text-sm font-bold text-white flex items-center gap-2">
                          <Layout className="w-4 h-4 text-[#B89F5D]" /> Board Ready
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePage === "agenda" && (
              <div className="min-h-screen px-8 md:px-16 pt-32 pb-24 mx-auto w-full max-w-[1000px] xl:max-w-[1200px] transition-all flex flex-col justify-start">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-1 bg-[#B89F5D] rounded-full" />
                  <span className="text-[#B89F5D] font-black tracking-[0.4em] text-[11px] md:text-xs uppercase">Meeting Agenda</span>
                </div>
                <h2 className="text-[36px] md:text-[48px] font-black text-slate-900 mb-10 leading-tight tracking-tighter">議程目錄</h2>
                <div className="space-y-6 w-full">
                  {config.topics?.length > 0 ? config.topics.map((t, idx) => (
                    <div key={t.id} onClick={() => setActivePage(t.id)} className="group p-8 md:p-10 bg-white border border-slate-200 rounded-[32px] hover:border-[#338F88] hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col md:flex-row gap-6 md:gap-8 md:items-start relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-transparent group-hover:bg-[#338F88] transition-colors" />
                      <div className="text-[40px] md:text-[48px] leading-none font-black text-slate-100 group-hover:text-[#338F88]/10 transition-colors w-16 md:w-20 shrink-0 font-mono tracking-tighter pt-1">{String(idx + 1).padStart(2, "0")}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <span className="text-[12px] font-bold text-[#B89F5D] tracking-widest uppercase">{t.id}</span>
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${t.status === "resolved" ? "bg-[#338F88]/10 text-[#338F88]" : "bg-slate-100 text-slate-500"}`}>{t.status === "resolved" ? "已決議" : "討論中"}</span>
                        </div>
                        <h3 className="text-[22px] md:text-[28px] lg:text-[32px] font-bold text-slate-900 mb-3 group-hover:text-[#338F88] transition-colors leading-[1.3] tracking-tight">{t.title}</h3>
                        <p className="text-[15px] md:text-[16px] text-slate-600 font-medium whitespace-pre-wrap leading-[1.8] max-w-3xl opacity-90">{t.desc || "無議題描述"}</p>
                      </div>
                    </div>
                  )) : (<div className="py-20 text-center text-slate-400 font-medium bg-white rounded-[32px] border border-dashed border-slate-300">尚未建立任何議題</div>)}
                </div>
              </div>
            )}

            {currentTopic && activePage !== "agenda" && activePage !== "cover" && activePage !== "summary" && (
              <div className={`px-8 md:px-16 pt-32 pb-48 mx-auto w-full max-w-[1000px] xl:max-w-[1200px] transition-all`}>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                  <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-black text-slate-400 tracking-widest uppercase shadow-sm">{currentTopic.id}</span>
                  {!isViewer && (
                    <div className="flex gap-3 md:gap-4 items-center">
                      <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button onClick={() => updateTopic(currentTopic.id, "status", "discussing")} className={`px-4 py-1.5 rounded-lg text-[11px] md:text-xs font-bold transition-all ${currentTopic.status === "discussing" ? "bg-slate-50 shadow-sm text-amber-600" : "text-slate-400 hover:text-slate-600"}`}>討論中</button>
                        <button onClick={() => updateTopic(currentTopic.id, "status", "resolved")} className={`px-4 py-1.5 rounded-lg text-[11px] md:text-xs font-bold transition-all ${currentTopic.status === "resolved" ? "bg-[#338F88] text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>已決議</button>
                      </div>
                    </div>
                  )}
                </div>

                <h2 className="text-[34px] md:text-[46px] lg:text-[53px] font-black text-slate-900 mb-8 leading-[1.3] tracking-tight">
                  <span className="relative inline-block px-2"><span className="absolute bottom-[10%] left-[-2%] w-[104%] h-[40%] bg-[#FCEBAF] rounded-sm transform -rotate-1 z-0 shadow-[0_4px_12px_rgba(252,235,175,0.4)]"></span><span className="relative z-10">{currentTopic.title}</span></span>
                </h2>

                {currentTopic.desc && (
                  <div className="mb-16">
                    <div className="border-l-4 border-[#B89F5D] bg-white rounded-r-2xl p-6 md:p-8 shadow-sm transition-all hover:bg-slate-50/50">
                      <div className="text-[16px] md:text-[18px] text-slate-700 leading-[2] whitespace-pre-wrap font-medium">{currentTopic.desc}</div>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-[32px] md:rounded-[40px] p-1.5 md:p-2 overflow-hidden border border-slate-200 shadow-sm mb-16">
                  <div className="px-6 md:px-8 py-5 flex flex-wrap items-center justify-between border-b border-slate-100 gap-4">
                    <div className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-slate-400" /><span className="text-[11px] font-black text-slate-400 tracking-widest uppercase">Visual Assets & Collaboration</span></div>
                    {currentTopic.systems?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {currentTopic.systems.map((s, i) => (<a key={i} href={s.url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] font-bold text-slate-600 hover:border-[#338F88] hover:text-[#338F88] transition-all flex items-center gap-1 shadow-sm">{s.name} <ExternalLink className="w-3 h-3" /></a>))}
                      </div>
                    )}
                  </div>

                  <div className="min-h-[300px] bg-slate-50/50 rounded-[28px] md:rounded-[36px] flex flex-col items-center justify-center p-6 md:p-10 gap-12 relative">
                    {currentTopicImages.length > 0 ? (
                      currentTopicImages.map((img, i) => (
                        <div key={i} className="w-full flex flex-col items-center group relative bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 border border-slate-100 shadow-sm">
                          <img src={img} className="max-w-full max-h-[600px] md:max-h-[800px] object-contain rounded-xl md:rounded-2xl cursor-zoom-in hover:scale-[1.01] transition-transform" onClick={() => setFullscreenImg(img)} alt={`Topic img ${i + 1}`} />
                        </div>
                      ))
                    ) : (<div className="flex flex-col items-center text-slate-300 font-medium text-xs md:text-sm gap-3 text-center"><ImageIcon className="w-12 h-12 opacity-30" /><span>尚未上傳議題視覺圖檔</span></div>)}
                  </div>
                </div>

                <div className="mt-16 pt-8 border-t border-slate-200 flex justify-center items-center gap-6 md:gap-8">
                  <button onClick={() => { const idx = config.topics.findIndex((t) => t.id === currentTopic.id); if (idx > 0) setActivePage(config.topics[idx - 1].id); else setActivePage("agenda"); }} className="text-slate-400 font-bold text-[13px] md:text-sm hover:text-slate-800 transition-all">
                    {config.topics.findIndex((t) => t.id === currentTopic.id) === 0 ? "← 回議程目錄" : "← 上一個議題"}
                  </button>
                  {config.topics.findIndex((t) => t.id === currentTopic.id) !== config.topics.length - 1 && (
                    <button onClick={() => { const idx = config.topics.findIndex((t) => t.id === currentTopic.id); if (idx < config.topics.length - 1) setActivePage(config.topics[idx + 1].id); }} className={`px-10 py-4 md:px-12 md:py-5 bg-[#0F172A] text-white rounded-full md:rounded-[24px] font-bold text-[14px] md:text-[15px] flex items-center gap-3 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 ${currentTopic.status === "resolved" ? "ring-4 ring-[#338F88]/30 animate-pulse" : ""}`}>
                      下一個議題 <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* 匯出選擇器 (Export Modal) */}
        {showExportModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-[500px] overflow-hidden flex flex-col">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-[20px] font-black text-slate-800 tracking-tight">選擇匯出內容</h3>
                  <p className="text-slate-500 text-[13px] mt-1 font-medium">請勾選要合併匯出為 {exportFormat === 'pdf' ? 'PDF' : exportFormat === 'png' ? '長圖' : 'ZIP 打包'} 的區塊</p>
                </div>
                <button onClick={() => setShowExportModal(false)} className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-slate-400 hover:text-slate-700 hover:shadow-sm border border-slate-200 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto max-h-[50vh] space-y-3 custom-scrollbar-light">
                <label className="flex items-center gap-4 cursor-pointer group p-3 rounded-2xl hover:bg-slate-50 transition-colors" onClick={() => toggleExportSelection('cover')}>
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${exportSelection.cover ? 'bg-[#338F88] border-[#338F88] shadow-[0_2px_8px_rgba(51,143,136,0.3)]' : 'bg-white border-slate-300 group-hover:border-[#338F88]'}`}>
                    {exportSelection.cover && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </div>
                  <span className="font-bold text-[16px] text-slate-700 pointer-events-none">會議首頁 (Cover)</span>
                </label>
                
                <label className="flex items-center gap-4 cursor-pointer group p-3 rounded-2xl hover:bg-slate-50 transition-colors" onClick={() => toggleExportSelection('agenda')}>
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${exportSelection.agenda ? 'bg-[#338F88] border-[#338F88] shadow-[0_2px_8px_rgba(51,143,136,0.3)]' : 'bg-white border-slate-300 group-hover:border-[#338F88]'}`}>
                    {exportSelection.agenda && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </div>
                  <span className="font-bold text-[16px] text-slate-700 pointer-events-none">議程目錄 (Agenda)</span>
                </label>
                
                {config.topics?.length > 0 && <div className="h-px bg-slate-200/60 my-4 mx-2"></div>}
                
                {config.topics?.map((t) => (
                  <label key={t.id} onClick={() => toggleExportSelection(t.id)} className="flex items-center gap-4 cursor-pointer group p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${exportSelection[t.id] ? 'bg-[#338F88] border-[#338F88] shadow-[0_2px_8px_rgba(51,143,136,0.3)]' : 'bg-white border-slate-300 group-hover:border-[#338F88]'}`}>
                      {exportSelection[t.id] && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex flex-col overflow-hidden pointer-events-none">
                      <span className="font-bold text-[13px] text-[#B89F5D] tracking-wider mb-0.5">{t.id}</span>
                      <span className="font-bold text-[16px] text-slate-700 truncate block w-full">{t.title}</span>
                    </div>
                  </label>
                ))}
              </div>
              
              <div className="p-8 bg-white border-t border-slate-100 flex gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.02)] relative z-10">
                <button onClick={() => setShowExportModal(false)} className="flex-[0.8] py-3.5 rounded-[16px] font-bold text-[15px] text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">取消</button>
                <button onClick={() => handleConfirmExport()} className="flex-[1.2] py-3.5 rounded-[16px] font-bold text-[15px] text-white bg-[#0F172A] hover:bg-[#1E293B] shadow-[0_10px_20px_rgba(15,23,42,0.2)] hover:shadow-[0_15px_25px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                  {isExporting ? <Clock className="w-4 h-4 animate-spin" /> : null}
                  確認匯出 {exportFormat === 'pdf' ? 'PDF' : exportFormat === 'png' ? '長圖' : 'ZIP'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 筆記與控制台等 UI 元件 */}
        <div className={`fixed inset-0 bg-slate-900/20 backdrop-blur-[4px] z-[90] transition-all duration-500 ${isNotesOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={() => setIsNotesOpen(false)} />
        <div className={`fixed bottom-12 right-12 w-[460px] h-[80%] bg-white/95 backdrop-blur-3xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] z-[100] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] rounded-[40px] border border-white flex flex-col overflow-hidden ${isNotesOpen ? "translate-y-0 scale-100 opacity-100" : "translate-y-20 scale-90 opacity-0 pointer-events-none"}`}>
          {currentTopic && activePage !== "agenda" && activePage !== "cover" && (
            <div className="h-full flex flex-col">
              <div className="px-8 pt-8 pb-3 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-black text-[#338F88] tracking-widest uppercase">Live Resolution Note</span></div>
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">{currentTopic.title}</h3>
                </div>
                <button onClick={() => setIsNotesOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-all"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 px-6 pb-4 mt-2">
                <div className="w-full h-full bg-slate-50/70 rounded-[24px] shadow-[inset_0_2px_12px_rgba(0,0,0,0.05)] border border-slate-200/50 p-6 focus-within:bg-white focus-within:shadow-[inset_0_4px_20px_rgba(0,0,0,0.03)] transition-all">
                  {isViewer ? (
                    <div className="w-full h-full overflow-y-auto text-[16px] leading-[1.8] text-slate-700 font-medium whitespace-pre-wrap custom-scrollbar-light">{currentTopic.notes || "此議題尚無筆記。"}</div>
                  ) : (
                    <textarea ref={notesRef} className="w-full h-full bg-transparent outline-none resize-none text-[16px] leading-[1.8] text-slate-700 font-medium placeholder:text-slate-300 no-scrollbar" value={currentTopic.notes || ""} onChange={(e) => { updateTopic(currentTopic.id, "notes", e.target.value); }} placeholder="在此記錄討論共識、行動決策或待辦清單..." />
                  )}
                </div>
              </div>
              {!isViewer && (
                <div className="px-8 pb-8 pt-2 flex flex-wrap gap-2">
                  {QUICK_TAGS.map((tag, i) => (<button key={i} onClick={() => appendQuickTag(tag.prefix)} className={`px-4 py-2 rounded-[12px] text-[11px] font-bold border backdrop-blur-sm transition-all shadow-sm active:scale-95 ${tag.color}`}>{tag.label}</button>))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 筆記按鈕 */}
        {!isNotesOpen && activePage !== "cover" && activePage !== "agenda" && (
          <button onClick={() => setIsNotesOpen(true)} className="fixed right-10 bottom-10 w-14 h-14 bg-[#0F172A] text-white rounded-full flex items-center justify-center shadow-[0_20px_40px_rgba(15,23,42,0.4)] z-40 hover:scale-110 hover:bg-[#1E293B] transition-all duration-300 group">
            {isViewer ? (
               <FileText className="w-6 h-6 text-[#B89F5D] group-hover:scale-110 transition-transform" />
            ) : (
               <Edit3 className="w-6 h-6 text-[#B89F5D] group-hover:rotate-12 transition-transform" />
            )}
          </button>
        )}

        <div className={`fixed inset-y-0 right-0 w-[420px] bg-white border-l border-slate-100 shadow-2xl z-[200] transition-all duration-500 ${isConfigOpen ? "translate-x-0" : "translate-x-full"}`}>
          {tempConfig && (
            <div className="h-full flex flex-col">
              <div className="p-6 bg-slate-50 border-b flex justify-between items-center"><h3 className="text-xl font-black text-slate-800">控制中心</h3><button onClick={() => setIsConfigOpen(false)} className="p-2 text-slate-400 hover:text-slate-900"><X className="w-5 h-5" /></button></div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar-light pb-32">
                <div className="flex gap-2">
                  <button onClick={exportConfigJSON} className="flex-1 flex items-center justify-center gap-1.5 py-3.5 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-lg"><FileDown className="w-4 h-4" /> 儲存</button>
                  <label className="flex-1 flex items-center justify-center gap-1.5 py-3.5 bg-[#B89F5D] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#A68F50] transition-colors shadow-lg"><Upload className="w-4 h-4" /> 讀取<input type="file" className="hidden" accept=".json" onChange={importConfigJSON} /></label>
                  <button onClick={() => { if (window.confirm("確定要清除所有會議資料嗎？")) { sessionStorage.removeItem("strategyMeetingData"); setTempConfig({...INITIAL_CLEAN_CONFIG}); setConfig({...INITIAL_CLEAN_CONFIG}); setIsConfigOpen(false); } }} className="flex-1 flex items-center justify-center gap-1.5 py-3.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-400 transition-colors shadow-sm border border-slate-200"><Trash2 className="w-4 h-4" /> 清除</button>
                </div>
                <div className="space-y-5">
                  <span className="text-[11px] font-black text-slate-400 tracking-widest uppercase">基本會議設定</span>
                  <div>
                    <div className="flex justify-between items-end mb-1.5 ml-1">
                      <label className="text-[13px] font-bold text-slate-500 block">會議標題</label>
                      <span className="text-[11px] font-bold text-[#338F88]">字體大小: {tempConfig.cover?.titleFontSize || 72}px</span>
                    </div>
                    <textarea className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold outline-none h-20 resize-none focus:border-[#338F88] no-scrollbar mb-2.5" value={tempConfig.cover?.title || ""} placeholder="在此輸入會議標題" onChange={(e) => setTempConfig({ ...tempConfig, cover: { ...tempConfig.cover, title: e.target.value } })} />
                    <div className="flex items-center gap-3 px-1 mb-4">
                      <span className="text-[11px] text-slate-400 font-bold">小</span>
                      <input type="range" min="32" max="120" step="2" className="flex-1 accent-[#338F88] h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" value={tempConfig.cover?.titleFontSize || 72} onChange={(e) => setTempConfig({ ...tempConfig, cover: { ...tempConfig.cover, titleFontSize: Number(e.target.value) } })} />
                      <span className="text-[11px] text-slate-400 font-bold">大</span>
                    </div>
                  </div>
                  <div><label className="text-[13px] font-bold text-slate-500 ml-1 mb-1.5 flex items-center gap-1.5">會議描述 / 背景</label><textarea className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold outline-none h-20 resize-none focus:border-[#338F88] no-scrollbar mb-2.5" value={tempConfig.cover?.desc || ""} placeholder="在此輸入會議副標題或描述" onChange={(e) => setTempConfig({ ...tempConfig, cover: { ...tempConfig.cover, desc: e.target.value } })} /></div>
                  <div><label className="text-[13px] font-bold text-slate-500 ml-1 mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> 會議日期</label><input type="date" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] outline-none" value={tempConfig.sessionDate || ""} onChange={(e) => setTempConfig({ ...tempConfig, sessionDate: e.target.value })} /></div>
                  <div><label className="text-[13px] font-bold text-slate-500 ml-1 mb-1.5 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> 與會人員</label><input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] outline-none" value={tempConfig.attendees || ""} onChange={(e) => setTempConfig({ ...tempConfig, attendees: e.target.value })} /></div>
                </div>
                <div className="space-y-5">
                  <div className="flex justify-between items-center"><span className="text-[11px] font-black text-slate-400 tracking-widest uppercase">議題細節編排</span><button onClick={addTopic} className="text-[12px] font-bold text-[#338F88] hover:underline">+ 新增議題</button></div>
                  <div className="space-y-4">
                    {tempConfig.topics?.map((t, tidx) => {
                      const currentEditImages = t.images?.length > 0 ? t.images : t.previewContent ? [t.previewContent] : [];
                      return (
                        <div key={t.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative">
                          <div className="absolute top-4 right-12 flex gap-1">
                            <button onClick={() => moveTopic(tidx, -1)} disabled={tidx === 0} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded disabled:opacity-30 disabled:hover:bg-transparent"><ChevronUp className="w-4 h-4" /></button>
                            <button onClick={() => moveTopic(tidx, 1)} disabled={tidx === tempConfig.topics.length - 1} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded disabled:opacity-30 disabled:hover:bg-transparent"><ChevronDown className="w-4 h-4" /></button>
                          </div>
                          <button onClick={() => setTempConfig({ ...tempConfig, topics: tempConfig.topics.filter((x) => x.id !== t.id) })} className="absolute top-5 right-5 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                          <span className="text-[11px] font-black text-slate-300 uppercase">{t.id}</span>
                          <input className="w-full p-3 mt-1.5 bg-white border border-slate-200 rounded-lg text-[14px] font-bold outline-none focus:border-[#338F88]" value={t.title} onChange={(e) => { const next = [...tempConfig.topics]; next[tidx].title = e.target.value; setTempConfig({ ...tempConfig, topics: next }); }} placeholder="議題名稱" />
                          <textarea className="w-full p-3 bg-white border border-slate-200 rounded-lg text-[13px] leading-relaxed outline-none h-24 focus:border-[#338F88] resize-none" value={t.desc} onChange={(e) => { const next = [...tempConfig.topics]; next[tidx].desc = e.target.value; setTempConfig({ ...tempConfig, topics: next }); }} placeholder="描述背景或細節..." />
                          <div className="pt-1.5 flex flex-wrap items-center gap-2.5">
                            {currentEditImages.map((img, imgIdx) => (
                              <div key={imgIdx} className="relative group">
                                <img src={img} className="w-12 h-12 object-cover rounded-lg border border-slate-200" alt={`img-${imgIdx}`} />
                                <button onClick={() => { const next = [...tempConfig.topics]; if (next[tidx].images?.length > 0) { next[tidx].images.splice(imgIdx, 1); } setTempConfig({ ...tempConfig, topics: next }); }} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5" /></button>
                              </div>
                            ))}
                            <label className="w-12 h-12 flex items-center justify-center bg-white border border-dashed border-slate-300 rounded-lg text-slate-400 hover:text-[#338F88] cursor-pointer hover:bg-slate-50 transition-colors"><Plus className="w-4 h-4" /><input type="file" multiple className="hidden" accept="image/*" onChange={(e) => { const files = Array.from(e.target.files); if (files.length > 0) { Promise.all(files.map((file) => compressImage(file))).then((compressedBase64Images) => { const next = [...tempConfig.topics]; next[tidx].images = [...(next[tidx].images || []), ...compressedBase64Images]; setTempConfig({ ...tempConfig, topics: next }); }); } }} /></label>
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-200 border-dashed space-y-2">
                            <div className="flex justify-between items-center"><span className="text-[12px] font-bold text-slate-500 flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> 系統/文件連結</span><button onClick={() => { const next = [...tempConfig.topics]; if (!next[tidx].systems) next[tidx].systems = []; next[tidx].systems.push({ name: "", url: "" }); setTempConfig({ ...tempConfig, topics: next }); }} className="text-[11px] text-[#338F88] font-bold hover:underline">+ 新增</button></div>
                            {t.systems?.map((sys, sidx) => (
                              <div key={sidx} className="flex gap-2 items-center">
                                <input className="w-1/3 p-2 bg-white border border-slate-200 rounded-md text-[12px] outline-none" placeholder="名稱 (如: Jira)" value={sys.name} onChange={(e) => { const next = [...tempConfig.topics]; next[tidx].systems[sidx].name = e.target.value; setTempConfig({ ...tempConfig, topics: next }); }} />
                                <input className="flex-1 p-2 bg-white border border-slate-200 rounded-md text-[12px] outline-none" placeholder="https://..." value={sys.url} onChange={(e) => { const next = [...tempConfig.topics]; next[tidx].systems[sidx].url = e.target.value; setTempConfig({ ...tempConfig, topics: next }); }} />
                                <button onClick={() => { const next = [...tempConfig.topics]; next[tidx].systems.splice(sidx, 1); setTempConfig({ ...tempConfig, topics: next }); }} className="p-1.5 text-slate-300 hover:text-red-500 rounded"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t bg-white absolute bottom-0 left-0 right-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]"><button onClick={applyConfig} className="w-full py-4 bg-[#0F172A] text-white rounded-[16px] font-bold text-[14px] tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95">更新會議配置</button></div>
            </div>
          )}
        </div>
      </div>

      {fullscreenImg && (
        <div onClick={() => setFullscreenImg(null)} className="fixed inset-0 bg-[#0A0F1C]/98 backdrop-blur-xl z-[1000] flex items-center justify-center p-12 cursor-zoom-out animate-in fade-in duration-300">
          <img src={fullscreenImg} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt="Full" />
        </div>
      )}
    </>
  );
};

export default App;
