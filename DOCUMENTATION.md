# Documentação Técnica Oficial • Painel SGO Intel Premium

Este documento oferece uma especificação técnica completa, detalhada e estruturada de nível de Engenharia de Software e Design de Experiência do Usuário (UX/UI) para o sistema **SGO Intel**. 

Este documento foi projetado para servir como o **Manual Arquitetural Definitivo** e como o **Prompt de Ouro no AI Studio / Gemini** para reconstrução completa da aplicação em qualquer outra linguagem ou framework mantendo rigorosamente a mesma lógica de negócio, persistência reativa, lógica de georreferenciamento e identidade visual sofisticada.

---

## 🚀 1. Visão Geral da Arquitetura do Sistema

O **SGO Intel** é um centro de controle situacional e monitoramento de inteligência em tempo real para alocação de equipes operacionais da PMERJ (Grupamentos especiais e policiamento geral). 

A arquitetura adota a filosofia de **"Spreadsheet as a Live Engine"** (Planilhas Google como banco de dados reativo), permitindo que operadores mudem dados na planilha e o painel reaja imediatamente. O sistema realiza o processamento de dados inteiramente no cliente (Client-Side), garantindo agilidade e segurança sem a sobrecarga de servidores tradicionais.

```
                  ┌─────────────────────────────────────────────────────────┐
                  │              GOOGLE SHEETS (NUVEM PÚBLICA)              │
                  │  Planilha Única com Abas Separadas por GID Identificador │
                  │  - GID 536450586: Recursos Regulares                    │
                  │  - GID 317400917: Forças Especiais (GRE/RECOM)          │
                  └────────────────────────────┬────────────────────────────┘
                                               │
                                               ▼ (Fetch CSV Dinâmico por URL)
                  ┌─────────────────────────────────────────────────────────┐
                  │                 SGO LIVE PARSING ENGINE                 │
                  │  - Detecção Comma/Semicolon Resiliente                  │
                  │  - Fuzzy Matcher de Colunas (Filtra espaços/acentos)     │
                  │  - Conversor de Status e Tipagem Estrita                │
                  └────────────────────────────┬────────────────────────────┘
                                               │
                                               ▼
         ┌─────────────────────────────────────┴─────────────────────────────────────┐
         ▼ (Fluxo de Isolamento de Abas)                                             ▼ (Fluxo de Isolamento de Abas)
 ┌───────────────────────────────────────────┐                               ┌───────────────────────────────────────────┐
 │       PÁGINA 1: RECURSOS GERAIS           │                               │         PÁGINA 2: GRE / RECOM             │
 │  - State: resourcesRecursos               │                               │  - State: resourcesGreRecom               │
 │  - Planilha GID: 536450586                │                               │  - Planilha GID: 317400917                │
 └───────────────────┬───────────────────────┘                               └───────────────────┬───────────────────────┘
                     │                                                                           │
                     └───────────────────────────────────┬───────────────────────────────────────┘
                                                         │
                                                         ▼
                                      ┌──────────────────────────────────────┐
                                      │        INTERFACE UNIFICADA (UI)      │
                                      │  - Marquee de Alertas Operacionais   │
                                      │  - Seletor de Filtros Avançados      │
                                      │  - Gráficos Recharts com Gradientes  │
                                      │  - Tabela Interativa de Alocações    │
                                      │  - Detalhes (Ficha Lateral + Leaflet)│
                                      └──────────────────────────────────────┘
```

---

## 📂 2. Especificação Detalhada das 2 Planilhas (Fontes de Dados)

O sistema é alimentado por uma estrutura de dados de altíssima resiliência que sincroniza duas abas independentes de uma mesma Planilha do Google Docs (ou de planilhas separadas). 

### Regras Universais de Importação & Parsing:
*   **Separadores de CSV Dinâmicos:** A engine calcula se a planilha exportada utiliza vírgula (`,`) ou ponto e vírgula (`;`) como separador básico analisando o cabeçalho bruto, evitando quebras em sistemas com configurações regionais diferentes (PT-BR vs EN-US).
*   **Fuzzy Matching (Busca Flexível de Cabeçalhos):** Operadores podem alterar o nome das colunas ou incluir acentos e maiúsculas na planilha. O mapeador flexível normaliza os textos (`normalize("NFD")`) e identifica a correspondência aproximada.

### A. Planilha 1: Recursos Operacionais Regulares (Aba Principal)
*   **Identificador Padrão (GID):** `536450586`
*   **Descrição:** Armazena dados de alocação de policiamento ostensivo, apoios de área comercial e policiamento padrão de batalhões.

