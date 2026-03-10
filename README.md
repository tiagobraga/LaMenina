# Manual Técnico de Operação e Análise: LáMenina!

O sistema **LáMenina! análise de dados** é uma ferramenta de inspeção visual de métricas acadêmicas, construída como uma *Single Page Application* (SPA) executada de forma nativa no navegador web do pesquisador. O objetivo do sistema é analisar o engajamento, sentimento e as relações construídas entre usuários em diversas redes sociais, inicialmente desenvolvido para analisar o tema Laminina, mas que pode ser utilizado para análise de qualquer tema em redes sociais.

## 1. Funcionamento Base e Input
Nenhuma instalação ou configuração de servidor complexa é necessária. O pesquisador apenas deve possuir um arquivo em formato XLSX seguindo a estrutura de campos abaixo. Depois deve baixar os arquivos index.html, app.js e styles.css para uma pasta. Ao executar o arquivo `index.html` em uma aba do navegador, a interface inicial permitirá o upload (leitura local via *SheetJS*) do arquivo Excel, sem envio para servidores externos, mantendo a privacidade e sigilo dos dados do pesquisador. 

**Dicionário de Dados Obrigatório (Colunas do Excel):**
Para que os 4 módulos operem corretamente, a planilha importada deve possuir (na primeira aba) um cabeçalho contendo exatamente os seguintes nomes de colunas:
- `socialNetwork`: (Texto) Plataforma de origem (ex: Twitter, Facebook, TikTok).
- `usernameAuthor`: (Texto) Identificador ou conta do autor da publicação.
- `createdAt`: (Data/Tempo) O carimbo de data original da publicação.
- `sentiment`: (Texto) Classificação algorítmica ou manual de valência (`POSITIVE`, `NEGATIVE`, `NEUTRAL`).
- `message`: (Texto) O corpo de texto da publicação em si.
- `likes`: (Numérico) Total de curtidas ou interações de endosso.
- `comments`: (Numérico) Total de respostas ou ramificações da conversa.
- `shares`: (Numérico) Total de replicações ou compartilhamentos.

## 2. Cálculo da Métrica de Relevância Teórica
Para organizar hierarquicamente as postagens mais determinantes no conjunto de dados, o algoritmo do LáMenina não recai na ordenação simplória de uma única métrica (apenas likes, por exemplo).  Ele calcula dinamicamente uma **Relevância Ponderada e Dinâmica** que recompensa a desproporcionalidade de ações de maior peso cognitivo do usuário real.

### 2.1 A Fórmula de Relevância
A métrica de relevância de um post individual é obtida mediante o cálculo do peso fracional dinâmico de cada tipo de interação em relação à soma total de engajamento do escopo de todos os posts. 

```python
SomaReacoes = Total de comentários + Total de curtidas + Total de compartilhamentos em todo corpus

# Pesos dinamicamente calculados baseados na raridade da ação no dataset:
PesoComentarios = 1 / ((comentarios / SomaReacoes) * 3)
PesoCurtidas = 1 / ((curtidas / SomaReacoes) * 3)
PesoCompartilhamentos = 1 / ((compartilhamentos / SomaReacoes) * 3)

# Escore do Post Individual
Relevância_Post = (Post.comentarios * PesoComentarios) + 
                  (Post.curtidas * PesoCurtidas) + 
                  (Post.compartilhamentos * PesoCompartilhamentos)
```

O impacto do algoritmo é que interações que requerem maior barreira de esforço humano (como **compartilhamentos** e **comentários**) e portanto costumam ocorrer em menor quantidade absoluta na base geral (SomaReacoes), automaticamente geram fatores multiplicadores (pesos) mais substanciais do que curtidas casuais.

> Esse cálculo de relevância é baseado no trabalho acadêmico:
> SILVA, Ilaydiany Oliveira da; GOUVEIA, Fabio Castro. *Engajamento informacional nas redes sociais: como calcular?*. 2021.

## 3. Topologia Modular do Dashboard

Em termos práticos, uma vez que os dados são decodificados da planilha, a análise investigativa do pesquisador é distribuída horizontalmente e subdividida em grandes 4 módulos:

