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
  Printer
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

  const [config, setConfig] = useState(() => {
    try {
      const savedData = sessionStorage.getItem("strategyMeetingData");
      if (savedData) return JSON.parse(savedData);
    } catch (err) {
      console.error("讀取暫存失敗", err);
    }
    return INITIAL_CLEAN_CONFIG;
  });

  useEffect(() => {
    sessionStorage.setItem("strategyMeetingData", JSON.stringify(config));
  }, [config]);

  // [與會者] 載入雲端資料
  useEffect(() => {
    if (isViewer && meetingId) {
      fetch(`/api/get?id=${meetingId}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setConfig(data);
          } else {
            alert("此會議紀錄不存在或已失效。");
          }
        })
        .catch(err => console.error("讀取資料失敗", err));
    }
  }, [isViewer, meetingId]);

  const [activePage, setActivePage] = useState("cover");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [fullscreenImg, setFullscreenImg] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingTopicId, setExportingTopicId] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
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

  useEffect(() => {
    const scripts = [
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
    ];
    scripts.forEach((src) => {
      if (!document.querySelector(`script[src="${src}"]`)) {
        const script = document.createElement("script");
        script.src = src; script.async = true; document.body.appendChild(script);
      }
    });
  }, []);

  useEffect(() => {
    setIsSaving(true);
    const timer = setTimeout(() => setIsSaving(false), 800);
    return () => clearTimeout(timer);
  }, [config]);

  const openConfig = () => {
    setTempConfig(JSON.parse(JSON.stringify(config)));
    setIsConfigOpen(true);
  };
  const applyConfig = () => {
    setConfig(tempConfig);
    setIsConfigOpen(false);
  };

  const generateShareLink = async () => {
    setIsGeneratingLink(true);
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configData: config })
      });
      
      if (!response.ok) {
        throw new Error(`伺服器錯誤 (${response.status})：請確認 Vercel 是否已綁定 KV Database。`);
      }
      
      const result = await response.json();
      if (result.id) {
        const link = `${window.location.origin}/?mode=viewer&id=${result.id}`;
        navigator.clipboard.writeText(link);
        alert("✅ 已產生唯讀分享連結，並自動複製到剪貼簿！");
      } else {
        throw new Error("無法獲取會議 ID。");
      }
    } catch (err) {
      console.error(err);
      alert(`${err.message}\n\n(若您在本地端，請先發佈至 Vercel 上測試)`);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handlePrintPDF = () => {
    alert("【列印完美 PDF 提示】\n\n1. 配置 (Layout)：選擇「橫向 (Landscape)」\n2. 選項 (Options)：勾選「背景圖形 (Background graphics)」\n\n這樣才能印出 100% 完美的簡報喔！");
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const exportConfigJSON = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", `戰略會議專案_${config.sessionDate || "未命名"}_${new Date().getTime()}.json`);
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

  const handleExportImage = async (targetTopicId = null) => {
    if (!window.html2canvas) return;
    const topicIdToExport = typeof targetTopicId === "string" ? targetTopicId : currentTopic?.id;
    if (!topicIdToExport) return;

    setExportingTopicId(topicIdToExport);
    setIsExporting(true);

    await new Promise((r) => setTimeout(r, 800));
    const target = document.getElementById("export-container-target");
    if (target) target.style.display = "block";

    try {
      const topic = config.topics.find((t) => t.id === topicIdToExport);
      const canvas = await window.html2canvas(target, { scale: 2, useCORS: true, backgroundColor: "#FFFFFF", windowWidth: 1440 });
      const link = document.createElement("a");
      link.download = `議題紀錄_${topic?.title || "未命名"}_${config.sessionDate || "未定日期"}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    } catch (err) { console.error(err); } finally {
      setIsExporting(false); setExportingTopicId(null); if (target) target.style.display = "none";
    }
  };

  const handleBatchExportZIP = async () => {
    if (!window.html2canvas || !window.JSZip || selectedTopics.length === 0) return;
    setIsExporting(true);

    try {
      const zip = new window.JSZip();
      const folderName = `戰略會議_${config.sessionDate || "未定日期"}`;
      const folder = zip.folder(folderName);

      for (let i = 0; i < selectedTopics.length; i++) {
        const topicIdToExport = selectedTopics[i];
        setExportingTopicId(topicIdToExport);
        await new Promise((r) => setTimeout(r, 800));
        const target = document.getElementById("export-container-target");
        if (target) target.style.display = "block";

        const topic = config.topics.find((t) => t.id === topicIdToExport);
        const canvas = await window.html2canvas(target, { scale: 2, useCORS: true, backgroundColor: "#FFFFFF", windowWidth: 1440 });
        const base64Data = canvas.toDataURL("image/png", 1.0).replace(/^data:image\/(png|jpg);base64,/, "");
        const fileName = `[${String(i + 1).padStart(2, "0")}]_議題紀錄_${topic?.title || "未命名"}.png`;
        folder.file(fileName, base64Data, { base64: true });
        if (target) target.style.display = "none";
      }
      setExportingTopicId("packaging");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${folderName}_批次議題匯出.zip`;
      link.click();
    } catch (err) {
      alert("打包發生錯誤。");
    } finally {
      setIsExporting(false); setExportingTopicId(null); setSelectedTopics([]);
      const target = document.getElementById("export-container-target");
      if (target) target.style.display = "none";
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image(); img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 3840; const MAX_HEIGHT = 3840;
          let width = img.width; let height = img.height;
          if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
          else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, width, height); ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.95));
        };
      };
    });
  };

  const currentTopic = (config.topics || []).find((t) => t.id === activePage);
  const currentTopicImages = currentTopic?.images?.length > 0 ? currentTopic.images : currentTopic?.previewContent ? [currentTopic.previewContent] : [];
  const displayConfig = isConfigOpen && tempConfig ? tempConfig : config;

  // --- 獨立長圖匯出 View (隱藏渲染區，供 html2canvas 使用) ---
  const renderSingleTopicExport = (t) => {
    if (!t) return null;
    const exportImgs = t.images?.length > 0 ? t.images : t.previewContent ? [t.previewContent] : [];
    return (
      <div id="export-container-target" className="bg-white overflow-hidden text-slate-800 pb-32" style={{ width: "1440px", fontFamily: FONT_FAMILY, position: "absolute", left: "-9999px", top: "-9999px", display: "none" }}>
        <div className="bg-[#0A0F1C] px-24 py-16 text-white flex justify-between items-end border-b-[16px] border-[#B89F5D]">
          <div>
            <div className="text-sm font-black text-[#B89F5D] tracking-[0.4em] uppercase mb-4">Strategic Topic Record</div>
            <h1 className="font-black max-w-3xl leading-tight whitespace-pre-wrap" style={{ fontSize: displayConfig.cover?.titleFontSize ? `${displayConfig.cover.titleFontSize * 0.9}px` : '56px' }}>{config.cover?.title || "未命名戰略會議"}</h1>
          </div>
          <div className="text-right"><div className="text-xl font-bold tracking-wider">{config.sessionDate || "Date TBD"}</div></div>
        </div>
        <div className="px-24 py-20">
          <div className="flex items-center gap-4 mb-8">
            <span className="text-lg font-black tracking-widest uppercase text-slate-400 bg-slate-100 px-6 py-2 rounded-full">{t.id}</span>
            <span className={`px-6 py-2 rounded-full text-sm font-bold border ${t.status === "resolved" ? "bg-[#F2F9F8] text-[#338F88] border-[#338F88]/20" : "bg-[#FDF9F0] text-[#B89F5D] border-[#B89F5D]/20"}`}>
              {t.status === "resolved" ? "決議完成 RESOLVED" : "尚在討論 IN PROGRESS"}
            </span>
          </div>
          <h2 className="text-[56px] font-black text-slate-900 leading-[1.3] tracking-tight mb-12">
            <span className="relative inline-block px-2">
              <span className="absolute bottom-[10%] left-[-2%] w-[104%] h-[40%] bg-[#FCEBAF] rounded-sm transform -rotate-1 z-0" />
              <span className="relative z-10">{t.title}</span>
            </span>
          </h2>
          {t.desc && (
            <div className="mb-20">
              <div className="border-l-[6px] border-[#B89F5D] bg-slate-50 rounded-r-3xl p-8 shadow-sm">
                <div className="text-[20px] text-slate-700 leading-[2] whitespace-pre-wrap font-medium">{t.desc}</div>
              </div>
            </div>
          )}
          {t.notes && (
            <div className="bg-[#0F172A] rounded-[32px] p-12 shadow-lg mb-16 relative">
              <div className="text-[20px] text-slate-100 leading-[2] font-medium whitespace-pre-wrap">{t.notes}</div>
            </div>
          )}
          {exportImgs.length > 0 && (
            <div className="mt-20 pt-16 border-t-2 border-dashed border-slate-200">
              <div className="space-y-16 bg-slate-50 p-10 rounded-[40px] border border-slate-100">
                {exportImgs.map((img, imgIdx) => (
                  <div key={imgIdx} className="bg-white rounded-[32px] p-6 border shadow-sm relative flex flex-col items-center">
                    <img src={img} className="w-full object-contain rounded-[20px]" style={{ maxHeight: "1600px" }} alt="img" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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

        /* PDF 列印專用樣式 (強制 A4 橫式) */
        @media print {
          @page { size: A4 landscape; margin: 0; }
          html, body, #root {
            width: 297mm;
            height: auto !important;
            overflow: visible !important;
            background-color: #0A0F1C !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0;
            padding: 0;
          }
          .no-print { display: none !important; }
          .break-after-page { page-break-after: always; break-after: page; }
        }
      `}</style>

      {/* 區塊一：網頁實際操作介面 (列印時完全隱藏) */}
      <div className="h-screen flex overflow-hidden bg-[#0A0F1C] text-slate-800 print:hidden" style={{ fontFamily: FONT_FAMILY }}>
        
        {/* Sidebar 側邊欄 */}
        <aside className={`bg-[#0A0F1C] border-r border-slate-800 flex flex-col z-40 relative transition-all duration-500 ease-in-out overflow-hidden shrink-0 ${isSidebarOpen ? "w-[320px]" : "w-[88px]"}`}>
          <div className="pt-10 pb-6 flex-1 overflow-y-auto custom-scrollbar-dark flex flex-col items-center">
            {/* Logo 開關 */}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`flex items-center mb-10 text-[#B89F5D] hover:text-[#FCEBAF] transition-all duration-300 cursor-pointer group outline-none ${isSidebarOpen ? 'w-full px-8 justify-start' : 'w-full justify-center'}`} title={isSidebarOpen ? "收起側欄" : "展開側欄"}>
              <div className="w-5 h-5 bg-[#B89F5D] group-hover:bg-[#FCEBAF] group-hover:scale-110 rounded-sm rotate-45 shrink-0 transition-all duration-300 shadow-sm" />
              <h1 className={`font-bold tracking-[0.2em] text-[10px] uppercase whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100 max-w-[200px] ml-3' : 'opacity-0 max-w-0 ml-0'}`}>
                Strategic Navigator
              </h1>
            </button>

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

              {/* 側欄左下角：方塊按鈕 (並排) */}
              <div className={`mt-auto pt-4 pb-6 border-t border-slate-800/50 flex ${isSidebarOpen ? 'flex-row' : 'flex-col'} gap-3 px-4 w-full`}>
                {!isViewer && (
                  <button onClick={generateShareLink} disabled={isGeneratingLink} className={`flex-1 py-3 rounded-xl border border-slate-700/50 bg-[#0F172A] text-slate-400 hover:bg-[#338F88]/10 hover:border-[#338F88]/40 hover:text-[#338F88] transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm disabled:opacity-50`} title="產生唯讀分享連結">
                    <Share2 className="w-4 h-4" />
                    {isSidebarOpen && <span className="text-[11px] font-bold tracking-wider">{isGeneratingLink ? "處理中..." : "分享連結"}</span>}
                  </button>
                )}
                <button onClick={handlePrintPDF} className={`flex-1 py-3 rounded-xl border border-slate-700/50 bg-[#0F172A] text-slate-400 hover:bg-[#B89F5D]/10 hover:border-[#B89F5D]/40 hover:text-[#B89F5D] transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm`} title="匯出 PDF 簡報">
                  <Printer className="w-4 h-4" />
                  {isSidebarOpen && <span className="text-[11px] font-bold tracking-wider">匯出 PDF</span>}
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main Content 主視圖 */}
        <main ref={scrollContainerRef} className={`flex-1 relative overflow-y-auto custom-scrollbar-light transition-all duration-500 ${activePage === "cover" ? "bg-[#0A0F1C]" : "bg-slate-50"} ${isNotesOpen ? "rounded-l-[48px] shadow-2xl" : ""}`}>
          
          {/* 右上角極簡設定 */}
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
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-10 h-1 bg-[#B89F5D] rounded-full" />
                      <span className="text-[#B89F5D] font-black tracking-[0.3em] text-xs md:text-sm uppercase">Strategic Session</span>
                    </div>
                    <h1 className="font-bold mb-8 tracking-tight leading-[1.2] drop-shadow-lg break-words whitespace-pre-wrap transition-all duration-300" style={{ fontSize: `clamp(36px, ${displayConfig.cover?.titleFontSize || 72}px, 88px)` }}>
                      {displayConfig.cover?.title || "未命名會議"}
                    </h1>
                    {displayConfig.cover?.desc && <p className="text-[16px] md:text-[18px] text-slate-300 mb-12 max-w-[600px] leading-[1.8] font-medium border-l-4 border-[#338F88] pl-6">{displayConfig.cover?.desc}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 py-8 border-y border-white/10 w-full max-w-[650px]">
                      <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Meeting Date</span><span className="text-sm md:text-[15px] font-bold text-slate-200 flex items-center gap-2"><Calendar className="w-4 h-4 text-[#B89F5D]" /> {displayConfig.sessionDate || "TBD"}</span></div>
                      <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Attendees</span><span className="text-sm md:text-[15px] font-bold text-slate-200 flex items-center gap-2 truncate" title={displayConfig.attendees}><Users className="w-4 h-4 text-[#B89F5D]" /> {getAttendeePreview(displayConfig.attendees)}</span></div>
                      <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Agenda</span><span className="text-sm md:text-[15px] font-bold text-[#B89F5D] flex items-center gap-2"><ClipboardList className="w-4 h-4" /> {displayConfig.topics?.length || 0} ITEMS</span></div>
                    </div>
                    <button onClick={() => { if (displayConfig.topics?.length > 0) setActivePage("agenda"); else openConfig(); }} className="px-6 py-3.5 bg-white text-[#0A0F1C] rounded-2xl font-bold text-[15px] flex items-center gap-3 transition-all hover:bg-slate-200 shadow-xl group w-fit">
                      {displayConfig.topics?.length > 0 ? "開始進行會議" : "設定會議內容"} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                  <div className="hidden lg:flex w-[45%] justify-center items-center pointer-events-none z-0">
                    <div className="relative w-[360px] h-[360px] xl:w-[460px] xl:h-[460px] flex justify-center items-center">
                      <div className="absolute inset-0 border border-white/5 rounded-full animate-[spin_60s_linear_infinite]" />
                      <div className="absolute inset-10 xl:inset-12 border border-[#B89F5D]/20 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
                      <div className="absolute inset-20 xl:inset-24 border border-dashed border-[#338F88]/30 rounded-full animate-[spin_80s_linear_infinite]" />
                      <div className="w-48 h-48 xl:w-64 xl:h-64 bg-gradient-to-br from-[#B89F5D]/80 to-[#338F88]/80 rounded-[32px] rotate-45 shadow-[0_0_80px_rgba(184,159,93,0.15)] backdrop-blur-3xl flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />
                        <div className="w-40 h-40 xl:w-52 xl:h-52 bg-[#0A0F1C] rounded-[24px] flex items-center justify-center border border-white/10 shadow-inner relative overflow-hidden">
                          <div className="w-16 h-16 xl:w-20 xl:h-20 bg-gradient-to-tr from-[#B89F5D] to-[#FCEBAF] rounded-xl shadow-[0_0_40px_rgba(252,235,175,0.3)] animate-pulse" />
                        </div>
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
                <div className="flex flex-wrap items-center justify-between gap-4 mb-12">
                  <span className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-[10px] md:text-[11px] font-black text-slate-400 tracking-widest uppercase shadow-sm">{currentTopic.id}</span>
                  {!isViewer && (
                    <div className="flex gap-3 md:gap-4 items-center">
                      <button onClick={() => handleExportImage(currentTopic.id)} disabled={isExporting} className="px-4 py-2 bg-[#0F172A] text-white rounded-xl text-[11px] md:text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800 transition-all shadow-sm">
                        <FileDown className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isExporting && exportingTopicId === currentTopic.id ? "animate-pulse" : ""}`}/>
                        {isExporting && exportingTopicId === currentTopic.id ? "匯出中..." : "匯出此圖檔"}
                      </button>
                      <div className="w-px h-5 bg-slate-200" />
                      <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button onClick={() => updateTopic(currentTopic.id, "status", "discussing")} className={`px-4 py-1.5 rounded-lg text-[11px] md:text-xs font-bold transition-all ${currentTopic.status === "discussing" ? "bg-slate-50 shadow-sm text-amber-600" : "text-slate-400 hover:text-slate-600"}`}>討論中</button>
                        <button onClick={() => updateTopic(currentTopic.id, "status", "resolved")} className={`px-4 py-1.5 rounded-lg text-[11px] md:text-xs font-bold transition-all ${currentTopic.status === "resolved" ? "bg-[#338F88] text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>已決議</button>
                      </div>
                    </div>
                  )}
                </div>

                <h2 className="text-[36px] md:text-[48px] lg:text-[56px] font-black text-slate-900 mb-10 leading-[1.3] tracking-tight">
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
            
            {/* 隱藏的長圖匯出區塊 */}
            {renderSingleTopicExport(config.topics.find((t) => t.id === exportingTopicId) || currentTopic)}
          </div>
        </main>

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

        {!isViewer && !isNotesOpen && activePage !== "cover" && activePage !== "agenda" && (
          <button onClick={() => setIsNotesOpen(true)} className="fixed right-10 bottom-10 w-14 h-14 bg-[#0F172A] text-white rounded-full flex items-center justify-center shadow-[0_20px_40px_rgba(15,23,42,0.4)] z-40 hover:scale-110 hover:bg-[#1E293B] transition-all duration-300 group">
            <Edit3 className="w-6 h-6 text-[#B89F5D] group-hover:rotate-12 transition-transform" />
          </button>
        )}

        <div className={`fixed inset-y-0 right-0 w-[420px] bg-white border-l border-slate-100 shadow-2xl z-[200] transition-all duration-500 ${isConfigOpen ? "translate-x-0" : "translate-x-full"}`}>
          {tempConfig && (
            <div className="h-full flex flex-col">
              <div className="p-6 bg-slate-50 border-b flex justify-between items-center"><h3 className="text-xl font-black text-slate-800">控制中心</h3><button onClick={() => setIsConfigOpen(false)} className="p-2 text-slate-400 hover:text-slate-900"><X className="w-5 h-5" /></button></div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar-light pb-32">
                <div className="flex gap-3">
                  <button onClick={exportConfigJSON} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-lg"><FileDown className="w-4 h-4" /> 儲存專案</button>
                  <label className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#B89F5D] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#A68F50] transition-colors shadow-lg"><Upload className="w-4 h-4" /> 讀取專案<input type="file" className="hidden" accept=".json" onChange={importConfigJSON} /></label>
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

      {/* ---------------------------------------------------- */}
      {/* 區塊二：PDF 列印專用視圖 (100% 解除高度封印，強制分頁) */}
      {/* ---------------------------------------------------- */}
      <div className="hidden print:block w-full bg-[#0A0F1C]" style={{ fontFamily: FONT_FAMILY, minHeight: 'auto' }}>
        
        {/* PDF 第一頁：封面 */}
        <div className="print-page flex flex-col justify-center px-24 py-16 text-white relative bg-[#0A0F1C]">
          <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-gradient-to-bl from-[#338F88]/20 via-[#B89F5D]/5 to-transparent rounded-full blur-[120px] opacity-40" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-[#0F172A] rounded-full blur-[120px] opacity-80" />
          
          <div className="z-10 w-full max-w-[1200px] mx-auto relative flex items-center justify-between gap-12">
            <div className="w-[55%] relative z-10 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-1 bg-[#B89F5D] rounded-full" />
                <span className="text-[#B89F5D] font-black tracking-[0.3em] text-[18px] uppercase">Strategic Session</span>
              </div>
              <h1 className="font-bold tracking-tight mb-8 leading-[1.2]" style={{ fontSize: `${config.cover?.titleFontSize || 72}px` }}>{config.cover?.title || "未命名會議"}</h1>
              {config.cover?.desc && <p className="text-[24px] text-slate-300 max-w-[800px] leading-[1.8] font-medium border-l-4 border-[#338F88] pl-6 mb-16">{config.cover?.desc}</p>}
              <div className="flex gap-16 text-[24px] text-slate-400 font-bold border-t border-white/20 pt-10 mt-12 w-full max-w-[800px]">
                <div className="flex flex-col"><span className="text-[14px] text-slate-500 uppercase tracking-widest mb-2">Meeting Date</span><span className="text-[#B89F5D] flex items-center gap-2">{config.sessionDate || "TBD"}</span></div>
                <div className="flex flex-col"><span className="text-[14px] text-slate-500 uppercase tracking-widest mb-2">Attendees</span><span className="text-[#B89F5D] flex items-center gap-2">{getAttendeePreview(config.attendees)}</span></div>
              </div>
            </div>
            
            <div className="flex w-[45%] justify-center items-center z-0">
              <div className="relative w-[400px] h-[400px] flex justify-center items-center">
                <div className="absolute inset-0 border border-white/5 rounded-full" />
                <div className="absolute inset-12 border border-[#B89F5D]/20 rounded-full" />
                <div className="absolute inset-24 border border-dashed border-[#338F88]/30 rounded-full" />
                <div className="w-56 h-56 bg-gradient-to-br from-[#B89F5D]/80 to-[#338F88]/80 rounded-[32px] rotate-45 shadow-[0_0_80px_rgba(184,159,93,0.15)] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/5" />
                  <div className="w-44 h-44 bg-[#0A0F1C] rounded-[24px] flex items-center justify-center border border-white/10 shadow-inner relative overflow-hidden">
                    <div className="w-20 h-20 bg-gradient-to-tr from-[#B89F5D] to-[#FCEBAF] rounded-xl shadow-[0_0_40px_rgba(252,235,175,0.3)]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PDF 第二頁：議程目錄 */}
        {config.topics?.length > 0 && (
          <div className="print-page px-24 py-20 flex flex-col bg-[#F8FAFC]">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-1 bg-[#B89F5D] rounded-full" />
              <span className="text-[#B89F5D] font-black tracking-[0.4em] text-[16px] uppercase">Meeting Agenda</span>
            </div>
            <h2 className="text-[48px] font-black text-slate-900 mb-12 tracking-tighter">議程目錄</h2>
            <div className="flex-1 grid grid-cols-2 gap-10 content-start">
              {config.topics.map((t, idx) => (
                <div key={`print-agenda-${t.id}`} className="bg-white p-10 rounded-[32px] border border-slate-200 shadow-sm flex gap-8 items-start relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#338F88] opacity-20" />
                  <div className="text-[48px] font-black text-slate-200 leading-none tracking-tighter pt-1">{String(idx + 1).padStart(2, "0")}</div>
                  <div>
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-[14px] font-bold text-[#B89F5D] tracking-widest uppercase">{t.id}</span>
                      <span className={`px-3 py-1 rounded-md text-[12px] font-bold ${t.status === "resolved" ? "bg-[#338F88]/10 text-[#338F88]" : "bg-slate-100 text-slate-500"}`}>{t.status === "resolved" ? "已決議" : "討論中"}</span>
                    </div>
                    <h3 className="text-[32px] font-bold text-slate-900 leading-tight mb-4 tracking-tight">{t.title}</h3>
                    <p className="text-[20px] text-slate-600 line-clamp-3 leading-[1.8]">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PDF 後續頁面：議題詳細分頁 */}
        {config.topics?.map((t) => {
          const images = t.images?.length > 0 ? t.images : t.previewContent ? [t.previewContent] : [];
          return (
            <div key={`print-topic-${t.id}`} className="print-page flex flex-col px-24 py-20 bg-[#F8FAFC]">
              <div className="flex items-center justify-between mb-12">
                <span className="px-6 py-2 rounded-full bg-white border border-slate-200 text-[16px] font-black text-slate-400 tracking-widest uppercase shadow-sm">{t.id}</span>
                <span className={`px-6 py-2 rounded-lg text-[16px] font-bold border ${t.status === "resolved" ? "bg-[#338F88] text-white shadow-sm" : "bg-white text-slate-500 border-slate-200"}`}>{t.status === "resolved" ? "已決議" : "討論中"}</span>
              </div>
              <h2 className="text-[56px] font-black text-slate-900 mb-12 leading-[1.3] tracking-tight border-b-4 border-[#B89F5D] inline-block pb-4">
                {t.title}
              </h2>
              {t.desc && (
                <div className="mb-12 border-l-4 border-[#B89F5D] bg-white rounded-r-2xl p-8 shadow-sm">
                  <div className="text-[24px] text-slate-700 leading-[2] whitespace-pre-wrap font-medium">{t.desc}</div>
                </div>
              )}
              <div className="flex-1 grid grid-cols-2 gap-16 overflow-hidden">
                <div className="flex flex-col">
                  <h3 className="text-[28px] font-bold text-[#B89F5D] mb-6 flex items-center gap-3"><Edit3 className="w-6 h-6 text-[#B89F5D]" /> 決議與筆記</h3>
                  <div className="text-[24px] leading-[2] text-slate-800 font-medium bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-full">
                    {t.notes || "此議題尚無筆記。"}
                  </div>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[28px] font-bold text-slate-400 mb-6 flex items-center gap-3"><ImageIcon className="w-6 h-6 text-slate-400" /> 視覺參考圖檔</h3>
                  <div className="flex flex-col items-center justify-center bg-white border border-slate-200 p-8 rounded-3xl shadow-sm h-full">
                    {images.length > 0 ? (<img src={images[0]} className="max-w-full max-h-[500px] object-contain rounded-xl" alt="視覺參考" />) : (<p className="text-slate-400 text-[24px] font-medium tracking-widest">無視覺圖檔</p>)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 遮罩、圖片放大 */}
      {fullscreenImg && (
        <div onClick={() => setFullscreenImg(null)} className="fixed inset-0 bg-[#0A0F1C]/98 backdrop-blur-xl z-[1000] flex items-center justify-center p-12 cursor-zoom-out animate-in fade-in duration-300">
          <img src={fullscreenImg} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt="Full" />
        </div>
      )}
    </>
  );
};

export default App;
