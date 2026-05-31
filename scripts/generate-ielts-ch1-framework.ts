/**
 * 批量生成雅思词汇真经 Chapter 1（自然地理）基础框架文件
 *
 * 为剩余词汇生成包含完整 frontmatter + 核心释义 + 基础搭配的 Markdown 文件。
 * 标杆级笔记（margin, deforest 等）已手写，此脚本处理其余词汇。
 *
 * 用法：npx tsx scripts/generate-ielts-ch1-framework.ts
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CHAPTER_DIR = join(process.cwd(), "data", "ielts-vocabulary", "自然地理");
mkdirSync(CHAPTER_DIR, { recursive: true });

interface WordEntry {
  chapter: string;
  group: number;
  ipa: string;
  meaning: string;
  pos: string;
  prototype: string;
  semanticField: string;
  word: string;
}

const chapter1Words: WordEntry[] = [
  // 第一组（标杆 margin 已手写，补充其余）
  { word: "fringe", ipa: "/frɪndʒ/", pos: "n./v./adj.", meaning: "边缘；刘海；在……加缘饰", semanticField: "空间位置", prototype: "布料边缘的穗状装饰", chapter: "自然地理", group: 1 },
  { word: "plate", ipa: "/pleɪt/", pos: "n./v.", meaning: "板块；盘子；电镀", semanticField: "空间位置", prototype: "平坦的金属板", chapter: "自然地理", group: 1 },
  { word: "debris", ipa: "/ˈdeɪbriː/", pos: "n.", meaning: "残骸，碎片，废墟", semanticField: "自然物理", prototype: "建筑倒塌后散落的碎石瓦砾", chapter: "自然地理", group: 1 },
  { word: "crack", ipa: "/kræk/", pos: "n./v.", meaning: "裂缝；破裂；爆裂声", semanticField: "自然物理", prototype: "干燥泥土上出现的裂口", chapter: "自然地理", group: 1 },
  { word: "gap", ipa: "/ɡæp/", pos: "n.", meaning: "缺口；差距；间隔", semanticField: "空间位置", prototype: "两堵墙之间的空隙", chapter: "自然地理", group: 1 },
  { word: "splendid", ipa: "/ˈsplendɪd/", pos: "adj.", meaning: "壮丽的；极好的；辉煌的", semanticField: "感知评价", prototype: "阳光下金光闪闪的壮丽景观", chapter: "自然地理", group: 1 },
  { word: "grand", ipa: "/ɡrænd/", pos: "adj.", meaning: "宏伟的；盛大的；总的", semanticField: "感知评价", prototype: "巍峨山脉的宏伟景象", chapter: "自然地理", group: 1 },
  { word: "magnificent", ipa: "/mæɡˈnɪfɪsnt/", pos: "adj.", meaning: "壮丽的；宏伟的；华丽的", semanticField: "感知评价", prototype: "宫殿般金碧辉煌的壮观场面", chapter: "自然地理", group: 1 },
  { word: "super", ipa: "/ˈsuːpə(r)/", pos: "adj./adv.", meaning: "极好的；超级的", semanticField: "感知评价", prototype: "超出常规标准的事物", chapter: "自然地理", group: 1 },
  { word: "interesting", ipa: "/ˈɪntrəstɪŋ/", pos: "adj.", meaning: "有趣的；引人关注的", semanticField: "感知评价", prototype: "引起人注意和好奇的事物", chapter: "自然地理", group: 1 },
  { word: "dramatic", ipa: "/drəˈmætɪk/", pos: "adj.", meaning: "戏剧性的；急剧的；引人注目的", semanticField: "感知评价", prototype: "舞台上突然的戏剧转折", chapter: "自然地理", group: 1 },
  { word: "wilderness", ipa: "/ˈwɪldənəs/", pos: "n.", meaning: "荒野；荒原；未开发地区", semanticField: "自然物理", prototype: "广袤无人烟的原始森林", chapter: "自然地理", group: 1 },
  { word: "desert", ipa: "/ˈdezət/ (n.) /dɪˈzɜːt/ (v.)", pos: "n./v./adj.", meaning: "沙漠；荒地；抛弃；离弃", semanticField: "自然物理", prototype: "一片黄沙无垠、寸草不生的干旱之地", chapter: "自然地理", group: 1 },

  // 第二组（标杆 deforest 已手写，补充其余）
  { word: "barren", ipa: "/ˈbærən/", pos: "adj.", meaning: "贫瘠的；荒芜的；不结果实的", semanticField: "自然物理", prototype: "干裂的土地上寸草不生", chapter: "自然地理", group: 2 },
  { word: "fertile", ipa: "/ˈfɜːtaɪl/", pos: "adj.", meaning: "肥沃的；富饶的；能生育的", semanticField: "自然物理", prototype: "黑土上庄稼茂盛生长", chapter: "自然地理", group: 2 },
  { word: "fertilise", ipa: "/ˈfɜːtəlaɪz/", pos: "v.", meaning: "使受精；使肥沃；施肥", semanticField: "自然物理", prototype: "给土地施加养分使其肥沃", chapter: "自然地理", group: 2 },
  { word: "solar", ipa: "/ˈsəʊlə(r)/", pos: "adj.", meaning: "太阳的；日光的；太阳能的", semanticField: "自然物理", prototype: "太阳发出的光和热", chapter: "自然地理", group: 2 },
  { word: "lunar", ipa: "/ˈluːnə(r)/", pos: "adj.", meaning: "月亮的；月球的；阴历的", semanticField: "自然物理", prototype: "夜空中明亮的圆月", chapter: "自然地理", group: 2 },
  { word: "calendar", ipa: "/ˈkælɪndə(r)/", pos: "n.", meaning: "日历；历法；日程表", semanticField: "时间日期", prototype: "挂在墙上记录日期的纸页", chapter: "自然地理", group: 2 },
  { word: "sunrise", ipa: "/ˈsʌnraɪz/", pos: "n.", meaning: "日出；黎明", semanticField: "时间日期", prototype: "太阳从地平线缓缓升起的画面", chapter: "自然地理", group: 2 },
  { word: "sunset", ipa: "/ˈsʌnset/", pos: "n.", meaning: "日落；晚霞；晚年", semanticField: "时间日期", prototype: "太阳沉入地平线的壮丽景象", chapter: "自然地理", group: 2 },
  { word: "eclipse", ipa: "/ɪˈklɪps/", pos: "n./v.", meaning: "日食；月食；黯然失色", semanticField: "自然物理", prototype: "月球挡住太阳形成的天文现象", chapter: "自然地理", group: 2 },
  { word: "dusk", ipa: "/dʌsk/", pos: "n.", meaning: "黄昏；傍晚", semanticField: "时间日期", prototype: "天色渐暗、光影朦胧的时刻", chapter: "自然地理", group: 2 },
  { word: "heaven", ipa: "/ˈhevn/", pos: "n.", meaning: "天堂；天空；极乐", semanticField: "抽象概念", prototype: "头顶上方辽阔无边的苍穹", chapter: "自然地理", group: 2 },
  { word: "paradise", ipa: "/ˈpærədaɪs/", pos: "n.", meaning: "天堂；乐园；福地", semanticField: "抽象概念", prototype: "人间最美好如天堂般的境地", chapter: "自然地理", group: 2 },

  // 第三组
  { word: "sunshine", ipa: "/ˈsʌnʃaɪn/", pos: "n.", meaning: "阳光；日光；快乐", semanticField: "自然物理", prototype: "温暖的金色阳光洒向大地", chapter: "自然地理", group: 3 },
  { word: "shade", ipa: "/ʃeɪd/", pos: "n./v.", meaning: "阴凉处；阴影；色调；遮光", semanticField: "自然物理", prototype: "大树投下的凉爽阴影", chapter: "自然地理", group: 3 },
  { word: "shadow", ipa: "/ˈʃædəʊ/", pos: "n./v.", meaning: "影子；阴影；跟踪", semanticField: "自然物理", prototype: "身体在阳光下的黑色投影", chapter: "自然地理", group: 3 },
  { word: "vapour", ipa: "/ˈveɪpə(r)/", pos: "n.", meaning: "蒸汽；水汽；雾气", semanticField: "自然物理", prototype: "水面上方升腾的薄薄白雾", chapter: "自然地理", group: 3 },
  { word: "evaporate", ipa: "/ɪˈvæpəreɪt/", pos: "v.", meaning: "蒸发；消失；消散", semanticField: "自然物理", prototype: "水受热后化为气体上升消失", chapter: "自然地理", group: 3 },
  { word: "circulate", ipa: "/ˈsɜːkjəleɪt/", pos: "v.", meaning: "循环；流通；传播", semanticField: "运动变化", prototype: "血液在血管中持续流动", chapter: "自然地理", group: 3 },
  { word: "precipitate", ipa: "/prɪˈsɪpɪteɪt/ (v.) /prɪˈsɪpɪtət/ (n.)", pos: "v./n./adj.", meaning: "沉淀；促成；加速；降水；仓促的", semanticField: "自然物理", prototype: "云层中的水汽凝结成雨滴落下", chapter: "自然地理", group: 3 },
  { word: "reservoir", ipa: "/ˈrezəvwɑː(r)/", pos: "n.", meaning: "水库；蓄水池；储藏", semanticField: "自然物理", prototype: "山间筑坝拦截形成的大型人工湖", chapter: "自然地理", group: 3 },
  { word: "waterfall", ipa: "/ˈwɔːtəfɔːl/", pos: "n.", meaning: "瀑布", semanticField: "自然物理", prototype: "河水从悬崖上飞流直下", chapter: "自然地理", group: 3 },
  { word: "fountain", ipa: "/ˈfaʊntən/", pos: "n.", meaning: "喷泉；泉水；源泉", semanticField: "自然物理", prototype: "地下水涌出地面形成的泉眼", chapter: "自然地理", group: 3 },
  { word: "spring", ipa: "/sprɪŋ/", pos: "n./v.", meaning: "泉水；春天；弹簧；跳跃", semanticField: "自然物理", prototype: "岩石缝隙中涌出的清澈泉水", chapter: "自然地理", group: 3 },
  { word: "dew", ipa: "/djuː/", pos: "n.", meaning: "露水", semanticField: "自然物理", prototype: "清晨草叶上凝结的晶莹水珠", chapter: "自然地理", group: 3 },
  { word: "pour", ipa: "/pɔː(r)/", pos: "v.", meaning: "倾倒；倾泻；浇注", semanticField: "运动变化", prototype: "水壶倾斜水大量流出", chapter: "自然地理", group: 3 },
  { word: "drain", ipa: "/dreɪn/", pos: "n./v.", meaning: "排水；下水道；耗尽", semanticField: "运动变化", prototype: "积水通过管道流走", chapter: "自然地理", group: 3 },

  // 第四组
  { word: "drip", ipa: "/drɪp/", pos: "n./v.", meaning: "滴下；水滴", semanticField: "运动变化", prototype: "水龙头下悬挂欲落的水珠", chapter: "自然地理", group: 4 },
  { word: "drown", ipa: "/draʊn/", pos: "v.", meaning: "溺水；淹没；压过", semanticField: "运动变化", prototype: "人在水中无法呼吸而窒息", chapter: "自然地理", group: 4 },
  { word: "blow", ipa: "/bləʊ/", pos: "v./n.", meaning: "吹；打击；刮风", semanticField: "运动变化", prototype: "风从口中或自然界强力喷出", chapter: "自然地理", group: 4 },
  { word: "puff", ipa: "/pʌf/", pos: "n./v.", meaning: "一阵（烟/风）；喘息；吹气", semanticField: "运动变化", prototype: "吸烟者口中吐出的烟团", chapter: "自然地理", group: 4 },
  { word: "gush", ipa: "/ɡʌʃ/", pos: "n./v.", meaning: "涌出；喷出；迸发", semanticField: "运动变化", prototype: "地下油井突然大量喷油", chapter: "自然地理", group: 4 },
  { word: "dense", ipa: "/dens/", pos: "adj.", meaning: "浓密的；稠密的；密集的；愚钝的", semanticField: "空间位置", prototype: "森林中树木层层叠叠难以穿行", chapter: "自然地理", group: 4 },
  { word: "intensity", ipa: "/ɪnˈtensəti/", pos: "n.", meaning: "强度；强烈；紧张", semanticField: "感知评价", prototype: "光或热的集中程度", chapter: "自然地理", group: 4 },
  { word: "intensive", ipa: "/ɪnˈtensɪv/", pos: "adj.", meaning: "密集的；强化的；深入的", semanticField: "感知评价", prototype: "短时间内高度集中的努力", chapter: "自然地理", group: 4 },
  { word: "emerge", ipa: "/ɪˈmɜːdʒ/", pos: "v.", meaning: "浮现；出现；显露", semanticField: "运动变化", prototype: "潜水者从水面下缓缓露出头", chapter: "自然地理", group: 4 },
  { word: "flash", ipa: "/flæʃ/", pos: "n./v./adj.", meaning: "闪光；闪现；瞬间的", semanticField: "运动变化", prototype: "闪电划破夜空的短暂强光", chapter: "自然地理", group: 4 },
  { word: "float", ipa: "/fləʊt/", pos: "v./n.", meaning: "漂浮；浮动；漂流", semanticField: "运动变化", prototype: "树叶轻轻漂浮在水面", chapter: "自然地理", group: 4 },
  { word: "environment", ipa: "/ɪnˈvaɪrənmənt/", pos: "n.", meaning: "环境；自然环境；外界", semanticField: "自然物理", prototype: "生物周围的一切自然条件总和", chapter: "自然地理", group: 4 },
  { word: "surrounding", ipa: "/səˈraʊndɪŋ/", pos: "n./adj.", meaning: "周围环境；周围的", semanticField: "空间位置", prototype: "人站立位置四周的事物", chapter: "自然地理", group: 4 },
  { word: "condition", ipa: "/kənˈdɪʃn/", pos: "n./v.", meaning: "条件；状况；环境", semanticField: "抽象概念", prototype: "事物存在或发生的必备状态", chapter: "自然地理", group: 4 },

  // 第五组
  { word: "situation", ipa: "/ˌsɪtʃuˈeɪʃn/", pos: "n.", meaning: "情况；形势；处境；位置", semanticField: "抽象概念", prototype: "人在某个时刻所处的整体状态", chapter: "自然地理", group: 5 },
  { word: "nature", ipa: "/ˈneɪtʃə(r)/", pos: "n.", meaning: "自然；本性；天性；本质", semanticField: "自然物理", prototype: "山川河流森林组成的大自然", chapter: "自然地理", group: 5 },
  { word: "natural", ipa: "/ˈnætʃrəl/", pos: "adj./n.", meaning: "自然的；天生的；正常的", semanticField: "自然物理", prototype: "未经人工加工修饰的原生状态", chapter: "自然地理", group: 5 },
  { word: "artificial", ipa: "/ˌɑːtɪˈfɪʃl/", pos: "adj.", meaning: "人造的；人工的；虚假的", semanticField: "自然物理", prototype: "人工合成而非自然生长的物品", chapter: "自然地理", group: 5 },
  { word: "synthetic", ipa: "/sɪnˈθetɪk/", pos: "adj./n.", meaning: "合成的；人造的；综合的", semanticField: "自然物理", prototype: "实验室中化学合成的材料", chapter: "自然地理", group: 5 },
  { word: "petrol", ipa: "/ˈpetrəl/", pos: "n.", meaning: "汽油（英式）", semanticField: "物品材料", prototype: "加油站中流动的易燃液体", chapter: "自然地理", group: 5 },
  { word: "gas", ipa: "/ɡæs/", pos: "n.", meaning: "气体；煤气；汽油（美式）", semanticField: "物品材料", prototype: "看不见摸不着但充满空间的物质", chapter: "自然地理", group: 5 },
  { word: "gasoline", ipa: "/ˈɡæsəliːn/", pos: "n.", meaning: "汽油（美式）", semanticField: "物品材料", prototype: "汽车油箱中的燃料", chapter: "自然地理", group: 5 },
  { word: "petroleum", ipa: "/pəˈtrəʊliəm/", pos: "n.", meaning: "石油", semanticField: "物品材料", prototype: "地下深处开采出的黑色黏稠液体", chapter: "自然地理", group: 5 },
];

function slugify(word: string): string {
  return word.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function generateFrontmatter(w: WordEntry): string {
  const prototypeEscaped = w.prototype.replace(/"/g, '\\"');
  return `---
title: "${w.word}"
tags:
  - 学习/英语/雅思
  - 语义场/${w.semanticField}
aliases: []
date: 2026-05-29
word_freq: 雅思词汇
semantic_field: ${w.semanticField}
prototype: "${prototypeEscaped}"
extension_dim: [具身路径]
phonetic: "${w.ipa}"
pos: ${w.pos}
metaphor_type: 结构隐喻
word_root: ""
network_activation: [词根, 同义辨析, 反义词群, 派生词族]
last_review: 2026-05-29
review_count: 0
---`;
}

function generateBody(w: WordEntry): string {
  return `
# ${w.word}

> [!info] 基础信息
> **音标** ${w.ipa} | **词级** 雅思词汇 | **语义场** [[${w.semanticField}]] | **CERF** B2–C1

## 核心释义

**${w.pos}** ==**${w.meaning}**== [雅思真经·自然地理/${w.group}组]

> [!tip] 原型义
> **原型义**：${w.prototype}
> **延伸维度**：具身路径
> **隐喻类型**：结构隐喻

## 词根词缀

（待补充词源解析和叙事）

---

## 词义链路

> [!abstract]- 词义链路法
> 以"**${w.prototype}**"为统筹中心：
>
> （待补充义项扩展）

### 统筹（选择适用的模式）

- **一字一词概括**：（待补充）
- **延伸中心**：（待补充）

> [!check]- 链路验证
> - [ ] **可逆性**：
> - [ ] **可统筹**：

---

## 搭配与短语

- （待补充常见搭配）

## 真题/语料关联

- （待补充雅思相关场景）

---

## 同义词辨析

| 维度 | ${w.word} | （待补充） | （待补充） |
|------|-----------|-----------|-----------|
| 核心义 | ... | ... | ... |
| 语域 | ... | ... | ... |
| 搭配 | ... | ... | ... |
| 差异 | ... | ... | ... |

---

## 反义词

- （待补充）

---

## 记忆锚点

（待补充助记法）

---

## 派生词链接

- （待补充）

---

## 词性转换

- （待补充）
`;
}

function generateFile(w: WordEntry): string {
  return generateFrontmatter(w) + generateBody(w);
}

let created = 0;
let skipped = 0;

for (const w of chapter1Words) {
  const filePath = join(CHAPTER_DIR, `${slugify(w.word)}.md`);

  // Skip if file already exists (handwritten benchmarks)
  try {
    const existing = readFileSync(filePath, "utf8");
    if (existing.includes("词义链路") && existing.includes("记忆锚点")) {
      console.log(`[skip] ${w.word}.md already has full content`);
      skipped++;
      continue;
    }
  } catch {
    // File doesn't exist, create it
  }

  const content = generateFile(w);
  writeFileSync(filePath, content, "utf8");
  console.log(`[create] ${w.word}.md`);
  created++;
}

console.log(`\nDone: ${created} created, ${skipped} skipped (benchmarks)`);
