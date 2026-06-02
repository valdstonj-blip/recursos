export interface GreResource {
  id: string;
  dataTurno: string;       // DATA / TURNO (e.g. "11/05/2026 - 06:00 - 05:30")
  unidadeApoiada: string;  // UNIDADE APOIADA (e.g. "BPVE")
  status: string;          // STATUS (e.g. "EM ANDAMENTO")
  descricaoApoio: string;  // DESCRIÇÃO DO APOIO (e.g. "Corredor Estrutural")
  equipe: number;          // EQUIPE (e.g. 4)
  referencia: string;      // REFERÊNCIA / DOCUMENTO RECORDE (e.g. "MSG Nº 588/2026")
  prescricoes: string;     // PRESCRIÇÕES (e.g. "L.A, L.V, Av. Brasil")
  tipoEvento: string;      // TIPO DE EVENTO (e.g. "DIA ÚTIL" or "FIM DE SEMANA")
  fimDeSemana: boolean;    // Is Saturday/Sunday
  coords: [number, number];
  localMapa?: string;      // LOCALMAPA - Custom map point coordinate or address text
}

export const DEFAULT_RESOURCES: GreResource[] = [
  {
    id: "gre-1",
    dataTurno: "11/05/2026 06:00 - 05:30",
    unidadeApoiada: "BPVE",
    status: "EM ANDAMENTO",
    descricaoApoio: "Corredor Estrutural",
    equipe: 4,
    referencia: "MSG Nº 588/2026 - DET MSG Nº 082/26",
    prescricoes: "L.A, L.V, Av. Brasil /+01RAS / Tabela de Horário",
    tipoEvento: "DIA ÚTIL",
    fimDeSemana: false,
    coords: [-22.871, -43.275],
    localMapa: "Batalhão de Policiamento em Vias Especiais"
  },
  {
    id: "gre-2",
    dataTurno: "25/05/2026 06:00 - 05:30",
    unidadeApoiada: "BPVE, 1º, 7º E 12ºBPM",
    status: "EM ANDAMENTO",
    descricaoApoio: "Reforço de Policiamento",
    equipe: 6,
    referencia: "REG Nº 584/26",
    prescricoes: "Corredor Estrutural (01 GRE RAS)",
    tipoEvento: "DIA ÚTIL",
    fimDeSemana: false,
    coords: [-22.880, -43.210],
    localMapa: "Interseção Av. Brasil com Linha Amarela"
  },
  {
    id: "gre-3",
    dataTurno: "25/05/2026 12:00 - 23:59",
    unidadeApoiada: "18ºBPM",
    status: "PROGRAMADO",
    descricaoApoio: "Reforço de Policiamento",
    equipe: 1,
    referencia: "REG Nº 592/26",
    prescricoes: "Sem restrição para o setor operacional regular",
    tipoEvento: "DIA ÚTIL",
    fimDeSemana: false,
    coords: [-22.934, -43.364],
    localMapa: "Largo do Pechincha, Jacarepaguá"
  },
  {
    id: "gre-4",
    dataTurno: "16/05/2026 00:01 - 23:59",
    unidadeApoiada: "1º E 7º BPM",
    status: "EM ANDAMENTO",
    descricaoApoio: "Reforço de Policiamento",
    equipe: 2,
    referencia: "REG Nº 577/26",
    prescricoes: "Horários a definir entre RECOM e P/3",
    tipoEvento: "FIM DE SEMANA",
    fimDeSemana: true,
    coords: [-22.865, -43.120],
    localMapa: "Rodoviária Novo Rio, Centro"
  },
  {
    id: "gre-5",
    dataTurno: "25/05/2026 16:00 - 23:59",
    unidadeApoiada: "15ºBPM",
    status: "FINALIZADOS",
    descricaoApoio: "Reforço de Policiamento",
    equipe: 1,
    referencia: "ORDEM DE OPERAÇÕES Nº 11/2026",
    prescricoes: "PERÍMETRO VERDE - Rondas ostensivas",
    tipoEvento: "DIA ÚTIL",
    fimDeSemana: false,
    coords: [-22.785, -43.312],
    localMapa: "Caxias Shopping, Rodovia Washington Luiz"
  },
  {
    id: "gre-6",
    dataTurno: "25/05/2026 18:00 - 00:15",
    unidadeApoiada: "BPVE",
    status: "PROGRAMADO",
    descricaoApoio: "Reforço de Policiamento",
    equipe: 1,
    referencia: "ORDEM DE OPERAÇÕES Nº 11/2026",
    prescricoes: "PERÍMETRO VERDE - Posicionamento estratégico",
    tipoEvento: "DIA ÚTIL",
    fimDeSemana: false,
    coords: [-22.868, -43.280],
    localMapa: "Linha Vermelha, Altura do Fundão"
  },
  {
    id: "gre-7",
    dataTurno: "26/05/2026 12:00 - 15:00",
    unidadeApoiada: "5º BPM",
    status: "FINALIZADO",
    descricaoApoio: "evento teste",
    equipe: 5,
    referencia: "teste x teste",
    prescricoes: "teste x teste",
    tipoEvento: "DIA ÚTIL",
    fimDeSemana: false,
    coords: [-22.902, -43.181],
    localMapa: "Praça Mauá, Centro"
  }
];