### B. Planilha 2: GRE / RECOM (Aba de Forças de Choque e Vias Expressas)
*   **Identificador Padrão (GID):** `317400917`
*   **Descrição:** Armazena dados de policiamento de alta mobilidade urbana (Grupamento de Policiamento em Vias Expressas - GPVE / Rondas Especiais e Controle de Multidões - RECOM).

### Dicionário Exato de Campos e Correspondências das Duas Planilhas:

| Cabeçalho Esperado (Chave) | Sinônimos Mapeados (Fuzzy Matcher) | Tipo | Regra de Negócio & Tratamento |
| :--- | :--- | :--- | :--- |
| **Quantidade de GRE** | `equipe`, `equipes`, `gre`, `quantidade`, `qtd` | Número | Total de viaturas/equipes alocadas. Se conter letras (ex: "4 Equipes"), o sistema extrai apenas os números e converte em inteiro `4`. |
| **Status** | `status`, `situacao`, `situaçao`, `estado` | Texto | Controla os indicadores reativos: **EM ANDAMENTO** (Ativas), **PROGRAMADO** (Planejadas/Futuras), **FINALIZADO** (Encerradas). |
| **Referência** | `referencia`, `referência`, `documento`, `doc`, `ref` | Texto | Código do documento de ordem de policiamento (ex: `MSG Nº 507/2026`). |
| **UOp/E Apoiada** | `unidade apoiada`, `unidade`, `uop`, `apoiada`, `batalhao` | Texto | Unidade Militar PMERJ que recebe o reforço (ex: `18ºBPM`, `12ºBPM`, `BPVE`). |
| **Descrição do Apoio** | `descricao do apoio`, `descricao`, `apoio`, `servico`, `missao` | Texto | Tópico resumido da operação (ex: `APrev / PTR Ostensivo`). |
| **Prescrições Diversas** | `prescricoes`, `prescrições`, `instrucoes`, `obs`, `observacao` | Texto | Instruções táticas urgentes para os policiais militares (ex: `ATENTAR PARA COLETE E FARDAMENTO`). Alimentam o banner de Alertas Operacionais se houverem regras específicas. |
| **Fim de semana** | `fim de semana`, `fim-de-semana`, `fds` | Booleano | Identifica se a carga é extra de final de semana. Valores como `"Sim"`, `"S"`, `"TRUE"`, ou a inclusão de nomes de dias como `"sábado"` ou `"domingo"` forçam a atribuição automática de `Fim de Semana = true`. |
| **LOCALMAPA** | `localmapa`, `coordenadas`, `coord`, `coords`, `localizacao` | Coordenadas / Texto | Ponto geográfico exato da operação. Aceita coordenadas literais lat/lng (ex: `-22.7634, -43.3991`), nomes de cidades ou batalhões específicos. |

---

## 🖥️ 3. Especificação das 2 Telas do Sistema (Visualização Reativa)

O sistema possui duas telas (páginas representadas em abas reativas) operando em isolamento de dados absoluto do estado reativo do React e persistidos em cache no dispositivo local (`localStorage`).

### Tela 1: Recursos Ordinários (Aba "Recursos")
*   **Foco Funcional:** Monitorar e gerenciar a alocação de recursos regulares enviados para policiamento operacional de batalhões comuns.
*   **Fluxo de Dados:** Lê e renderiza exclusivamente o GID `536450586`.
*   **Características de Estado:** Isolar consultas, termos digitados no campo de pesquisa e cliques nesta tela não interferem ou poluem o estado de filtragem de forças especiais.

### Tela 2: GRE / RECOM (Aba "GRE/RECOM")
*   **Foco Funcional:** Acompanhamento situacional tático de grupamentos especializados de rodovias e forças de apoio motorizado de choque.
*   **Fluxo de Dados:** Lê e renderiza exclusivamente o GID `317400917`.
*   **Características de Estado:** Permite ao comando monitorar com exclusividade apenas operações em vias prioritárias do Rio de Janeiro.

---

## 🎨 4. Identidade Visual de Engenharia Executiva (UX/UI Premium)

O painel abandona layouts amadores e adota padrões visuais executivos de alto impacto institucional e baixo cansaço visual:

*   **Paleta de Cores Táticas:**
    *   **Tela de fundo:** Canvas off-white suave (`bg-slate-50/40`) para mitigar a fadiga do feixe azul do monitor durante ciclos de serviço noturnos de 12h/24h.
    *   **Tons Primários:** Cinza Abissal Claro escarlate (`#0F172A`) em painéis e cabeçalhos para transmitir sobriedade institucional.
    *   **Azul de Inteligência:** `#38BDF8` (Sky Blue) utilizado em badges operacionais e destaques de rede.
    *   **Esquema de Status Semáforo Militar:**
        *   🟢  **EM ANDAMENTO:** Verde Esmeralda brilhante (`bg-emerald-50` / `text-emerald-700` com pulse-dot tático).
        *   🟡  **PROGRAMADO:** Azul Oceânico tático (`bg-blue-50` / `text-blue-700`).
        *   🔴  **FINALIZADO:** Cinza Chumbo discreto (`bg-slate-100` / `text-slate-600`).