### Módulo 1: Listagem Métrica e Qualitativa de Postagens
A base para a "leitura próxima". Onde o pesquisador valida empiricamente o conteúdo bruto do dado e seu cruzamento algorítmico. 
- **O que faz:** Permite rolar pelas publicações e lê-las, ordenando-as primariamente utilizando as variáveis da plataforma original (Data, Likes, Shares) e/ou a métrica de "Maior Relevância" citada no Tópico 2.  Apresenta um controle interativo de paginação com input direto para navegação em corpus densos.

### Módulo 2: Grafo Interativo de Citações e Sentimento
Componente focado em mapeamento de sociabilidade ("Leitura Distante").
* **O que mede:** Revela e expõe quem está instigando (ou retro-alimentando) a conversa central. 
* **Regras de construção:**
  1. Cada **Nó** materializa um autor da planilha (`usernameAuthor`).
  2. O tamanho da elipse ou nó na malha expande substancialmente sendo diretamente proporcional à concentração absoluta de conexões daquele usuário. (Grau do nó / Degree centrality).
  3. Cada elipse absorve e irradia uma cor indicando a polaridade média atribuída ao conteúdo gerado pelo autor: <span style="color:#8b5cf6">**Roxo para Neutralidade**</span>, <span style="color:#10b981">**Verde para Positividade**</span>, e <span style="color:#ef4444">**Vermelho para Negatividade**</span>. 
* **Funcionalidades Analíticas:** 
  * Contador Inteligente: No canto esquerdo, as frequências absolutas e *ratios percentuais calculados dinamicamente* dos sentimentos presentes no grafo atual são revelados sem requerer exportação dos dados.
  * Botão **[Fullscreen]**: Ao acionar este ícone na barra superior do módulo, a malha de nós cresce invadindo todos os limites (100% *vh*) do seu monitor e suprime momentâneamente os demais módulos. Fundamental para tentar decifrar nuvens densas com superposição exacerbada de dezenas de arestas.

![Modo Maximização Total - Grafo de Citações](/Users/tiagobraga/.gemini/antigravity/brain/11bdb06c-c5d7-4b14-b928-db4b99846878/fullscreen_graph_validation_1772992136618.png)


### Módulo 3: Cronologia de Intensidade (Timeline Chart)
Para inferência temporal do debate interinstitucional, através do engate algorítmico entre `createdAt` e `socialNetwork`.
* **O que faz:**  Mapeia cada data detectada e agrupa o volume das manifestações por plataforma digital nas devidas abcissas do tempo. As plataformas adquirem espectros luminosos distintos em sua plotagem.
* **Funcionalidade Empírica:** No hover (janela passiva ao repouso do mouse), exibe quantitativos ordenados **decrescentemente**. Mais significativamente, o pesquisador também possui ao dispor uma trilha mestre tracejada em branco nominada `"Todas as Redes (Total)"`, o que permite visualmente parear/dimensionar qual a proporção uma dada plataforma isolada representava no conjunto discursivo inteiro para aquele dia.

![Linha de Volume Total e Tooltip Integrado](/Users/tiagobraga/.gemini/antigravity/brain/11bdb06c-c5d7-4b14-b928-db4b99846878/module3_chart_tooltip_1772990629279.png)

### Módulo 4: Nuvem Lexical Semântica (Wordcloud)
Voltado a decodificar os vetores narrativos dominantes sem indução apriorística, de maneira agnóstica às plataformas se o usuário não lhes aplicar filtros direcionadores.
* **Como funciona:** Quebra semanticamente (Tokenization - suportando acentos em Língua Portuguesa) o léxico total das colônias de mensagens da planilha e subtrai uma vasta extensão nativa pre-setada de "Stop Words" (conectivos sem valor expressivo de sentido autônomo e abreviações da Web como 'htpps', pronomes oblíquos etc).  A renderização da elipse visual concede tamanhos maiores a léxicos mais propulsados e centrais na pauta coletiva.
* **Ferramenta Oculta:** Pausando o mouse em certas expressões dominantes, será emitido uma "dica" flutuante (hint tooltip) relatando o index matemático da frequência total para a dada palavra em tempo real – contornando a necessidade de contagem mental exultante baseada no mero "tamanho visual".

## Citação
`BRAGA, Tiago Emmanuel Nunes. LáMenina! análise de dados. [S. l.]: Repositório GitHub, 2026. Software de análise exploratória e grafos para redes sociais. Disponível em: https://github.com/tiagobraga/LaMenina. Acesso em: 8 mar. 2026.`
