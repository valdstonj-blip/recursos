import { useState, useEffect, useMemo } from "react";
import { 
  Shield, 
  MapPin, 
  Users, 
  Clock, 
  Briefcase, 
  Target, 
  ChevronRight, 
  Info, 
  List, 
  Calendar,
  AlertCircle,
  X,
  FileText,
  Search,
  Eye,
  RefreshCw,
  Settings,
  Link,
  CheckCircle2,
  CalendarDays,
  FileDown,
  ChevronDown,
  Sun,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { DEFAULT_RESOURCES, GreResource, geocodeLocation } from "./types";
import MapComponent from "./components/MapComponent";
import { generatePDF } from "./services/pdfService";

function normalizeStatus(raw: string): string {
  const norm = (raw || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (norm.includes("ANDAMENTO") || norm.includes("EXECU") || norm.includes("ATIV") || norm === "LIVE" || norm.includes("EM ANDAMENTO")) {
    return "EM ANDAMENTO";
  }
  if (
    norm.includes("PROGR") || 
    norm.includes("AGEN") || 
    norm.includes("ESCAL") || 
    norm.includes("NAO INIC") || 
    norm.includes("A INIC") || 
    norm.includes("PREV") || 
    norm.includes("PLAN") || 
    norm.includes("PENDEN")
  ) {
    return "PROGRAMADO";
  }
  if (norm.includes("FINAL") || norm.includes("CONCLU") || norm.includes("ENCER") || norm.includes("TERMI") || norm.includes("FIM")) {
    return "FINALIZADO";
  }
  return raw || "EM ANDAMENTO";
}

function getDatesAndTimes(dataTurno: string, isWeekend: boolean) {
  const normTurno = dataTurno || "";
  const dateRegex = /(\d{2}\/\d{2}\/\d{4})/g;
  const datesList = normTurno.match(dateRegex);
  let startDateStr = "";
  let endDateStr = "";
  
  if (datesList && datesList.length > 0) {
    startDateStr = datesList[0];
    if (datesList.length > 1) {
      endDateStr = datesList[1];
    } else {
      try {
        const [day, month, year] = startDateStr.split("/").map(Number);
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          if (isWeekend) {
            // End of month
            const lastDay = new Date(year, month, 0);
            const pad = (n: number) => String(n).padStart(2, "0");
            endDateStr = `${pad(lastDay.getDate())}/${pad(lastDay.getMonth() + 1)}/${lastDay.getFullYear()}`;
          } else {
            // Saturday of same week
            const currentDayOfWeek = date.getDay(); // 0 Sunday, 1 Monday, 6 Saturday
            let daysToSaturday = (6 - currentDayOfWeek) % 7;
            if (daysToSaturday === 0 && currentDayOfWeek !== 6) {
              daysToSaturday = 6;
            }
            const satDate = new Date(date);
            satDate.setDate(date.getDate() + daysToSaturday);
            const pad = (n: number) => String(n).padStart(2, "0");
            endDateStr = `${pad(satDate.getDate())}/${pad(satDate.getMonth() + 1)}/${satDate.getFullYear()}`;
          }
        }
      } catch (e) {
        endDateStr = startDateStr;
      }
    }
  } else {
    startDateStr = "25/05/2026";
    endDateStr = isWeekend ? "31/05/2026" : "30/05/2026";
  }

  const timeRegex = /(\d{2}:\d{2})/g;
  const timesList = normTurno.match(timeRegex);
  let startTimeStr = "06:00";
  let endTimeStr = "23:59";
  if (timesList && timesList.length >= 2) {
    startTimeStr = timesList[0];
    endTimeStr = timesList[1];
  } else if (timesList && timesList.length === 1) {
    startTimeStr = timesList[0];
    endTimeStr = "23:59";
  } else {
    if (normTurno.includes("06:00")) {
      startTimeStr = "06:00";
      endTimeStr = "05:30";
    } else if (normTurno.includes("00:01")) {
      startTimeStr = "00:01";
      endTimeStr = "23:59";
    }
  }

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    startTime: startTimeStr,
    endTime: endTimeStr
  };
}