*   **Tipografia Híbrida e Legibilidade:**
    *   Títulos estruturados em caixa alta utilizando fontes estruturadas e sem serifa para facilitar a varredura visual imediata.
    *   Cores em altos níveis de contraste que atendem às regras de acessibilidade WCAG.
    *   Todos os dados de número, horas, referências legislativas de boletim e coordenadas geográficas renderizados em fonte monoespaçada (`font-mono`), impedindo que números desalinhados mudem de posição durante atualizações de dados regulares.

---

## ⚙️ 5. Funcionalidades Tecnológicas Core (Diferenciais Técnicos)

### A. Engine de Geolocalização Precisa (PMERJ Native Mapping)
Para evitar que coordenadas operacionais fossem calculadas inadequadamente, o sistema integra o dicionário geográfico inteligente **LOCATION_COORDINATES** e a função `geocodeLocation`, otimizada com:
1.  **Limpeza de Sufixos Ordinais (Bug da Letra º / °):** A engine limpa termos como `"12ºBPM"`, `"21º BPM"` ou `"39ª UOP"`, convertendo-as em termos limpos como `"12 bpm"`, `"21 bpm"` ou `"39 bpm"` antes de realizar o pareamento. Isso garante que coordenadas corretas sejam plotadas de imediato em vez de recalcular coordenadas estáticas para o centro da cidade do Rio de Janeiro.
2.  **Mapeamento de Cidades Satélites e Baixada:** Mapeia bairros e batalhões estratégicos fora da capital, instalando posições confiáveis em tempo de execução para termos recorrentes como **Belford Roxo** (`[-22.7634, -43.3991]`), **Duque de Caxias** (`[-22.7850, -43.3120]`), **Nova Iguaçu** (`[-22.7490, -43.4530]`), **São João de Meriti**, entre outros.

### B. Widget de Auto-Refreshing em Segundo Plano (Real-Time Background Sync)
*   Mantém o sistema sincronizado com a nuvem sem interrupções operacionais.
*   Exibe um timer flutuante em contagem regressiva de segundos (`60s -> 0s`).
*   Dispõe de chave liga/desliga (**Painel Sincronizado ON / OFF**); quando ativa, atualiza dados silenciosamente, preservando os termos pesquisados, filtros de status aplicados e a linha selecionada na visualização atual.

### C. Marquee Dinâmico de Prescrições Diversas (Banner Rotativo de Alertas)
*   Filtra automaticamente na planilha ativa apenas as linhas com observações operacionais e prescrições táticas urgentes.
*   Alterna dinamicamente estas mensagens prioritárias no topo do painel a cada `6 segundos`.
*   Ao clicar no alerta rotativo, a interface abre imediatamente o modal detalhado da operação correspondente, permitindo resposta célere aos comandos de despacho.

### D. Ficha Operacional com Mapeamento Side-by-Side (Detalhamento Completo)
*   Ao selecionar qualquer operação, abre-se uma tela sobreposta refinada dividida em duas colunas funcionais:
    *   **Esquerda (Ficha Técnica):** Exibe o Batalhão Apoiado, Status em andamento tático, Referência Oficial, Descrição Operacional da Missão, Equipes Alocadas, Período de Emprego com as datas extraídas inteligentemente por Regex e Prescrições Diversas destacadas em fundo tático vermelho-alerta.
    *   **Direita (Mapa Interativo Leaflet):** Renderiza um mapa interativo completo centralizado estritamente nas coordenadas corretas com pinos detalhados e popups customizados para visualização rápida no terreno.

### E. Impressão Sanitizada para Comando (PDF Exclusivo de Auditoria)
A aplicação conta com um exportador PDF que gera um documento corporativo limpo utilizando a folha de estilo de impressão de alta fidelidade:
*   Remove automaticamente elementos exclusivamente digitais tais como botões de ação, timer regressivo, mapas Leaflet e menus de filtro.
*   Mantém tabelas e gráficos em tons preto e branco otimizados para máxima legibilidade física e economia de tinta em impressões institucionais oficiais.

---

## 📜 6. Prompt de Engenharia "Ouro" para o AI Studio (Clone de Alta Fidelidade)

