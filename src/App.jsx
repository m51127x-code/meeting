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
  Menu,
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
  // [模式判斷]：與會者唯讀模式 & 會議 ID
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

  // ==========================================
  // [與會者] 載入雲端資料
  // ==========================================
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
  const [scaleValue, setScaleValue] = useState(1);
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
    const handleResize = () => {
      const sidebarWidth = isSidebarOpen ? 320 : 88;
      const notesWidth = isNotesOpen ? 460 : 0;
      const availableWidth = window.innerWidth - sidebarWidth - notesWidth;
      setScaleValue(Math.min(1, availableWidth / 1440));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isNotesOpen, isSidebarOpen]);

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

  // ==========================================
  // [主講者] 產生分享連結
  // ==========================================
  const generateShareLink = async () => {
    setIsGeneratingLink(true);
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configData: config })
      });
      const result = await response.json();
      
      if (result.id) {
        const link = `${window.location.origin}/?mode=viewer&id=${result.id}`;
        navigator.clipboard.writeText(link);
        alert("✅ 已產生唯讀分享連結，並自動複製到剪貼簿！\n您可以直接貼上分享給與會者。");
      } else {
        alert("產生失敗，無法獲取會議 ID。");
      }
    } catch (err) {
      console.error(err);
      alert("發生錯誤，產生連結失敗。請確認 API 是否設定正確。");
    } finally {
      setIsGeneratingLink(false);
    }
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
            ...t, images: t.images || (t.previewContent ?