export const LOCATION_COORDINATES: Record<string, [number, number]> = {
  // Batalhões e Unidades Especiais (Todas as unidades PMERJ)
  "bpve": [-22.8711, -43.2750],
  "recom": [-22.8680, -43.2800],
  "bpchoque": [-22.9110, -43.1970],
  "bope": [-22.9280, -43.2010],
  "bac": [-22.9130, -43.2790],
  "gam": [-22.9110, -43.2100],
  "bpgee": [-22.9211, -43.2010],
  "bptur": [-22.9691, -43.1818],
  
  "1bpm": [-22.9060, -43.1900],
  "1 bpm": [-22.9060, -43.1900],
  "2bpm": [-22.9348, -43.1824],
  "2 bpm": [-22.9348, -43.1824],
  "3bpm": [-22.8988, -43.2741],
  "3 bpm": [-22.8988, -43.2741],
  "4bpm": [-22.8981, -43.2230],
  "4 bpm": [-22.8981, -43.2230],
  "5bpm": [-22.9020, -43.1810],
  "5 bpm": [-22.9020, -43.1810],
  "6bpm": [-22.9238, -43.2389],
  "6 bpm": [-22.9238, -43.2389],
  "7bpm": [-22.8250, -43.0530],
  "7 bpm": [-22.8250, -43.0530],
  "8bpm": [-21.7618, -41.3323],
  "8 bpm": [-21.7618, -41.3323],
  "9bpm": [-22.8461, -43.3407],
  "9 bpm": [-22.8461, -43.3407],
  "10bpm": [-22.4533, -43.6617],
  "10 bpm": [-22.4533, -43.6617],
  "11bpm": [-22.2858, -42.5342],
  "11 bpm": [-22.2858, -42.5342],
  "12bpm": [-22.8940, -43.1110],
  "12 bpm": [-22.8940, -43.1110],
  "14bpm": [-22.8791, -43.4294],
  "14 bpm": [-22.8791, -43.4294],
  "15bpm": [-22.7850, -43.3120],
  "15 bpm": [-22.7850, -43.3120],
  "16bpm": [-22.8228, -43.2798],
  "16 bpm": [-22.8228, -43.2798],
  "17bpm": [-22.8105, -43.2105],
  "17 bpm": [-22.8105, -43.2105],
  "18bpm": [-22.9340, -43.3640],
  "18 bpm": [-22.9340, -43.3640],
  "19bpm": [-22.9691, -43.1818],
  "19 bpm": [-22.9691, -43.1818],
  "20bpm": [-22.7800, -43.4350],
  "20 bpm": [-22.7800, -43.4350],
  "21bpm": [-22.7891, -43.3712],
  "21 bpm": [-22.7891, -43.3712],
  "22bpm": [-22.8643, -43.2559],
  "22 bpm": [-22.8643, -43.2559],
  "23bpm": [-22.9830, -43.2201],
  "23 bpm": [-22.9830, -43.2201],
  "24bpm": [-22.7161, -43.5591],
  "24 bpm": [-22.7161, -43.5591],
  "25bpm": [-22.8801, -42.0298],
  "25 bpm": [-22.8801, -42.0298],
  "26bpm": [-22.5113, -43.1780],
  "26 bpm": [-22.5113, -43.1780],
  "27bpm": [-22.9029, -43.5591],
  "27 bpm": [-22.9029, -43.5591],
  "28bpm": [-22.5098, -44.0921],
  "28 bpm": [-22.5098, -44.0921],
  "29bpm": [-21.2065, -41.8902],
  "29 bpm": [-21.2065, -41.8902],
  "30bpm": [-22.4243, -42.9789],
  "30 bpm": [-22.4243, -42.9789],
  "31bpm": [-23.0011, -43.3429],
  "31 bpm": [-23.0011, -43.3429],
  "32bpm": [-22.3789, -41.7891],
  "32 bpm": [-22.3789, -41.7891],
  "33bpm": [-23.0056, -44.3123],
  "33 bpm": [-23.0056, -44.3123],
  "34bpm": [-22.6511, -43.0330],
  "34 bpm": [-22.6511, -43.0330],
  "35bpm": [-22.7198, -42.8791],
  "35 bpm": [-22.7198, -42.8791],
  "36bpm": [-21.5332, -42.1098],
  "36 bpm": [-21.5332, -42.1098],
  "37bpm": [-22.4712, -44.4532],
  "37 bpm": [-22.4712, -44.4532],
  "38bpm": [-22.1534, -43.2098],
  "38 bpm": [-22.1534, -43.2098],
  "39bpm": [-22.7634, -43.3991],
  "39 bpm": [-22.7634, -43.3991],
  "40bpm": [-22.9065, -43.5591],
  "40 bpm": [-22.9065, -43.5591],
  "41bpm": [-22.8277, -43.3458],
  "41 bpm": [-22.8277, -43.3458],

  // Municípios e Bairros importantes (Baixada, Rio e Niterói)
  "belford roxo": [-22.7634, -43.3991],
  "nova iguacu": [-22.7490, -43.4530],
  "duque de caxias": [-22.7850, -43.3120],
  "mesquita": [-22.7830, -43.4280],
  "sao joao de meriti": [-22.7911, -43.3720],
  "nilopolis": [-22.8080, -43.4170],
  "queimados": [-22.7160, -43.5550],
  "japeri": [-22.6450, -43.6530],
  "mage": [-22.6511, -43.0330],
  "itaborai": [-22.7198, -42.8791],
  "sao goncalo": [-22.8250, -43.0530],
  "baixada fluminense": [-22.7550, -43.4600],

  // Bairros do Rio de Janeiro
  "santa cruz": [-22.9161, -43.6845],
  "bangu": [-22.8754, -43.4654],
  "campo grande": [-22.9029, -43.5591],
  "recreio dos bandeirantes": [-23.0076, -43.4795],
  "recreio": [-23.0076, -43.4795],
  "barra da tijuca": [-23.0011, -43.3429],
  "barra": [-23.0011, -43.3429],
  "jacarepagua": [-22.9649, -43.3742],
  "madureira": [-22.8718, -43.3411],
  "meier": [-22.9020, -43.2798],
  "tijuca": [-22.9348, -43.2359],
  "ipanema": [-22.9836, -43.2045],
  "leblon": [-22.9844, -43.2241],
  "botafogo": [-22.9510, -43.1818],
  "copacabana": [-22.9691, -43.1818],
  "flamengo": [-22.9372, -43.1789],
  "gloria": [-22.9213, -43.1770],
  "centro": [-22.9035, -43.1729],
  "lapa": [-22.9129, -43.1805],
  "santa teresa": [-22.9250, -43.1930],
  "maracana": [-22.9121, -43.2302],
  "vila isabel": [-22.9168, -43.2458],
  "grajau": [-22.9272, -43.2625],
  "andarai": [-22.9261, -43.2519],
  "sampaio": [-22.9009, -43.2647],
  "rocha": [-22.9015, -43.2541],
  "jacare": [-22.8943, -43.2571],
  "benfica": [-22.8965, -43.2289],
  "sao cristovao": [-22.8965, -43.2217],
  "galeao": [-22.8150, -43.2442],
  "ilha do governador": [-22.8105, -43.2105],
  "bonsucesso": [-22.8643, -43.2559],
  "del castilho": [-22.8794, -43.2721],
  "penha": [-22.8402, -43.2847],
  "iraja": [-22.8335, -43.3276],
  "pavuna": [-22.8091, -43.3644],
  "realengo": [-22.8791, -43.4294],
  "padre miguel": [-22.8778, -43.4449],
  "senador camara": [-22.8808, -43.4867],
  "paciencia": [-22.9150, -43.6358],
  "cosmos": [-22.9082, -43.6110],
  "guaratiba": [-22.9942, -43.5936],
  "pedra de guaratiba": [-23.0039, -43.6403],
  "barra de guaratiba": [-23.0673, -43.5658],
  "sepetiba": [-22.9725, -43.6974],
  "sao conrado": [-22.9922, -43.2531],
  "rocinha": [-22.9883, -43.2505],
  "vidigal": [-22.9934, -43.2384],
  "vargem grande": [-22.9927, -43.4984],
  "vargem pequena": [-22.9790, -43.4616],
  "camorim": [-22.9642, -43.4357],
  "anil": [-22.9510, -43.3392],
  "gardenia azul": [-22.9592, -43.3592],
  "freguesia": [-22.9427, -43.3387],
  "tanque": [-22.9351, -43.3534],
  "taquara": [-22.9318, -43.3653],
  "pechincha": [-22.9378, -43.3486],
  "praca seca": [-22.8974, -43.3524],
  "campinho": [-22.8858, -43.3496],
  "quintino": [-22.8920, -43.3210],
  "piedade": [-22.8913, -43.3082],
  "cascadura": [-22.8852, -43.3242],
  "cavalcanti": [-22.8687, -43.3150],
  "engenheiro leal": [-22.8750, -43.3283],
  "oswaldo cruz": [-22.8680, -43.3480],
  "bento ribeiro": [-22.8654, -43.3601],
  "marechal hermes": [-22.8593, -43.3719],
  "deodoro": [-22.8580, -43.3934],
  "guadalupe": [-22.8368, -43.3688],
  "anchieta": [-22.8228, -43.3912],
  "ricardo de albuquerque": [-22.8277, -43.4005],
  "parque anchieta": [-22.8286, -43.4116],
  "costa barros": [-22.8122, -43.3644],
  "barros filho": [-22.8188, -43.3533],
  "honorio gurgel": [-22.8351, -43.3512],
  "coelho neto": [-22.8306, -43.3458],
  "rocha miranda": [-22.8415, -43.3483],
  "colegio": [-22.8335, -43.3320],
  "vaz lobo": [-22.8488, -43.3312],
  "turiacu": [-22.8504, -43.3392],
  "vila kosmos": [-22.8465, -43.3032],
  "vicente de carvalho": [-22.8510, -43.3115],
  "bras de pina": [-22.8285, -43.2974],
  "cordovil": [-22.8239, -43.2921],
  "parada de lucas": [-22.8143, -43.2941],
  "vigario geral": [-22.8091, -43.3034],
  "jardim america": [-22.8090, -43.3150],
  "vista alegre": [-22.8291, -43.3150],
  "niteroi": [-22.8854, -43.1154],
  "rio de janeiro": [-22.9068, -43.1729]
};

export function geocodeLocation(unidadeOrLocal: string): [number, number] {
  if (!unidadeOrLocal) return [-22.9068, -43.1729];
  
  // Strip ordinals º, °, ª and double-spacing before matching
  const normalized = unidadeOrLocal
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°ª]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  // Try to parse coordinate pattern like "-22.9035, -43.1729" or "-22.9035 -43.1729"
  const match = normalized.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/) || 
                normalized.match(/(-?\d+\.\d+)\s*[-/|;]\s*(-?\d+\.\d+)/) ||
                normalized.match(/(-?\d+\.\d+)\s+(-?\d+\.\d+)/);
  
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return [lat, lng];
    }
  }

  for (const [key, coords] of Object.entries(LOCATION_COORDINATES)) {
    if (normalized.includes(key)) {
      return coords;
    }
  }

  // Generate a coordinate using positive stable hash
  const hash = unidadeOrLocal.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const latOffset = ((hash % 100) - 50) / 2500;
  const lngOffset = (((hash >> 2) % 100) - 50) / 2500;
  return [-22.902 + latOffset, -43.181 + lngOffset]; // Centered near Rio Centro
}