Este prompt foi otimizado para que um LLM de última geração (como Gemini 1.5 Pro ou 2.0 Flash no Google AI Studio) seja capaz de reproduzir esta aplicação inteira em qualquer framework web com o mesmo nível de detalhes técnicos e visuais:

```text
Crie uma aplicação web Dashboard de Inteligência Operacional Militar para Comando PMERJ baseada na arquitetura reativa "SGO Intel Premium Layout".

REQUISITOS ARQUITETURAIS:
1. ARQUITETURA "SPREADSHEET ENGINE": Desenvolva uma aplicação SPA em TypeScript e React estruturada com indexação de abas isoladas que sincroniza dados em tempo real a partir de um link CSV de exportação de planilhas Google Docs. Identifique dinamicamente delimitadores ',' ou ';' no parsing e decodifique as colunas de forma aproximada através de Fuzzy Matcher inteligente (ex: cabeçalho 'UOp/E Apoiada' deve mapear para o atributo 'unidadeApoiada', 'LOCALMAPA' ou 'Coordenadas' para 'localMapa', e termos como 'Descrição do Apoio' para 'descricaoApoio').

2. ESTADOS ISOLADOS INTEGRADOS (2 PÁGINAS/TELAS):
   - A aplicação deve implementar controle de estados isolados para duas telas em abas selecionáveis:
     * TELA 1 (Recursos Regulares): Carrega exclusivamente a aba referente ao GID 536450586 da Planilha Google, salvando states isolados no localStorage (resourcesRecursos).
     * TELA 2 (GRE / RECOM Forças Especiais): Carrega a aba operada sob o GID 317400917 (resourcesGreRecom).
   - Mudar filtros, termos digitados no campo de busca ou linhas de detalhamento selecionado em uma tela nunca pode interferir no estado ou re-rederizar visualizações da outra tela.

3. SISTEMA DE GEOLOCALIZAÇÃO PRECISA & LIMPEZA DE ORDINAIS:
   - Integre um dicionário de coordenadas de alta precisão (LOCATION_COORDINATES) cobrindo todos os Batalhões da PMERJ (do 1ºBPM ao 41ºBPM, unidades especiais como BPVE, RECOM, BAC, BOPE, BPChq, etc.), além de municípios e distritos da Baixada Fluminense (Belford Roxo, Duque de Caxias, Nova Iguaçu, Mesquita, Nilópolis, Queimados, São João de Meriti).
   - Crie uma rotina de geocodificação flexível que higieniza strings removendo indicadores ordinais (substituindo sinais 'º', '°', 'ª' por espaços) e reduz furos de digitação para garantir pareamento contínuo das chaves em vez de desviar coordenadas residuais para as regiões centrais.

4. WIDGETS TÁTICOS OPERACIONAIS REATIVOS:
   - ALERT MARQUEE: No topo, inclua um painel rotativo animado (frequência de 6s de exibição) indexando observações táticas registradas sob a coluna de "Prescrições". A seleção de um alerta deve acionar o popup detalhado da ficha técnica da operação correspondente.
   - COUNTER REGRESSIVO COM TOGGLE TOGGLE: Na cabeceira de controle, providencie um indicador tático com contador progressivo de 60 segundos com toggle para operação silenciosa manual (Sync ON / OFF) sem travar a navegação do painel ativo.
   - DETALHAMENTO SIDE-BY-SIDE EM MODAL: Ao clicar em qualquer linha de alocação das tabelas, mostre um modal dividido onde a esquerda apresenta a ficha com período do emprego (extraído de texto livre via regex estrito de datas) e prescrições sob fundo escuro/alerta vermelho-coral, e a direita ativa um painel de mapa Leaflet centralizado rigorosamente na posição mapeada da operação.
   - PRINT-SAFE AUDITING REPORTER: Adicione um botão para geração de PDF de auditoria. Ao acionar a impressão, oculte controles de navegação digital, mapas dinâmicos e toggles de atualização, gerando uma ata formal vetorizada em alto contraste otimizada para assinatura do comando.

5. DIRETRIZES DE DESIGN CORPORATIVO:
   - Canvas off-white suave (#F8FAFC), cartões corporativos arredondados (rounded-2xl) estruturados com sombras sutis reflexivas.
   - Contraste executivo profundo de foco operacional utilizando cinza abissal (#0F172A) em títulos e Sky Blue (#38BDF8) para elementos interativos. Use fontes de proporções monoespaçadas (como JetBrains Mono) estritamente para displays de horários, datas e volumetrias numéricas de equipes operacionais.
```

---
*Este modelo e documentação representam o estado da arte em painéis de acompanhamento operacional em terreno para corporações de segurança, inteligência corporativa e despacho logístico.*