export default function App() {
  // Active Page Tab Segment
  const [activePage, setActivePage] = useState<"recursos" | "gre_recom">(() => {
    return (localStorage.getItem("gre_active_page") as "recursos" | "gre_recom") || "recursos";
  });

  // Independent Sheet URLs for both pages
  const [sheetUrlRecursos, setSheetUrlRecursos] = useState(() => {
    return localStorage.getItem("gre_sheet_url_recursos") || 
      "https://docs.google.com/spreadsheets/d/1ivkQDFDjj1564IPmCDiEKi3F7BwVx_dcQnhlRBi6n5c/edit?gid=536450586#gid=536450586";
  });

  const [sheetUrlGreRecom, setSheetUrlGreRecom] = useState(() => {
    return localStorage.getItem("gre_sheet_url_grerecom") || 
      "https://docs.google.com/spreadsheets/d/1ivkQDFDjj1564IPmCDiEKi3F7BwVx_dcQnhlRBi6n5c/edit?gid=317400917#gid=317400917";
  });

  // Derived active URL based on selected page
  const sheetUrl = useMemo(() => {
    return activePage === "recursos" ? sheetUrlRecursos : sheetUrlGreRecom;
  }, [activePage, sheetUrlRecursos, sheetUrlGreRecom]);

  const updateSheetUrl = (newUrl: string) => {
    if (activePage === "recursos") {
      setSheetUrlRecursos(newUrl);
      localStorage.setItem("gre_sheet_url_recursos", newUrl);
    } else {
      setSheetUrlGreRecom(newUrl);
      localStorage.setItem("gre_sheet_url_grerecom", newUrl);
    }
  };

  // Swapped Resources states for full visual & memory isolation
  const [resourcesRecursos, setResourcesRecursos] = useState<GreResource[]>(() => {
    const cached = localStorage.getItem("gre_cached_resources_recursos");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    const oldCached = localStorage.getItem("gre_cached_resources");
    if (oldCached) {
      try {
        const parsed = JSON.parse(oldCached);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_RESOURCES;
  });

  const [resourcesGreRecom, setResourcesGreRecom] = useState<GreResource[]>(() => {
    const cached = localStorage.getItem("gre_cached_resources_grerecom");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    const oldCached = localStorage.getItem("gre_cached_resources");
    if (oldCached) {
      try {
        const parsed = JSON.parse(oldCached);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_RESOURCES;
  });

  // Derived current resources context
  const resources = useMemo(() => {
    return activePage === "recursos" ? resourcesRecursos : resourcesGreRecom;
  }, [activePage, resourcesRecursos, resourcesGreRecom]);

  const updateResources = (newResources: GreResource[]) => {
    if (activePage === "recursos") {
      setResourcesRecursos(newResources);
      localStorage.setItem("gre_cached_resources_recursos", JSON.stringify(newResources));
    } else {
      setResourcesGreRecom(newResources);
      localStorage.setItem("gre_cached_resources_grerecom", JSON.stringify(newResources));
    }
  };

  // Active warnings/feed of 3 alerts (focusing strictly on Em Andamento)
  const specialAlerts = useMemo(() => {
    const valid = resources.filter(r => {
      // Must be strictly EM ANDAMENTO
      if (normalizeStatus(r.status) !== "EM ANDAMENTO") {
        return false;
      }

      const text = (r.prescricoes || "").toLowerCase();
      if (!text || 
          text === "sem restrições adicionais" || 
          text === "sem restrições" || 
          text === "sem restricao para o setor operacional regular" || 
          text === "teste x teste" || 
          text === "nenhuma prescrição cadastrada para este posto."
      ) {
        return false;
      }
      return true;
    });

    return valid.slice(0, 3);
  }, [resources]);

  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => {
    return localStorage.getItem("gre_last_updated") || "28/05/2026, 11:01:23";
  });
  
  const [showConfig, setShowConfig] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResource, setSelectedResource] = useState<GreResource | null>(null);
  
  // Custom Auto-Refresh / Real-time Sync state
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(true);
  const [nextSyncSeconds, setNextSyncSeconds] = useState(60);

  // Filters State
  const [selectedUnit, setSelectedUnit] = useState<string>("TODAS");
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const cached = localStorage.getItem("gre_cached_resources");
    let initialRes = DEFAULT_RESOURCES;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0 && parsed[0].unidadeApoiada !== undefined) {
          initialRes = parsed;
        }
      } catch (e) {}
    }
    const hasActive = initialRes.some(r => normalizeStatus(r.status) === "EM ANDAMENTO");
    const hasProgrammed = initialRes.some(r => normalizeStatus(r.status) === "PROGRAMADO");
    if (hasActive) return "EM ANDAMENTO";
    if (hasProgrammed) return "PROGRAMADO";
    return "TODOS";
  });
  const [weekendFilter, setWeekendFilter] = useState<string>("TODOS"); // "TODOS" | "SIM" | "NÃO"
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [activeAlertIndex, setActiveAlertIndex] = useState(0);
  
  // Custom Toasts for Action confirmation
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Convert standard user spreadsheets link to public CSV export URL
  function getExportUrl(userUrl: string): string {
    try {
      const idMatch = userUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!idMatch) return userUrl;
      const docId = idMatch[1];
      
      const gidMatch = userUrl.match(/gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '317400917';
      
      return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
    } catch (e) {
      return userUrl;
    }
  }

  // Comma/semicolon resilient CSV parser
  function parseCSV(text: string): Record<string, string>[] {
    if (!text) return [];
    
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];

    const firstLine = lines[0];
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    const splitLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = splitLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim());
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = splitLine(lines[i]).map(v => v.replace(/^["']|["']$/g, '').trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header || `col_${index}`] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
  }

  // Robust fuzzy matching dictionary based on user's exact columns
  function getCanonicalFields(row: Record<string, string>) {
    const findValue = (keys: string[]): string => {
      // 1. Try exact or highly close matches first to avoid greedy contains (e.g. matching 'tipo de apoio' as 'tipo')
      const exactKey = Object.keys(row).find(k => {
        const normalizedK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return keys.some(key => normalizedK === key);
      });
      if (exactKey) return row[exactKey];

      // 2. Fallback to fuzzy matches
      const matchedKey = Object.keys(row).find(k => {
        const normalizedK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return keys.some(key => normalizedK.includes(key) || key.includes(normalizedK));
      });
      return matchedKey ? row[matchedKey] : '';
    };

    return {
      dataTurno: findValue(['data / turno', 'data/turno', 'data', 'turno', 'periodo', 'horario']),
      dataInicioCol: findValue(['data de inicio', 'data inicio', 'inicio', 'dt inicio']),
      dataTerminoCol: findValue(['data de termino', 'data termino', 'termino', 'dt termino']),
      horarioInicialCol: findValue(['horario inicial', 'hora inicial', 'inicial', 'horario de inicio']),
      horarioFinalCol: findValue(['horario final', 'hora final', 'final', 'horario de termino']),
      unidadeApoiada: findValue(['unidade apoiada', 'unidade', 'uop', 'apoiada', 'batalhao']),
      status: findValue(['status', 'situacao', 'situaçao', 'estado']),
      descricaoApoio: findValue(['descricao do apoio', 'descricao', 'apoio', 'servico', 'missao']),
      equipe: findValue(['equipe', 'equipes', 'gre', 'quantidade', 'qtd']),
      referencia: findValue(['referencia', 'referência', 'documento', 'doc', 'ref']),
      prescricoes: findValue(['prescricoes', 'prescrições', 'instrucoes', 'obs', 'observacao', 'observações']),
      tipoEvento: findValue(['tipo de evento', 'escala', 'tipo', 'evento']),
      fimDeSemanaCol: findValue(['fim de semana', 'fim-de-semana', 'fds']),
      localMapaCol: findValue(['localmapa', 'local mapa', 'local_mapa', 'local do mapa', 'coordenadas', 'coord', 'coords', 'localizacao', 'localizaçao'])
    };
  }

  // Sync Google spreadsheet data live from client
  const syncSpreadsheet = async () => {
    setIsLoading(true);
    triggerToast("Processando conexão com a planilha pública...", "info");

    const exportUrl = getExportUrl(sheetUrl);
    
    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error(`Código HTTP de erro: ${response.status}`);
      }

      const csvText = await response.text();
      const parsedRows = parseCSV(csvText);

      // Filter out completely blank lines or blank placeholder lines at the bottom of the sheet
      const validRows = parsedRows.filter(row => {
        const canonical = getCanonicalFields(row);
        return (
          (canonical.unidadeApoiada && canonical.unidadeApoiada.trim() !== "") ||
          (canonical.status && canonical.status.trim() !== "") ||
          (canonical.referencia && canonical.referencia.trim() !== "")
        );
      });

      if (validRows.length === 0) {
        throw new Error("Formato de Planilha incompatível.");
      }

      const mappedResources: GreResource[] = validRows.map((row, index) => {
        const canonical = getCanonicalFields(row);
        
        let eqCount = 1;
        const cleanEq = canonical.equipe.replace(/\D/g, "");
        if (cleanEq) {
          eqCount = parseInt(cleanEq);
        }

        const unitName = canonical.unidadeApoiada || "Comando Geral";
        const localMapaText = (canonical.localMapaCol || "").trim();
        const coords = geocodeLocation(localMapaText || unitName);

        // Deduce if weekend with robust check
        const rawFds = canonical.fimDeSemanaCol || "";
        const eventType = canonical.tipoEvento || "DIA ÚTIL";
        const dataInicioStr = canonical.dataInicioCol || "";
        
        let isWeekend = false;
        
        if (rawFds) {
          const normVal = rawFds.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          isWeekend = normVal === "SIM" || 
                      normVal === "S" || 
                      normVal === "YES" || 
                      normVal === "VERDADEIRO" || 
                      normVal === "TRUE" ||
                      normVal.includes("FIM DE SEMANA") ||
                      normVal.includes("SABADO") ||
                      normVal.includes("DOMINGO");
        } else if (dataInicioStr) {
          try {
            const parts = dataInicioStr.split("/");
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10);
              const year = parseInt(parts[2], 10);
              const dateObj = new Date(year, month - 1, day);
              if (!isNaN(dateObj.getTime())) {
                const wDay = dateObj.getDay();
                isWeekend = (wDay === 0 || wDay === 6);
              }
            }
          } catch (e) {
            isWeekend = false;
          }
        }

        if (!isWeekend) {
          const normEvent = eventType.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const normTurno = canonical.dataTurno.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const normInicio = dataInicioStr.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

          isWeekend = normEvent.includes("FIM DE SEMANA") || 
                      normEvent.includes("SABADO") || 
                      normEvent.includes("DOMINGO") ||
                      normTurno.includes("SABADO") ||
                      normTurno.includes("DOMINGO") ||
                      normInicio.includes("SABADO") ||
                      normInicio.includes("DOMINGO");
        }

        let resolvedDataTurno = canonical.dataTurno || "";
        if (!resolvedDataTurno && canonical.dataInicioCol) {
          resolvedDataTurno = canonical.dataInicioCol;
          if (canonical.dataTerminoCol && canonical.dataTerminoCol !== canonical.dataInicioCol) {
            resolvedDataTurno += " a " + canonical.dataTerminoCol;
          }
          if (canonical.horarioInicialCol) {
            resolvedDataTurno += " " + canonical.horarioInicialCol;
            if (canonical.horarioFinalCol) {
              resolvedDataTurno += " - " + canonical.horarioFinalCol;
            }
          }
        }
        if (!resolvedDataTurno) {
          resolvedDataTurno = "Data / Turno Regular";
        }

        return {
          id: `sheet-val-${index}`,
          dataTurno: resolvedDataTurno,
          unidadeApoiada: unitName,
          status: (canonical.status || "EM ANDAMENTO").trim(),
          descricaoApoio: canonical.descricaoApoio || "Apoio Operacional Geral",
          equipe: eqCount,
          referencia: canonical.referencia || "Registro Geral/26",
          prescricoes: canonical.prescricoes || "Sem restrições adicionais",
          tipoEvento: isWeekend ? "FIM DE SEMANA" : "DIA ÚTIL",
          fimDeSemana: isWeekend,
          coords: coords,
          localMapa: localMapaText || undefined
        };
      });

      updateResources(mappedResources);
      
      const hasActive = mappedResources.some(r => normalizeStatus(r.status) === "EM ANDAMENTO");
      const hasProgrammed = mappedResources.some(r => normalizeStatus(r.status) === "PROGRAMADO");
      if (hasActive) {
        setStatusFilter("EM ANDAMENTO");
      } else if (hasProgrammed) {
        setStatusFilter("PROGRAMADO");
      } else {
        setStatusFilter("TODOS");
      }
      
      const updateTime = new Date().toLocaleString("pt-BR", { hour12: false });
      setLastUpdated(updateTime);
      localStorage.setItem("gre_last_updated", updateTime);
      updateSheetUrl(sheetUrl);
      
      triggerToast("Planilha sincronizada e mapeada com sucesso!", "success");
      setShowConfig(false);
    } catch (error: any) {
      console.error(error);
      triggerToast(`Verifique se o link da planilha está ativo e marcado para 'Qualquer pessoa com o link pode ler'.`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Silent background sync that updates resource data without resetting active filters or triggering heavy layout blockings
  const silentSyncSpreadsheet = async () => {
    const exportUrl = getExportUrl(sheetUrl);
    try {
      const response = await fetch(exportUrl);
      if (!response.ok) return;

      const csvText = await response.text();
      const parsedRows = parseCSV(csvText);

      const validRows = parsedRows.filter(row => {
        const canonical = getCanonicalFields(row);
        return (
          (canonical.unidadeApoiada && canonical.unidadeApoiada.trim() !== "") ||
          (canonical.status && canonical.status.trim() !== "") ||
          (canonical.referencia && canonical.referencia.trim() !== "")
        );
      });

      if (validRows.length === 0) return;

      const mappedResources: GreResource[] = validRows.map((row, index) => {
        const canonical = getCanonicalFields(row);
        
        let eqCount = 1;
        const cleanEq = canonical.equipe.replace(/\D/g, "");
        if (cleanEq) {
          eqCount = parseInt(cleanEq);
        }

        const unitName = canonical.unidadeApoiada || "Comando Geral";
        const localMapaText = (canonical.localMapaCol || "").trim();
        const coords = geocodeLocation(localMapaText || unitName);

        const rawFds = canonical.fimDeSemanaCol || "";
        const eventType = canonical.tipoEvento || "DIA ÚTIL";
        const dataInicioStr = canonical.dataInicioCol || "";
        
        let isWeekend = false;
        
        if (rawFds) {
          const normVal = rawFds.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          isWeekend = normVal === "SIM" || 
                      normVal === "S" || 
                      normVal === "YES" || 
                      normVal === "VERDADEIRO" || 
                      normVal === "TRUE" ||
                      normVal.includes("FIM DE SEMANA") ||
                      normVal.includes("SABADO") ||
                      normVal.includes("DOMINGO");
        } else if (dataInicioStr) {
          try {
            const parts = dataInicioStr.split("/");
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10);
              const year = parseInt(parts[2], 10);
              const dateObj = new Date(year, month - 1, day);
              if (!isNaN(dateObj.getTime())) {
                const wDay = dateObj.getDay();
                isWeekend = (wDay === 0 || wDay === 6);
              }
            }
          } catch (e) {
            isWeekend = false;
          }
        }

        if (!isWeekend) {
          const normEvent = eventType.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const normTurno = canonical.dataTurno.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const normInicio = dataInicioStr.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

          isWeekend = normEvent.includes("FIM DE SEMANA") || 
                      normEvent.includes("SABADO") || 
                      normEvent.includes("DOMINGO") ||
                      normTurno.includes("SABADO") ||
                      normTurno.includes("DOMINGO") ||
                      normInicio.includes("SABADO") ||
                      normInicio.includes("DOMINGO");
        }

        let resolvedDataTurno = canonical.dataTurno || "";
        if (!resolvedDataTurno && canonical.dataInicioCol) {
          resolvedDataTurno = canonical.dataInicioCol;
          if (canonical.dataTerminoCol && canonical.dataTerminoCol !== canonical.dataInicioCol) {
            resolvedDataTurno += " a " + canonical.dataTerminoCol;
          }
          if (canonical.horarioInicialCol) {
            resolvedDataTurno += " " + canonical.horarioInicialCol;
            if (canonical.horarioFinalCol) {
              resolvedDataTurno += " - " + canonical.horarioFinalCol;
            }
          }
        }
        if (!resolvedDataTurno) {
          resolvedDataTurno = "Data / Turno Regular";
        }

        return {
          id: `sheet-val-${index}`,
          dataTurno: resolvedDataTurno,
          unidadeApoiada: unitName,
          status: (canonical.status || "EM ANDAMENTO").trim(),
          descricaoApoio: canonical.descricaoApoio || "Apoio Operacional Geral",
          equipe: eqCount,
          referencia: canonical.referencia || "Registro Geral/26",
          prescricoes: canonical.prescricoes || "Sem restrições adicionais",
          tipoEvento: isWeekend ? "FIM DE SEMANA" : "DIA ÚTIL",
          fimDeSemana: isWeekend,
          coords: coords,
          localMapa: localMapaText || undefined
        };
      });

      updateResources(mappedResources);
      
      const updateTime = new Date().toLocaleString("pt-BR", { hour12: false });
      setLastUpdated(updateTime);
      localStorage.setItem("gre_last_updated", updateTime);
      triggerToast("Painel atualizado em segundo plano com sucesso!", "success");
    } catch (error) {
      console.error("Erro na sincronização em segundo plano:", error);
    }
  };

  // Timer effect for auto-refresh: decrements countdown, fires silentSync on threshold, resets
  useEffect(() => {
    if (!isAutoSyncEnabled) return;
    const interval = setInterval(() => {
      setNextSyncSeconds((prev) => {
        if (prev <= 1) {
          silentSyncSpreadsheet();
          return 60; // refresh every 60 seconds
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isAutoSyncEnabled, sheetUrl]);

  useEffect(() => {
    syncSpreadsheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);

  // Timer para rotacionar as prescrições especiais de forma contínua e automática sem barra de rolagem
  useEffect(() => {
    if (specialAlerts.length <= 1) return;
    const interval = setInterval(() => {
      setActiveAlertIndex((prev) => (prev + 1) % specialAlerts.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [specialAlerts.length]);

  useEffect(() => {
    setActiveAlertIndex(0);
  }, [resources]);

  const handleResetDefaults = () => {
    const defaultUrl = activePage === "recursos"
      ? "https://docs.google.com/spreadsheets/d/1ivkQDFDjj1564IPmCDiEKi3F7BwVx_dcQnhlRBi6n5c/edit?gid=536450586#gid=536450586"
      : "https://docs.google.com/spreadsheets/d/1ivkQDFDjj1564IPmCDiEKi3F7BwVx_dcQnhlRBi6n5c/edit?gid=317400917#gid=317400917";
    updateResources(DEFAULT_RESOURCES);
    updateSheetUrl(defaultUrl);
    setLastUpdated("28/05/2026, 11:01:23");
    localStorage.removeItem("gre_last_updated");
    triggerToast("Painel redefinido para dados originais PMERJ!", "info");
    setShowConfig(false);
  };

  // Get unique supported units for filter dropdown
  const uniqueUnits = useMemo(() => {
    const units = new Set<string>();
    resources.forEach(r => {
      // Split by commas to list multiple units individually if applicable
      const parts = r.unidadeApoiada.split(",");
      parts.forEach(part => {
        const clean = part.trim();
        if (clean) units.add(clean);
      });
    });
    return ["TODAS", ...Array.from(units).sort()];
  }, [resources]);

  // Handle PDF report generation / print view
  const triggerPrintReport = () => {
    generatePDF(filteredResources, lastUpdated);
  };

  // Filter logic based on user inputs
  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      // Search Box filter
      const q = searchQuery.toLowerCase();
      const matchesSearch = q === "" || 
        res.unidadeApoiada.toLowerCase().includes(q) ||
        res.descricaoApoio.toLowerCase().includes(q) ||
        res.referencia.toLowerCase().includes(q) ||
        res.prescricoes.toLowerCase().includes(q) ||
        res.tipoEvento.toLowerCase().includes(q);

      // Select dropdown filter for unit
      const matchesUnit = selectedUnit === "TODAS" || 
        res.unidadeApoiada.toLowerCase().includes(selectedUnit.toLowerCase());

      // Situation/Status Filter Button
      const matchesStatus = statusFilter === "TODOS" || 
        normalizeStatus(res.status) === normalizeStatus(statusFilter);

      // Weekend Filter Button
      let matchesWeekend = true;
      if (weekendFilter === "SIM") {
        matchesWeekend = res.fimDeSemana === true;
      } else if (weekendFilter === "NÃO") {
        matchesWeekend = res.fimDeSemana === false;
      }

      return matchesSearch && matchesUnit && matchesStatus && matchesWeekend;
    });
  }, [resources, searchQuery, selectedUnit, statusFilter, weekendFilter]);

  // Aggregate stats based on current filtered view for the Colonel cards
  const totalEquipes = useMemo(() => {
    return filteredResources.reduce((acc, curr) => acc + curr.equipe, 0);
  }, [filteredResources]);

  const totalWeekdayEquipes = useMemo(() => {
    return filteredResources.filter(r => !r.fimDeSemana).reduce((acc, curr) => acc + curr.equipe, 0);
  }, [filteredResources]);

  const totalWeekendEquipes = useMemo(() => {
    return filteredResources.filter(r => r.fimDeSemana).reduce((acc, curr) => acc + curr.equipe, 0);
  }, [filteredResources]);

  // Analytics resources: representing everything except the status filter
  const analyticsResources = useMemo(() => {
    return resources.filter(res => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = q === "" || 
        res.unidadeApoiada.toLowerCase().includes(q) ||
        res.descricaoApoio.toLowerCase().includes(q) ||
        res.referencia.toLowerCase().includes(q) ||
        res.prescricoes.toLowerCase().includes(q) ||
        res.tipoEvento.toLowerCase().includes(q);

      const matchesUnit = selectedUnit === "TODAS" || 
        res.unidadeApoiada.toLowerCase().includes(selectedUnit.toLowerCase());

      let matchesWeekend = true;
      if (weekendFilter === "SIM") {
        matchesWeekend = res.fimDeSemana === true;
      } else if (weekendFilter === "NÃO") {
        matchesWeekend = res.fimDeSemana === false;
      }

      return matchesSearch && matchesUnit && matchesWeekend;
    });
  }, [resources, searchQuery, selectedUnit, weekendFilter]);

  const activeEquipesCount = useMemo(() => {
    return analyticsResources
      .filter(r => normalizeStatus(r.status) === "EM ANDAMENTO")
      .reduce((acc, curr) => acc + curr.equipe, 0);
  }, [analyticsResources]);

  const todoEquipesCount = useMemo(() => {
    return analyticsResources
      .filter(r => normalizeStatus(r.status) === "PROGRAMADO")
      .reduce((acc, curr) => acc + curr.equipe, 0);
  }, [analyticsResources]);

  const totalPostosCount = useMemo(() => {
    return analyticsResources.length;
  }, [analyticsResources]);

  // Overall global stats (regardless of current table filters) to serve the Real-Time Diagnosis Card
  const globalStats = useMemo(() => {
    let activeEquipes = 0;
    let activeMissions = 0;
    let weekdayEquipes = 0;
    let weekdayMissions = 0;
    let weekendEquipes = 0;
    let weekendMissions = 0;

    resources.forEach(r => {
      const isWeekend = r.fimDeSemana;
      const isActive = r.status.toUpperCase().includes("ANDAMENTO");

      if (isActive) {
        activeEquipes += r.equipe;
        activeMissions++;
        
        if (isWeekend) {
          weekendEquipes += r.equipe;
          weekendMissions++;
        } else {
          weekdayEquipes += r.equipe;
          weekdayMissions++;
        }
      }
    });

    return {
      activeEquipes,
      activeMissions,
      weekdayEquipes,
      weekdayMissions,
      weekendEquipes,
      weekendMissions
    };
  }, [resources]);

  // Use all filtered resources for charts to ensure the charts accurately reflect the filters.
  // When statusFilter is "TODOS", we display all statuses.
  const chartResources = useMemo(() => {
    return filteredResources;
  }, [filteredResources]);

  const chartWeekdayEquipes = useMemo(() => {
    return chartResources.filter(r => !r.fimDeSemana).reduce((acc, curr) => acc + curr.equipe, 0);
  }, [chartResources]);

  const chartWeekendEquipes = useMemo(() => {
    return chartResources.filter(r => r.fimDeSemana).reduce((acc, curr) => acc + curr.equipe, 0);
  }, [chartResources]);

  // Recharts Data Prep: Distribution by Unit
  const barChartData = useMemo(() => {
    const stats: Record<string, number> = {};
    chartResources.forEach(res => {
      // Split merged units to balance correctly
      const parts = res.unidadeApoiada.split(",");
      parts.forEach(part => {
        const title = part.trim();
        if (title) {
          stats[title] = (stats[title] || 0) + res.equipe;
        }
      });
    });

    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7); // Top 7 for rendering nicely
  }, [chartResources]);

  // Recharts Data Prep: Pie chart for Dias Uteis vs Fim de Semana alocation share
  const pieChartData = useMemo(() => {
    const weekdaySum = chartResources.filter(r => !r.fimDeSemana).reduce((acc, curr) => acc + curr.equipe, 0);
    const weekendSum = chartResources.filter(r => r.fimDeSemana).reduce((acc, curr) => acc + curr.equipe, 0);

    return [
      { name: "Dias Úteis", value: weekdaySum, color: "#3B82F6" },
      { name: "Fim de Semana", value: weekendSum, color: "#F43F5E" }
    ].filter(item => item.value > 0);
  }, [chartResources]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#1E293B] font-sans flex flex-col overflow-x-hidden">
      
      {/* COMMAND CONTROL MAIN BAR */}
      <header className="bg-[#0F172A] border-b border-slate-800 text-white min-h-[5rem] h-auto py-3 lg:py-0 lg:h-20 flex flex-col lg:flex-row items-center justify-between px-4 md:px-6 sticky top-0 z-35 shadow-md shrink-0 print:hidden gap-3 lg:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3.5 w-full lg:w-auto">
          <div className="w-9 h-9 md:w-11 md:h-11 bg-[#38BDF8]/10 border border-[#38BDF8]/20 rounded-xl flex items-center justify-center shrink-0">
             <Shield className="w-5 h-5 md:w-5.5 md:h-5.5 text-[#38BDF8]" />
          </div>
          <div className="min-w-0">
            {activePage === "recursos" ? (
              <>
                <h1 className="text-xs sm:text-sm md:text-lg font-black tracking-tighter uppercase leading-none truncate">
                  EMG-PM/3 <span className="text-[#38BDF8] sm:inline hidden">- LOCALIZAÇÃO DE RECURSOS</span>
                  <span className="text-[#38BDF8] sm:hidden inline"> - RECURSOS</span>
                </h1>
                <p className="text-[8px] sm:text-[9px] md:text-[10px] text-slate-400 font-extrabold tracking-[0.10em] sm:tracking-[0.15em] md:tracking-[0.2em] uppercase mt-1 leading-none">
                  RELAÇÃO DE EMPREGO EM ALOCAÇÃO DE RECURSOS
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xs sm:text-sm md:text-lg font-black tracking-tighter uppercase leading-none truncate">
                  EMG-PM/3 <span className="text-[#FFA000] sm:inline hidden">- CONTROLE GRE / RECOM</span>
                  <span className="text-[#FFA000] sm:hidden inline"> - GRE/RECOM</span>
                </h1>
                <p className="text-[8px] sm:text-[9px] md:text-[10px] text-slate-400 font-extrabold tracking-[0.10em] sm:tracking-[0.15em] md:tracking-[0.2em] uppercase mt-1 leading-none">
                  CONTROLE DE RECURSOS RECOM
                </p>
              </>
            )}
          </div>
        </div>

        {/* Segmented Page Navigation Tabs */}
        <div className="flex bg-slate-900/60 p-0.5 sm:p-1 rounded-xl border border-slate-800/80 gap-0.5 sm:gap-1 shrink-0 w-full lg:w-auto">
          <button
            onClick={() => {
              setActivePage("recursos");
              localStorage.setItem("gre_active_page", "recursos");
              triggerToast("Painel de Alocação de Recursos Ativado!");
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 w-1/2 lg:w-auto ${
              activePage === "recursos"
                ? "bg-[#38BDF8] text-[#0F172A] shadow-md shadow-[#38BDF8]/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate hidden sm:inline">Alocação de Recursos</span>
            <span className="truncate sm:hidden inline">Alocação</span>
          </button>
          
          <button
            onClick={() => {
              setActivePage("gre_recom");
              localStorage.setItem("gre_active_page", "gre_recom");
              triggerToast("Painel Controle GRE / RECOM Ativado!", "info");
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 w-1/2 lg:w-auto ${
              activePage === "gre_recom"
                ? "bg-[#FFA000] text-[#0F172A] shadow-md shadow-[#FFA000]/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate hidden sm:inline">Controle GRE / RECOM</span>
            <span className="truncate sm:hidden inline">Controle GRE</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between lg:justify-end gap-2 w-full lg:w-auto border-t lg:border-t-0 border-slate-800/60 pt-2 lg:pt-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowConfig(!showConfig)}
              title="Ajustar link da planilha"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all shadow-xs shrink-0"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Auto-Sync Toggle Widget */}
            <button
              onClick={() => {
                if (isAutoSyncEnabled) {
                  setIsAutoSyncEnabled(false);
                } else {
                  setIsAutoSyncEnabled(true);
                  setNextSyncSeconds(60);
                }
              }}
              title={isAutoSyncEnabled ? "Clique para pausar auto-atualização" : "Clique para iniciar auto-atualização"}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all select-none duration-300 shrink-0 ${
                isAutoSyncEnabled 
                  ? "bg-slate-800/80 border-[#00c27e]/30 text-emerald-400 hover:bg-slate-700/80" 
                  : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800/85"
              }`}
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                {isAutoSyncEnabled ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                )}
              </span>
              <span>Sync {isAutoSyncEnabled ? `${nextSyncSeconds}s` : "OFF"}</span>
            </button>

            <button
              onClick={triggerPrintReport}
              className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-150 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all shadow-xs shrink-0"
              title="Imprimir ou Salvar Relatório PDF"
            >
              <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#38BDF8]" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-px h-6 bg-slate-800 hidden md:block" />

            <button
              onClick={syncSpreadsheet}
              disabled={isLoading}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 md:px-5 h-8 sm:h-10 md:h-11 bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0F172A] rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
              <span className="sm:hidden inline">Sync</span>
            </button>
          </div>
        </div>
      </header>

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block bg-white p-6 border-b-2 border-slate-900 pb-4 mb-4">
        <h1 className="text-3xl font-black uppercase tracking-tight text-[#0F172A]">LOCALIZAÇÃO DE RECURSOS</h1>
        <h2 className="text-sm font-bold uppercase text-slate-500 tracking-wider">ESTADO MAIOR GERAL - PM/3 • PMERJ</h2>
        <p className="text-xs text-slate-400 mt-1">Relatório Oficial de Emprego Operacional Gerado em: {lastUpdated}</p>
      </div>

      {/* SPREADSHEET MANAGER DRAWER */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-slate-300 shadow-md overflow-hidden print:hidden"
          >
            <div className="max-w-4xl mx-auto p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-black text-[#0F172A] uppercase tracking-widest mb-1">
                    Conexão Dinâmica do Controle PM/3
                  </h3>
                  <p className="text-xs text-slate-500">
                    Insira o link para a nova planilha de apoio. O sistema mapeia os campos por equivalência semântica.
                  </p>
                </div>
                <button 
                  onClick={() => setShowConfig(false)}
                  className="px-2 py-1 bg-red-550 hover:bg-red-600 text-[#0F172A] hover:text-red-50 text-[10px] uppercase font-black tracking-widest rounded-lg transition-all"
                >
                  Fechar
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1 w-full">
                    <Link className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={sheetUrl}
                      onChange={(e) => updateSheetUrl(e.target.value)}
                      placeholder="Link do Google Sheets (Modo Leitura / Qualquer pessoa com o link pode acessar)"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
                    />
                  </div>
                  
                  <button
                    onClick={syncSpreadsheet}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-6 py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl font-black text-xs uppercase tracking-wide transition-colors whitespace-nowrap"
                  >
                    Mapear Nova Planilha
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-100 pt-2.5">
                  <span>Os dados georreferenciados respeitam os endereços listados</span>
                  <button 
                    onClick={handleResetDefaults}
                    className="text-red-650 hover:underline text-left"
                  >
                    Restaurar Planilha do Demo ORIGINAL
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE VIEWPORT FOR COLEGAS SGO / CORONEL */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col gap-6 max-w-[1600px] mx-auto w-full">

        {/* EXECUTIVE OFFICIAL NOBLE HEADER */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 pt-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[#38BDF8] bg-[#0F172A] px-2.5 py-1.5 rounded-xl uppercase font-mono tracking-wider shadow-xs">
              EMG-PM/3
            </span>
            <span className="text-sm font-bold text-slate-300">|</span>
            <h2 className="text-sm font-black text-[#0F172A] tracking-wider uppercase leading-none">
              {activePage === "recursos" ? "LOCALIZAÇÃO DE RECURSOS" : "CONTROLE DE GRE / RECOM"}
            </h2>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-bold text-[#0F172A] flex items-center justify-end gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 bg-[#00c27e] rounded-full relative flex shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00c27e] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00c27e]"></span>
              </span>
              <span className="text-[10px] uppercase font-black text-slate-400">Sincronizado em {lastUpdated}</span>
            </p>
          </div>
        </div>

        {/* 
          REVERT POINT: Use this section to restore the top primary filters (from Image 2 style) if required.
          To keep the screen extremely clean for Command use ("Executive Presentation Layout"), 
          the top filters have been removed here and re-integrated directly above the resources table below.
        */}

        {/* ROW 2: CORPORAL VISUAL CARDS IN HIGH FIDELITY (IMAGE 3 DIRECT CLONE) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 print:hidden">
          
          {/* Card 1: Equipes GRE em Andamento & Não Iniciado */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between group hover:border-[#38BDF8] transition-all relative overflow-hidden h-auto lg:h-48 lg:col-span-1 gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Users className="w-3.5 h-3.5 text-[#38BDF8]" />
                <p className="text-[9px] font-black uppercase tracking-widest leading-none">
                  Visão Geral do Efetivo GRE
                </p>
              </div>
            </div>

            {/* Grid dual stats with gorgeous visual layout */}
            <div className="grid grid-cols-2 gap-3 flex-1">
              {/* Em Andamento */}
              <div className="bg-[#00c27e]/5 hover:bg-[#00c27e]/10 rounded-2xl p-2.5 border border-emerald-100/60 transition-all flex flex-col justify-between">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#00c27e] rounded-full relative flex shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00c27e] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00c27e]"></span>
                  </span>
                  <span className="text-[8px] text-[#00a86b] font-extrabold uppercase tracking-widest leading-none">ATIVAS</span>
                </div>
                <div className="flex items-baseline gap-1 mt-1 font-sans">
                  <span className="text-3xl md:text-4xl font-black text-[#0F172A] tracking-tighter leading-none">{activeEquipesCount}</span>
                  <span className="text-[8px] font-black text-slate-450 uppercase tracking-widest">GRE</span>
                </div>
                <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-tight mt-1 leading-none">Em Andamento</p>
              </div>

              {/* Não Iniciado / Programado */}
              <div className="bg-[#fbc11c]/5 hover:bg-[#fbc11c]/10 rounded-2xl p-2.5 border border-amber-100/60 transition-all flex flex-col justify-between">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#fbc11c] rounded-full shrink-0" />
                  <span className="text-[8px] text-amber-700 font-extrabold uppercase tracking-widest leading-none">PENDENTES</span>
                </div>
                <div className="flex items-baseline gap-1 mt-1 font-sans">
                  <span className="text-3xl md:text-4xl font-black text-[#0F172A] tracking-tighter leading-none">{todoEquipesCount}</span>
                  <span className="text-[8px] font-black text-slate-450 uppercase tracking-widest">GRE</span>
                </div>
                <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-tight mt-1 leading-none">Não Iniciado</p>
              </div>
            </div>

            {/* Professional and precise status representation with postos total */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <span>Postos Operacionais</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-550/15 text-slate-700 border border-slate-200/50">
                {totalPostosCount} {totalPostosCount === 1 ? 'POSTO' : 'POSTOS'}
              </span>
            </div>
          </div>

          {/* Card 2: Análise Geral em Tempo Real (Diagnostic Bento Stats) */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden h-auto min-h-[12rem] lg:h-48 lg:col-span-2 group hover:border-[#38BDF8]/40 transition-all gap-4">
            
            {/* Ambient Background Wave effect */}
            <div className="absolute right-0 bottom-0 top-0 w-80 bg-gradient-to-l from-slate-50 via-transparent to-transparent pointer-events-none rounded-r-2xl" />
            <div className="absolute -right-12 -bottom-12 w-48 h-48 border border-slate-100 rounded-full pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2 z-10 w-full gap-2">
              <div className="flex items-center gap-1.5 text-slate-800">
                <Shield className="w-4 h-4 text-[#38BDF8]" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Diagnóstico em Tempo Real (Simultâneo)</span>
              </div>
              <span className="inline-flex self-start sm:self-auto items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 rounded-md text-[8px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-inner">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> Sincronismo {lastUpdated}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 min-h-0 z-10">
              
              {/* COL 1: EM ANDAMENTO */}
              <div className="bg-emerald-50/50 hover:bg-emerald-50 rounded-xl p-2.5 border border-emerald-100/60 transition-all flex flex-col justify-between gap-2 group/col">
                <div>
                  <p className="text-[8px] text-emerald-600 font-extrabold uppercase tracking-widest leading-none">Em Andamento</p>
                  <div className="flex items-baseline gap-1 mt-1.5 font-sans">
                    <span className="text-3xl font-black text-slate-800 tracking-tighter group-hover/col:text-emerald-600 transition-colors">
                      {globalStats.activeEquipes}
                    </span>
                    <span className="text-[9px] font-extrabold text-emerald-600 tracking-widest uppercase">Eqp</span>
                  </div>
                </div>
                <p className="text-[8px] text-emerald-700 font-black uppercase tracking-wider mt-1 border-t border-emerald-100 pb-0.5 pt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                  {globalStats.activeMissions} {globalStats.activeMissions === 1 ? 'Missão Ativa' : 'Missões Ativas'}
                </p>
              </div>

              {/* COL 2: DIAS ÚTEIS */}
              <div className="bg-blue-50/40 hover:bg-blue-50/70 rounded-xl p-2.5 border border-blue-100/50 transition-all flex flex-col justify-between gap-2 group/col">
                <div>
                  <p className="text-[8px] text-blue-600 font-extrabold uppercase tracking-widest leading-none">Dias Úteis</p>
                  <div className="flex items-baseline gap-1 mt-1.5 font-sans">
                    <span className="text-3xl font-black text-slate-800 tracking-tighter group-hover/col:text-blue-600 transition-colors">
                      {globalStats.weekdayEquipes}
                    </span>
                    <span className="text-[9px] font-extrabold text-blue-600 tracking-widest uppercase">Eqp</span>
                  </div>
                </div>
                <p className="text-[8px] text-blue-700 font-black uppercase tracking-wider mt-1 border-t border-blue-150 pb-0.5 pt-1.5">
                  {globalStats.weekdayMissions} {globalStats.weekdayMissions === 1 ? 'Mapeada' : 'Mapeadas'}
                </p>
              </div>

              {/* COL 3: FIM DE SEMANA */}
              <div className="bg-rose-50/40 hover:bg-rose-50/70 rounded-xl p-2.5 border border-rose-100/55 transition-all flex flex-col justify-between gap-2 group/col">
                <div>
                  <p className="text-[8px] text-rose-600 font-extrabold uppercase tracking-widest leading-none">Fins de Semana</p>
                  <div className="flex items-baseline gap-1 mt-1.5 font-sans">
                    <span className="text-3xl font-black text-slate-800 tracking-tighter group-hover/col:text-rose-600 transition-colors">
                      {globalStats.weekendEquipes}
                    </span>
                    <span className="text-[9px] font-extrabold text-rose-600 tracking-widest uppercase">Eqp</span>
                  </div>
                </div>
                <p className="text-[8px] text-rose-700 font-black uppercase tracking-wider mt-1 border-t border-rose-150 pb-0.5 pt-1.5">
                  {globalStats.weekendMissions} {globalStats.weekendMissions === 1 ? 'Mapeada' : 'Mapeadas'}
                </p>
              </div>

            </div>
          </div>

        </section>

        {/* FEED DE PRESCRIÇÕES E ALERTAS OPERACIONAIS (EXECUTIVE AUTO-CAROUSEL) */}
        {specialAlerts.length > 0 && (
          <section className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border-l-4 border-amber-500 bg-white p-3 sm:p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 shrink-0 print:hidden transition-all duration-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse-none">
                <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 leading-none block">
                  Prescrições e Alertas EMG-PM/3
                </span>
                <p className="text-xs text-slate-700 font-semibold mt-1 leading-tight">
                  Foco em andamento
                </p>
              </div>
            </div>

            {/* Carousel Active Card with Smooth Motion Animate */}
            <div className="flex-1 max-w-2xl w-full min-w-0 flex items-center gap-2 sm:gap-3">
              <AnimatePresence mode="wait">
                {specialAlerts[activeAlertIndex] && (
                  <motion.div
                    key={activeAlertIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 min-w-0 bg-white border border-amber-200/50 rounded-xl p-2 sm:p-3 shadow-xs flex items-center justify-between gap-3 sm:gap-4 cursor-pointer hover:border-amber-450 transition-all select-none"
                    onClick={() => {
                      setSelectedResource(specialAlerts[activeAlertIndex]);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                        <span className="text-[8px] font-black text-amber-800 uppercase bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
                          {specialAlerts[activeAlertIndex].unidadeApoiada}
                        </span>
                        <span className="text-[7.5px] text-slate-400 font-extrabold uppercase tracking-widest truncate">
                          Ref: {specialAlerts[activeAlertIndex].referencia}
                        </span>
                        {normalizeStatus(specialAlerts[activeAlertIndex].status) === "EM ANDAMENTO" && (
                          <span className="w-1.5 h-1.5 bg-[#00c27e] rounded-full relative flex shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00c27e] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00c27e]"></span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-800 font-bold leading-tight line-clamp-1">
                        {specialAlerts[activeAlertIndex].prescricoes}
                      </p>
                    </div>
                    
                    <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-1 rounded-md shrink-0 border border-amber-100 uppercase tracking-wider">
                      VER DETALHE
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Indicator dots to manage carousel */}
              <div className="flex flex-col gap-1 shrink-0 justify-center">
                {specialAlerts.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    onClick={() => setActiveAlertIndex(dotIdx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      activeAlertIndex === dotIdx 
                        ? "bg-amber-500 scale-125 shadow-sm" 
                        : "bg-slate-200 hover:bg-slate-350"
                    }`}
                    title={`Ver alerta ${dotIdx + 1}`}
                  />
                ))}
              </div>
            </div>

          </section>
        )}

        {/* ROW 3: RECHARTS CHARTS SECTION FROM SCREENSHOT (IMAGE 3 MIDDLE LAYOUT) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0 print:hidden">
          
          {/* Chart Left: DISTRIBUICAO POR UNIDADE */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-[#38BDF8]/40 transition-all duration-300 flex flex-col h-80 relative overflow-hidden"
          >
            {/* Soft decorative background pulse */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl opacity-50 pointer-events-none" />

            <div className="flex items-center gap-2 mb-4 shrink-0 justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#38BDF8]" />
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    DISTR. POR UNIDADE MILITAR
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                    statusFilter === "TODOS"
                      ? "bg-[#0F172A]/5 text-[#0F172A] border-[#0F172A]/10"
                      : statusFilter === "EM ANDAMENTO"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200/50"
                        : statusFilter === "PROGRAMADO"
                          ? "bg-blue-50 text-blue-600 border-blue-200/50"
                          : "bg-slate-50 text-slate-600 border-slate-200/50"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      statusFilter === "TODOS"
                        ? "bg-[#38BDF8]"
                        : statusFilter === "EM ANDAMENTO"
                          ? "bg-[#00c27e] animate-pulse"
                          : statusFilter === "PROGRAMADO"
                            ? "bg-[#3B82F6]"
                            : "bg-[#64748B]"
                    }`} />
                    {statusFilter === "TODOS" ? "TODOS OS STATUS" : statusFilter}
                  </span>
                  {statusFilter === "TODOS" && (
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">
                      (Visão Geral)
                    </span>
                  )}
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-[#38BDF8]/45 animate-pulse" />
            </div>

            <div className="flex-1 w-full min-h-0" key={`bar-container-${filteredResources.length}-${statusFilter}-${weekendFilter}`}>
              {barChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs font-black uppercase">
                  Sem dados para exibição gráfica
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="gBlue" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="gIndigo" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#818CF8" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="gPurple" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#A78BFA" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="gRose" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#E11D48" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#F43F5E" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="gAmber" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#D97706" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#FBBF24" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="gEmerald" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#059669" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#34D399" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="gSlate" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#475569" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#64748B" stopOpacity={1} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#94A3B8" fontSize={9} fontWeight="bold" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={9} width={75} fontWeight="bold" />
                    
                    <RechartsTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#0F172A] border border-slate-750/70 p-3 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] backdrop-blur-md relative overflow-hidden select-none min-w-[12rem]">
                              <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#38BDF8]" />
                              <p className="text-[9px] uppercase font-mono font-black text-slate-400 tracking-wider mb-1">
                                UNIDADE APOIADA
                              </p>
                              <p className="text-[11px] font-black text-white uppercase tracking-tight truncate">
                                {data.name}
                              </p>
                              <p className="text-sm font-black text-[#38BDF8] mt-1 text-right">
                                {data.value} <span className="text-[8px] text-slate-400 uppercase tracking-widest font-sans ml-0.5">Equipe(s)</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
                      {barChartData.map((entry, index) => {
                        const grads = ['url(#gBlue)', 'url(#gIndigo)', 'url(#gPurple)', 'url(#gRose)', 'url(#gAmber)', 'url(#gEmerald)', 'url(#gSlate)'];
                        return <Cell key={`cell-${index}`} fill={grads[index % grads.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Chart Right: PARTICIPACAO NO EMPREGO */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-[#38BDF8]/40 transition-all duration-300 flex flex-col h-80 relative overflow-hidden"
          >
            {/* Soft decorative background pulse */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl opacity-50 pointer-events-none" />

            <div className="flex items-center gap-2 mb-4 shrink-0 justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-rose-500" />
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    PARTICIPAÇÃO NO EMPREGO (ESTRUTR. DE TURNOS)
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                    statusFilter === "TODOS"
                      ? "bg-[#0F172A]/5 text-[#0F172A] border-[#0F172A]/10"
                      : statusFilter === "EM ANDAMENTO"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200/50"
                        : statusFilter === "PROGRAMADO"
                          ? "bg-blue-50 text-blue-600 border-blue-200/50"
                          : "bg-slate-50 text-slate-600 border-slate-200/50"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      statusFilter === "TODOS"
                        ? "bg-[#38BDF8]"
                        : statusFilter === "EM ANDAMENTO"
                          ? "bg-[#00c27e] animate-pulse"
                          : statusFilter === "PROGRAMADO"
                            ? "bg-[#3B82F6]"
                            : "bg-[#64748B]"
                    }`} />
                    {statusFilter === "TODOS" ? "TODOS OS STATUS" : statusFilter}
                  </span>
                  {statusFilter === "TODOS" && (
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">
                      (Visão Geral)
                    </span>
                  )}
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-rose-500/40 animate-pulse" />
            </div>

            <div className="flex-1 flex flex-col sm:flex-row items-center justify-center min-h-0 gap-6">
              
              <div className="w-44 h-44 shrink-0" key={`pie-container-${filteredResources.length}-${statusFilter}-${weekendFilter}`}>
                {pieChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-[10px]">
                    Sem emprego
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <linearGradient id="pieWeekdayGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#1E40AF" />
                        </linearGradient>
                        <linearGradient id="pieWeekendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F43F5E" />
                          <stop offset="100%" stopColor="#BE123C" />
                        </linearGradient>
                      </defs>

                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => {
                          const fillGrad = entry.name === "Dias Úteis" ? "url(#pieWeekdayGrad)" : "url(#pieWeekendGrad)";
                          return <Cell key={`cell-${index}`} fill={fillGrad} />;
                        })}
                      </Pie>
                      
                      <RechartsTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const isWeekend = data.name === "Fim de Semana";
                            return (
                              <div className="bg-[#0F172A] border border-slate-755/60 p-3 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] backdrop-blur-md relative overflow-hidden select-none min-w-[12rem]">
                                <div className={`absolute top-0 bottom-0 left-0 w-1 ${isWeekend ? 'bg-[#F43F5E]' : 'bg-[#3B82F6]'}`} />
                                <p className="text-[9px] uppercase font-mono font-black text-slate-400 tracking-wider mb-1">
                                  TIPO DE TURNO
                                </p>
                                <p className="text-[11px] font-black text-white uppercase tracking-tight truncate">
                                  {data.name}
                                </p>
                                <p className="text-sm font-black text-white mt-1 text-right">
                                  {data.value} <span className="text-[8px] text-slate-400 uppercase tracking-widest font-sans ml-0.5">Equipe(s)</span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Pie Legends */}
              <div className="flex-1 space-y-3.5 w-full font-sans">
                <div className="border-b border-slate-100 pb-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Rateio de Turnos</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
                      <span>Dias Úteis</span>
                    </div>
                    <span className="font-extrabold text-[#0F172A]">{chartWeekdayEquipes} Equipe(s)</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#F43F5E]" />
                      <span>Fins de Semana</span>
                    </div>
                    <span className="font-extrabold text-[#0F172A]">{chartWeekendEquipes} Equipe(s)</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/80 text-[11px] font-black uppercase text-slate-600 text-center select-none shadow-3xs flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Carga Geral ({statusFilter === "TODOS" ? "TODOS OS STATUS" : statusFilter})</span>
                  <span className="text-sm text-[#0F172A] font-black tracking-tight">{chartWeekdayEquipes + chartWeekendEquipes} EQUIPES {statusFilter === "TODOS" ? "TOTAL" : statusFilter === "EM ANDAMENTO" ? "ATIVAS" : statusFilter}</span>
                </div>
              </div>

            </div>
          </motion.div>

        </section>

        {/* ROW 4: RELAÇÃO DE EMPREGO (ALWAYS VISIBLE CORE DATA TABLE) */}
        <section className="bg-white border border-slate-200 rounded-3xl shadow-lg flex flex-col flex-1 overflow-hidden" id="relacao-de-emprego">
          
          {/* Header Block of Table Section */}
          <div className="p-6 border-b border-slate-100 flex flex-col gap-5 shrink-0 bg-slate-50/50 print:hidden">
            
            {/* Top row of Table header: Title, Counts and Stats */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#0F172A] text-[#38BDF8] rounded-2xl flex items-center justify-center shadow-lg">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0F172A] uppercase tracking-tighter">RELAÇÃO DE EMPREGO</h3>
                  <p className="text-[9px] text-[#38BDF8] font-black uppercase tracking-widest mt-0.5">Efetivo de Apoio em Emprego Operacional</p>
                </div>
              </div>

              {/* Counts */}
              <div className="flex flex-wrap items-center gap-2">
                <motion.div 
                  key={`card-total-equipes-${totalEquipes}`}
                  initial={{ scale: 0.95, opacity: 0, y: 5 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#010712] border border-[#38BDF8]/30 px-4 py-2 rounded-xl flex items-center gap-3 shadow-md cursor-default group"
                >
                  <div className="relative bg-[#38BDF8]/10 p-2 rounded-lg text-[#38BDF8] border border-[#38BDF8]/20 shadow-sm shrink-0">
                    <Shield className="w-4 h-4 text-[#38BDF8]" />
                  </div>
                  <div className="relative text-left pr-1 shrink-0">
                    <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">EQUIPES FILTRADAS</p>
                    <div className="flex items-baseline gap-1 mt-1 leading-none">
                      <span className="text-xl font-black text-white tracking-tighter leading-none">{totalEquipes}</span>
                      <span className="text-[9px] text-[#38BDF8] uppercase font-black tracking-wider leading-none">Equipes</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Middle row of Table header: Advanced search & unit filters */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
              
              {/* Search text input */}
              <div className="relative md:col-span-7">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por Unidade, Tipo de Apoio, Referência, Prescrições..."
                  className="w-full pl-10 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#38BDF8] text-slate-800 placeholder-slate-400/80 shadow-xs"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2.5 text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-1.5 py-1 rounded-md"
                  >
                    LIMPAR
                  </button>
                )}
              </div>

              {/* Supported Unit dropdown selector */}
              <div className="relative md:col-span-5">
                <button
                  onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                  className="w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-left text-xs font-extrabold text-[#0F172A] flex items-center justify-between transition-colors shadow-xs"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Shield className="w-3.5 h-3.5 text-[#38BDF8]" />
                    {selectedUnit === "TODAS" ? "TODAS AS UNIDADES APOIADAS" : `UOP: ${selectedUnit}`}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {isUnitDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                    <div className="p-1.5 grid grid-cols-1 gap-0.5">
                      {uniqueUnits.map(unit => (
                        <button
                          key={unit}
                          onClick={() => {
                            setSelectedUnit(unit);
                            setIsUnitDropdownOpen(false);
                          }}
                          className={`text-left px-3.5 py-2 rounded-lg text-xs font-bold uppercase transition-colors flex items-center justify-between ${
                            selectedUnit === unit 
                              ? "bg-[#0F172A] text-[#38BDF8]" 
                              : "hover:bg-slate-50 text-slate-650"
                          }`}
                        >
                          <span>{unit === "TODAS" ? "TODAS AS UNIDADES" : unit}</span>
                          {selectedUnit === unit && <CheckCircle2 className="w-3.5 h-3.5 text-[#38BDF8]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Bottom row of Table header: Quick switch situation + weekend */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center pt-1">
              
              {/* Situation Filter */}
              <div className="flex-1 w-full md:w-auto">
                <span className="text-[8px] font-black uppercase tracking-widest text-[#0F172A] block mb-1.5 font-sans">Status</span>
                <div className="flex bg-slate-100/80 border border-slate-200/60 p-1 rounded-xl gap-1 shadow-xs overflow-x-auto custom-scrollbar">
                  {["TODOS", "EM ANDAMENTO", "PROGRAMADO", "FINALIZADO"].map(st => {
                    const isSelected = statusFilter === st;
                    let activeStyles = "";
                    
                    if (isSelected) {
                      if (st === "TODOS") {
                        activeStyles = "bg-[#0F172A] text-white shadow-[0_2px_8px_rgba(15,23,42,0.25)] border-[#38BDF8]/40 ring-1 ring-[#38BDF8]/30 font-extrabold";
                      } else if (st === "EM ANDAMENTO") {
                        activeStyles = "bg-[#00c27e] text-white shadow-[0_2px_12px_rgba(0,194,126,0.4)] border-emerald-400/30 font-extrabold";
                      } else if (st === "PROGRAMADO") {
                        activeStyles = "bg-[#3B82F6] text-white shadow-[0_2px_12px_rgba(59,130,246,0.4)] border-blue-400/30 font-extrabold";
                      } else if (st === "FINALIZADO") {
                        activeStyles = "bg-[#64748B] text-white shadow-[0_2px_10px_rgba(100,116,139,0.3)] border-slate-500/20 font-extrabold";
                      }
                    } else {
                      activeStyles = "bg-white/80 border-slate-200/50 text-slate-500 hover:text-slate-800 hover:bg-white hover:border-slate-300 hover:shadow-2xs";
                    }

                    return (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-wider transition-all duration-300 whitespace-nowrap flex-1 text-center border cursor-pointer active:scale-[0.96] ${activeStyles}`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weekend Filter */}
              <div className="w-full md:w-auto shrink-0 animate-pulse-none">
                <span className="text-[8px] font-black uppercase tracking-widest text-[#0F172A] block mb-1.5 font-sans">Fim de Semana?</span>
                <div className="flex bg-slate-100/80 border border-slate-200/60 p-1 rounded-xl gap-1 shadow-xs">
                  {["TODOS", "SIM", "NÃO"].map(we => {
                    const isSelected = weekendFilter === we;
                    let activeStyles = "";
                    
                    if (isSelected) {
                      if (we === "TODOS") {
                        activeStyles = "bg-[#0F172A] text-white shadow-[0_2px_8px_rgba(15,23,42,0.25)] border-[#38BDF8]/30 ring-1 ring-[#38BDF8]/20 font-extrabold";
                      } else if (we === "SIM") {
                        activeStyles = "bg-[#E11D48] text-white shadow-[0_2px_12px_rgba(225,29,72,0.35)] border-rose-400/20 font-extrabold";
                      } else if (we === "NÃO") {
                        activeStyles = "bg-[#1E293B] text-white shadow-[0_2px_10px_rgba(30,41,59,0.3)] border-slate-500/30 font-extrabold";
                      }
                    } else {
                      activeStyles = "bg-white/80 border-slate-200/50 text-slate-500 hover:text-slate-800 hover:bg-white hover:border-slate-300 hover:shadow-2xs";
                    }

                    return (
                      <button
                        key={we}
                        onClick={() => setWeekendFilter(we)}
                        className={`px-4 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-wider transition-all duration-300 border cursor-pointer active:scale-[0.96] ${activeStyles}`}
                      >
                        {we}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[480px] md:max-h-[580px] lg:max-h-[650px] custom-scrollbar print:max-h-none print:overflow-visible">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full text-left border-collapse table-fixed md:table-auto">
                <thead className="sticky top-0 bg-slate-900 text-[#38BDF8] text-[9px] uppercase font-black tracking-widest z-10">
                  <tr>
                    <th className="px-6 py-4 w-[160px] md:w-auto">Data / Turno</th>
                    <th className="px-6 py-4 w-[150px] md:w-auto">Unidade Apoiada</th>
                    <th className="px-6 py-4 w-[160px] md:w-auto">Local do Mapa</th>
                    <th className="px-6 py-4 w-[120px] md:w-auto">Status</th>
                    <th className="px-6 py-4 w-[240px] md:w-auto">Descrição do Apoio</th>
                    <th className="px-6 py-4 w-[80px] md:w-auto text-center">Equipe</th>
                    <th className="px-6 py-4 w-[150px] md:w-auto">Referência</th>
                    <th className="px-6 py-4 w-[80px] text-right print:hidden">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResources.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-slate-455 font-black text-xs uppercase tracking-widest">
                        <AlertCircle className="w-9 h-9 mx-auto mb-3 text-slate-300" />
                        Nenhum boletim atende aos parâmetros atuais de alocação
                      </td>
                    </tr>
                  ) : (
                    filteredResources.map((row) => (
                      <tr 
                        key={row.id}
                        onClick={() => setSelectedResource(row)}
                        className="hover:bg-slate-50/80 transition-all cursor-pointer group"
                      >
                        {/* Data / Turno */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-start gap-2">
                              <Clock className="w-3.5 h-3.5 text-[#38BDF8] mt-0.5 shrink-0" />
                              <span className="text-[11px] font-black text-slate-705 uppercase leading-tight">{row.dataTurno}</span>
                            </div>
                            {row.fimDeSemana && (
                              <div className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-600 font-black text-[8px] uppercase tracking-wider">
                                <CalendarDays className="w-2.5 h-2.5 text-rose-500 animate-pulse" />
                                <span>Fim de Semana</span>
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* Unidade Apoiada */}
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {row.unidadeApoiada.split(",").map((unit, i) => (
                              <span 
                                key={i}
                                className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[9px] font-black rounded border border-slate-200 uppercase/80"
                              >
                                {unit.trim()}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Local do Mapa */}
                        <td className="px-6 py-4">
                          {row.localMapa ? (
                            <div className="flex items-center gap-1 min-w-[130px]">
                              <MapPin className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                              <span className="text-[11px] font-black text-slate-700 uppercase leading-snug line-clamp-2">
                                {row.localMapa}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight bg-slate-50 border border-slate-200/50 px-1.5 py-0.5 rounded">
                              SGO (Padrão)
                            </span>
                          )}
                        </td>

                        {/* Status / Situacao */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            normalizeStatus(row.status) === "EM ANDAMENTO" 
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-250" 
                              : normalizeStatus(row.status) === "PROGRAMADO"
                              ? "bg-amber-100 text-amber-800 border border-amber-250"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              normalizeStatus(row.status) === "EM ANDAMENTO" 
                                ? "bg-emerald-500 animate-pulse" 
                                : normalizeStatus(row.status) === "PROGRAMADO"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`} />
                            {row.status.toUpperCase()}
                          </span>
                        </td>

                        {/* Descricao Apoio */}
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-tight line-clamp-2 md:line-clamp-none">
                            {row.descricaoApoio}
                          </p>
                        </td>

                        {/* Equipes GRE alocadas */}
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 bg-[#0F172A] text-[#38BDF8] rounded-full text-xs font-black ring-2 ring-slate-100 shadow">
                            {row.equipe}
                          </span>
                        </td>

                        {/* Referencia */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 max-w-[200px]">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight truncate filter group-hover:text-[#0F172A] transition-colors">
                              {row.referencia}
                            </span>
                          </div>
                        </td>

                        {/* Actions (View details) */}
                        <td className="px-6 py-4 text-right print:hidden">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedResource(row);
                            }}
                            className="p-2 bg-slate-50 group-hover:bg-[#0F172A] text-slate-400 group-hover:text-white rounded-xl transition-all shadow-sm"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-900 px-6 py-3 border-t border-slate-800 text-[9px] text-[#38BDF8] font-black uppercase tracking-widest shrink-0 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>SISTEMA DE CONTROLE • EXCLUSIVO EMG-PM/3</span>
            <span className="text-slate-400">Pressione qualquer linha do mapa ou tabela para obter detalhamentos.</span>
          </div>

        </section>

      </main>

      {/* FOOTER - INTEGRATED OFFICIAL LAYOUT FROM SCREENSHOT */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 px-6 z-30 shrink-0">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left text-xs font-bold uppercase tracking-wider text-slate-500">
            <div>
              <span className="text-[9px] text-slate-400 block mb-0.5 font-black uppercase tracking-widest">CHEFE DA PM/3</span>
              <span className="text-[#0F172A] font-extrabold">TEN. CORONEL MOREIRA</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-slate-200" />
            <div>
              <span className="text-[9px] text-slate-400 block mb-0.5 font-black uppercase tracking-widest">OFICIAL ENCARREGADO</span>
              <span className="text-[#0F172A] font-extrabold">CAPITÃO TRAVAGLIA</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] uppercase tracking-widest font-mono border border-slate-200 select-all font-black">
              DEV.FIEL.26
            </span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              PMERJ • SGO • EMG-PM/3 V2.42
            </p>
          </div>

        </div>
      </footer>

      {/* DETAILED INFORMATION MODAL INTEGRATED WITH LEAFLET MAP (IMAGE 4 MATCH) */}
      <AnimatePresence>
        {selectedResource && (() => {
          const dates = getDatesAndTimes(selectedResource.dataTurno, selectedResource.fimDeSemana);
          return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm print:hidden">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedResource(null)}
                className="absolute inset-0"
              />
              
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-5xl bg-white rounded-2xl md:rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col z-[10001]"
              >
                
                {/* Modal Banner Header */}
                <div className="bg-[#0F172A] p-4.5 md:p-6 text-white flex items-center justify-between shrink-0 gap-4">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                     <div className="w-10 h-10 md:w-11 md:h-11 bg-[#38BDF8]/10 border border-[#38BDF8]/20 rounded-xl flex items-center justify-center shrink-0">
                        <Shield className="w-5.5 h-5.5 text-[#38BDF8]" />
                     </div>
                     <div className="min-w-0">
                        <h3 className="text-sm md:text-xl font-extrabold uppercase tracking-tighter text-white truncate">
                          DETALHAMENTO DO EMPREGO
                        </h3>
                        <p className="text-[8px] md:text-[9px] font-black text-[#38BDF8] uppercase tracking-[0.15em] leading-none mt-1.5 truncate">
                          DADOS TÉCNICOS OPERACIONAIS • PM/3 SGO
                        </p>
                     </div>
                  </div>
                  <button 
                    onClick={() => setSelectedResource(null)}
                    className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>

                {/* Modal Body: Left side detail grids, Right side interactive leaflet map */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col lg:flex-row gap-6 md:gap-8 custom-scrollbar">
                  
                  {/* Details list (matches Image 4 layout fields perfectly) */}
                  <div className="w-full lg:max-w-md xl:max-w-lg shrink-0 space-y-5 md:space-y-6">
                    
                    {/* Unidade Apoiada badge header */}
                    <div className="bg-[#f0f9ff]/70 border border-sky-100 p-4.5 rounded-[1.5rem] shadow-2xs">
                      <p className="text-[9px] md:text-[10px] font-black text-[#0369A1] uppercase tracking-widest leading-none mb-2">
                        UNIDADE APOIADA / UOP
                      </p>
                      <p className="text-lg md:text-2xl font-black text-[#0369A1] uppercase leading-tight tracking-tight">
                        {selectedResource.unidadeApoiada}
                      </p>
                    </div>

                    {/* Localização do Mapa (LOCALMAPA) */}
                    {selectedResource.localMapa && (
                      <div className="bg-emerald-50/50 border border-emerald-150 p-4.5 rounded-[1.5rem] shadow-2xs">
                        <p className="text-[9px] md:text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none mb-2 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" /> LOCALIZAÇÃO / PONTO DE REFERÊNCIA
                        </p>
                        <p className="text-xs md:text-sm font-black text-emerald-950 uppercase leading-snug break-words">
                          {selectedResource.localMapa}
                        </p>
                      </div>
                    )}

                    {/* Operational parameters grid cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      
                      {/* Status */}
                      <div className="bg-white p-4.5 rounded-[1.5rem] border border-slate-150 flex flex-col justify-between shadow-2xs min-h-[6.5rem]">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3">Status do Emprego</p>
                        {normalizeStatus(selectedResource.status) === "EM ANDAMENTO" ? (
                          <div className="w-full bg-[#00c27e] text-white rounded-2xl py-3 px-4 flex items-center justify-center gap-2 font-black text-xs tracking-wider shadow-[0_4px_12px_rgba(0,194,126,0.22)] select-none uppercase">
                            <span>{selectedResource.status.toUpperCase()}</span>
                            <span className="w-1.5 h-1.5 bg-white rounded-full relative flex shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                            </span>
                          </div>
                        ) : normalizeStatus(selectedResource.status) === "PROGRAMADO" ? (
                          <div className="w-full bg-[#3B82F6] text-white rounded-2xl py-3 px-4 flex items-center justify-center gap-2 font-black text-xs tracking-wider shadow-[0_4px_12px_rgba(59,130,246,0.22)] select-none uppercase">
                            <span>{selectedResource.status.toUpperCase()}</span>
                            <span className="w-1.5 h-1.5 bg-white rounded-full shrink-0 animate-pulse" />
                          </div>
                        ) : (
                          <div className="w-full bg-slate-500 text-white rounded-2xl py-3 px-4 flex items-center justify-center gap-2 font-black text-xs tracking-wider shadow-[0_4px_12px_rgba(100,116,139,0.22)] select-none uppercase">
                            <span>{selectedResource.status.toUpperCase()}</span>
                            <span className="w-1.5 h-1.5 bg-white/70 rounded-full shrink-0" />
                          </div>
                        )}
                      </div>

                      {/* Tipo de Evento / Fim de Semana */}
                      <div className={`p-4.5 rounded-[1.5rem] border flex items-center gap-3 md:gap-4 shadow-2xs min-h-[6.5rem] transition-all duration-300 ${
                        selectedResource.fimDeSemana 
                          ? "bg-[#FFFDF0] border-amber-200 text-amber-900 shadow-[0_2px_8px_rgba(251,191,36,0.06)]" 
                          : "bg-sky-50/40 border-sky-100 text-sky-900"
                      }`}>
                        {selectedResource.fimDeSemana ? (
                          <>
                            <div className="w-11 h-11 rounded-2xl bg-[#FFA000] flex items-center justify-center shadow-md shadow-amber-500/15 shrink-0 animate-pulse">
                              <Sun className="w-6 h-6 text-white stroke-[2.5]" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#D97706] leading-none mb-1">
                                TIPO DE EVENTO
                              </span>
                              <span className="text-xs md:text-sm font-black uppercase italic text-amber-905 tracking-tight leading-none">
                                FIM DE SEMANA
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-11 h-11 rounded-2xl bg-[#0EA5E9] flex items-center justify-center shadow-md shadow-sky-500/11 shrink-0">
                              <CalendarDays className="w-5.5 h-5.5 text-white stroke-[2.5]" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#0EA5E9] leading-none mb-1">
                                TIPO DE EVENTO
                              </span>
                              <span className="text-xs md:text-sm font-black uppercase italic text-sky-900 tracking-tight leading-none">
                                DIA ÚTIL
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Referencia */}
                      <div className="space-y-1.5 bg-white p-4.5 rounded-[1.5rem] border border-slate-150 shadow-2xs flex flex-col justify-between min-h-[5.5rem]">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Referência / Documento</p>
                        <p className="text-xs md:text-sm font-black text-[#0F172A] uppercase leading-snug break-words">
                          {selectedResource.referencia}
                        </p>
                      </div>

                      {/* Periodo de Emprego */}
                      <div className="space-y-1.5 bg-white p-4.5 rounded-[1.5rem] border border-slate-150 shadow-2xs flex flex-col justify-between min-h-[5.5rem]">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Período de Emprego</p>
                        <div className="text-xs md:text-sm font-extrabold text-[#0F172A] font-sans antialiased uppercase leading-none">
                          <span className="font-mono text-xs md:text-sm font-black">{dates.startDate}</span>
                          <span className="text-[10px] text-slate-400 mx-1 border-none lowercase font-semibold">até</span>
                          <span className="font-mono text-xs md:text-sm font-black">{dates.endDate}</span>
                        </div>
                      </div>

                      {/* Horário de Turno */}
                      <div className="space-y-1.5 bg-white p-4.5 rounded-[1.5rem] border border-slate-150 shadow-2xs flex flex-col justify-between min-h-[5.5rem]">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Horário de Turno</p>
                        <div className="text-xs md:text-sm font-extrabold text-[#0F172A] font-sans antialiased uppercase leading-none">
                          <span className="font-mono text-xs md:text-sm font-black">{dates.startTime}</span>
                          <span className="text-[10px] text-slate-400 mx-1 border-none lowercase font-semibold">às</span>
                          <span className="font-mono text-xs md:text-sm font-black">{dates.endTime}</span>
                        </div>
                      </div>

                      {/* Equipes GRE Alocadas */}
                      <div className="space-y-1.5 bg-white p-4.5 rounded-[1.5rem] border border-slate-150 shadow-2xs flex flex-col justify-between min-h-[5.5rem]">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Equipe GRE Alocada</p>
                        <p className="text-2xl font-black text-[#00A36C] leading-none font-mono">
                          {selectedResource.equipe}
                        </p>
                      </div>

                    </div>

                    {/* Rich Text Areas */}
                    <div className="space-y-4 pt-2">
                      
                      {/* Descricao Apoio */}
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição do Apoio</p>
                        <div className="bg-slate-50 p-3.5 rounded-xl border-l-4 border-[#38BDF8] bg-slate-50 max-h-40 overflow-y-auto custom-scrollbar select-text">
                          <p className="text-xs font-bold text-slate-700 uppercase leading-relaxed break-words">
                            {selectedResource.descricaoApoio}
                          </p>
                        </div>
                      </div>

                      {/* Prescricoes */}
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-[#F43F5E]">Prescrições Operacionais</p>
                        <div className="bg-rose-50/40 p-3.5 rounded-xl border-l-4 border-rose-500 max-h-40 overflow-y-auto custom-scrollbar select-text">
                          <p className="text-xs font-black text-rose-950 uppercase leading-relaxed break-words">
                            {selectedResource.prescricoes || "Nenhuma prescrição cadastrada para este posto."}
                          </p>
                        </div>
                      </div>

                    </div>

                    <button 
                      onClick={() => setSelectedResource(null)}
                      className="w-full py-4 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-md mt-6"
                    >
                      Fechar Detalhes
                    </button>

                  </div>

                  {/* Right Interactive Map component */}
                  <div className="flex-1 min-h-[260px] lg:h-auto rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200/80 shadow-inner flex flex-col">
                    <div className="bg-slate-50 border-b border-slate-100 p-3 flex items-center justify-between shrink-0">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" /> Visualização de Inteligência Territorial SGO
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">
                        lat/lng: {selectedResource.coords.join(", ")}
                      </span>
                    </div>
                    <div className="flex-1 relative bg-slate-100">
                      <MapComponent 
                        resources={[selectedResource]} 
                        onMarkerClick={() => {}} 
                      />
                    </div>
                  </div>

                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* TOAST SYSTEM POPUP */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[12000] max-w-sm bg-[#0F172A] border border-white/10 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3"
          >
            <div className="p-1 px-2.5 bg-[#38BDF8]/10 border border-[#38BDF8]/20 rounded-lg text-xs font-black text-[#38BDF8] shrink-0 uppercase">
              Info
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#38BDF8] leading-tight">Canal de Transmissão</p>
              <p className="text-xs font-black text-slate-250 uppercase mt-1 leading-snug">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
