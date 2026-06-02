#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate vocabulary note files in margin.md format - Simplified version
"""

import os

# Vocabulary data - simplified
vocab_list = [
    {
        "word": "staple",
        "phonetic": "/ˈsteɪpəl/",
        "pos": "n./v.",
        "cerf": "B2",
        "prototype": "U形金属钉——将纸张固定在一起的小型金属紧固件",
        "extension_dim": "[固定路径, 基本路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "stapul (Old English: post, pillar)",
        "meanings": [
            "n. ①==**订书钉**==（U形金属钉，用于固定纸张）`staple gun` [办公]；",
            "n. ②==**主食，基本食物**==（日常饮食的主要部分）`staple food` [农业/通用]；",
            "n. ③==**主要产品，基本商品**==（某地区或经济的主要产出）`staple commodity` [商业]；",
            "v. ④==**用订书钉固定**==（用订书钉装订）`staple the papers` [办公]；"
        ],
        "collocations": [
            ("staple gun", "钉枪", "He used a staple gun to attach the fabric to the frame."),
            ("staple food", "主食", "Rice is a staple food in many Asian countries."),
            ("staple diet", "主要食物", "Bread and potatoes were the staple diet of the working class."),
            ("staple crop", "主要作物", "Wheat is a staple crop in the northern regions."),
            ("staple together", "用订书钉订在一起", "Please staple the documents together before submitting them.")
        ],
        "exam_context": [
            ("雅思写作 Task 2（教育类）", "Some people think that students should study science subjects. To what extent do you agree?", "Staple subjects like mathematics and science form the foundation of a well-rounded education."),
            ("雅思阅读学术语料", "Rice and wheat are the two most important staple crops globally, feeding billions of people.", ""),
            ("雅思口语 Part 3", "What are the traditional foods in your country?", "Rice has always been a staple food in Chinese cuisine, accompanying almost every meal.")
        ],
        "synonyms_table": "| 维度 | staple | basic | essential |\n|------|--------|-------|----------|\n| 核心义 | 基本物品（有固定功能） | 基本的（基础层面） | 必要的（不可或缺） |\n| 语域 | 通用/农业/商业 | 通用 | 通用/学术 |\n| 搭配 | staple food, staple crop | basic needs, basic skills | essential element, essential service |\n| 情感 | 含基础/核心感 | 含简单/基础感 | 含重要/必要感 |\n| 差异 | 强调**基本组成** | 强调**基础层面** | 强调**不可或缺** |",
        "antonyms": ["luxury（奢侈品）", "optional（可选的）", "supplementary（补充的）"],
        "memory_anchor": "**谐音锚点**：staple = \"死呆泼\" → 订书钉**死死**钉住，**呆**在纸上，**泼**水也不掉 → staple = 订书钉\n\n**画面锚点**：想象订书钉把一叠纸**固定**在一起——staple 就是那个\"固定者\"。\n\n**词根锚点**：stap-（柱子）+ -le → 像小柱子一样钉住 = 订书钉。",
        "derivatives": [("stapler", "n.", "订书机", "The office stapler is always running out of staples.")],
        "word_form_changes": [("staple", "n./v.", "订书钉；主食"), ("stapler", "n.", "订书机"), ("stapled", "adj.", "用订书钉固定的")]
    },
    {
        "word": "nail",
        "phonetic": "/neɪl/",
        "pos": "n.",
        "cerf": "A2",
        "prototype": "细长的金属钉——一端尖锐，另一端扁平，用于固定物体",
        "extension_dim": "[固定路径, 身体路径]",
        "metaphor_type": "转喻",
        "word_root": "nægl (Old English: fingernail, claw)",
        "meanings": [
            "n. ①==**钉子**==（金属紧固件）`hammer a nail` [建筑/通用]；",
            "n. ②==**指甲，趾甲**==（手指或脚趾的角质覆盖物）`fingernail` [身体/通用]；",
            "v. ③==**钉，钉住**==（用钉子固定）`nail the board` [建筑]；",
            "v. ④==**抓住，捕获**==（俚语）`nail the thief` [口语]；",
            "v. ⑤==**成功完成**==（俚语）`nail the exam` [口语]；"
        ],
        "collocations": [
            ("hammer a nail", "钉钉子", "He hammered a nail into the wall to hang the picture."),
            ("fingernail", "指甲", "She painted her fingernails red for the party."),
            ("nail down", "确定，固定", "We need to nail down the details of the agreement."),
            ("nail file", "指甲锉", "She used a nail file to smooth the edges of her nails."),
            ("hit the nail on the head", "说得中肯，一针见血", "You've hit the nail on the head with that analysis.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（家居类）", "Instructions for assembling furniture", "First, hammer the nails into the pre-drilled holes to secure the panels."),
            ("雅思阅读学术语料", "Archaeological evidence suggests that nails were among the earliest metal fasteners used by humans.", ""),
            ("雅思口语 Part 2", "Describe a time when you fixed something", "I had to nail the loose board back onto the fence to stop it from falling.")
        ],
        "synonyms_table": "| 维度 | nail | pin | tack |\n|------|------|-----|------|\n| 核心义 | 金属紧固件（一端尖锐） | 大头针（短而细） | 图钉/平头钉（短而粗） |\n| 语域 | 通用/建筑 | 办公/缝纫 | 办公/装饰 |\n| 搭配 | hammer a nail, nail polish | push pin, drawing pin | thumbtack, carpet tack |\n| 情感 | 中性 | 中性 | 中性 |\n| 差异 | 强调**较长的金属钉** | 强调**短细的针** | 强调**短粗的固定钉** |",
        "antonyms": ["screw（螺丝）", "bolt（螺栓）"],
        "memory_anchor": "**谐音锚点**：nail = \"内欧\" → 把钉子**内**部**欧**进去 → nail = 钉子\n\n**画面锚点**：想象锤子把钉子敲进木头——nail 就是那个被敲的\"金属棒\"。\n\n**词根锚点**：nail 古英语本义就是\"指甲\"——手指的\"硬壳\"，后引申为形状相似的\"钉子\"。",
        "derivatives": [
            ("nail polish", "n.", "指甲油", "She applied a coat of nail polish before the party."),
            ("nail file", "n.", "指甲锉", "A nail file is used to shape and smooth fingernails."),
            ("nail clippers", "n.", "指甲刀", "He used nail clippers to trim his toenails.")
        ],
        "word_form_changes": [("nail", "n.", "钉子；指甲"), ("nail", "v.", "钉住；抓住"), ("nailed", "adj.", "钉住的")]
    },
    {
        "word": "razor",
        "phonetic": "/ˈreɪzə(r)/",
        "pos": "n.",
        "cerf": "B1",
        "prototype": "锋利的刀片——用于刮除毛发的切割工具",
        "extension_dim": "[切割路径, 清洁路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "rasare (Latin: to scrape)",
        "meanings": [
            "n. ①==**剃须刀**==（用于刮除毛发的工具）`electric razor` [个人护理]；",
            "n. ②==**刀片**==（锋利的薄片）`razor blade` [工具]；",
            "n. ③==**剃刀**==（传统手动剃须刀）`safety razor` [个人护理]；"
        ],
        "collocations": [
            ("electric razor", "电动剃须刀", "He prefers using an electric razor for a quick shave."),
            ("razor blade", "刀片", "Be careful with the razor blade—it's very sharp."),
            ("razor sharp", "锋利如刀的", "The chef's knife was razor sharp and cut through the meat effortlessly."),
            ("razor thin", "极薄的", "The margin of victory was razor thin—only three votes."),
            ("safety razor", "安全剃刀", "A safety razor has a protective guard to prevent cuts.")
        ],
        "exam_context": [
            ("雅思听力 Section 1（购物类）", "Purchasing personal care items", "I'd like to buy a pack of razor blades for my electric shaver."),
            ("雅思阅读学术语料", "The invention of the safety razor in the early 20th century revolutionized personal grooming.", ""),
            ("雅思口语 Part 2", "Describe a useful invention", "The electric razor is a convenient invention that saves time in daily grooming routines.")
        ],
        "synonyms_table": "| 维度 | razor | shaver | blade |\n|------|-------|--------|-------|\n| 核心义 | 剃毛发的工具 | 剃须工具（电动） | 切割用的薄片 |\n| 语域 | 通用/个人护理 | 个人护理 | 工具/医学 |\n| 搭配 | razor blade, electric razor | electric shaver, shaver | blade, surgical blade |\n| 情感 | 中性 | 中性 | 可含危险感 |\n| 差异 | 强调**切割功能** | 强调**剃须功能** | 强调**锋利薄片** |",
        "antonyms": ["blunt tool（钝器）"],
        "memory_anchor": "**谐音锚点**：razor = \"瑞泽\" → **瑞**士军刀般**泽**亮的刀片 → razor = 剃须刀\n\n**画面锚点**：想象一个男人对着镜子用电动剃须刀刮胡子——razor 就是那个发出嗡嗡声的\"个人护理工具\"。\n\n**词根锚点**：ras-（刮，擦）+ -or → 用来刮的东西 = 剃须刀。",
        "derivatives": [
            ("razor blade", "n.", "剃须刀片", "Replace the razor blade every few weeks for a clean shave."),
            ("razor sharp", "adj.", "锋利如刀的", "The razor sharp edge of the knife made cutting effortless."),
            ("razor thin", "adj.", "极薄的", "The razor thin margin showed how close the competition was.")
        ],
        "word_form_changes": [("razor", "n.", "剃须刀"), ("razor", "v.", "用剃刀刮（较少用）"), ("razor-sharp", "adj.", "锋利如刀的")]
    },
    {
        "word": "shave",
        "phonetic": "/ʃeɪv/",
        "pos": "v./n.",
        "cerf": "B1",
        "prototype": "用刀片刮除毛发——使表面光滑的动作",
        "extension_dim": "[清洁路径, 精确路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "sceafan (Old English: to scrape)",
        "meanings": [
            "v. ①==**刮胡子，剃须**==（用剃须刀去除面部毛发）`shave every morning` [个人护理]；",
            "v. ②==**剃毛**==（去除身体毛发）`shave legs` [个人护理]；",
            "v. ③==**削薄，削减**==（减少少量）`shave off costs` [商业/通用]；",
            "n. ④==**刮胡子**==（剃须的行为）`have a shave` [个人护理]；"
        ],
        "collocations": [
            ("shave off", "刮掉；削减", "He shaved off his beard for the job interview."),
            ("have a shave", "刮胡子", "I need to have a shave before the meeting."),
            ("shave one's head", "剃光头", "He decided to shave his head for charity."),
            ("close shave", "侥幸脱险；近距离", "That was a close shave—the car almost hit us."),
            ("shave off time", "缩短时间", "She managed to shave ten minutes off her commute by taking a shortcut.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（健康类）", "Personal hygiene advice", "It's recommended to shave regularly to maintain good personal hygiene."),
            ("雅思阅读学术语料", "In some cultures, shaving one's head is a symbol of mourning or spiritual devotion.", ""),
            ("雅思口语 Part 1", "What's your daily routine?", "I usually shave every morning before going to work to keep a neat appearance.")
        ],
        "synonyms_table": "| 维度 | shave | trim | cut |\n|------|-------|------|-----|\n| 核心义 | 刮除毛发 | 修剪（使整齐） | 剪切（通用） |\n| 语域 | 个人护理 | 个人护理/园艺 | 通用 |\n| 搭配 | shave off, have a shave | trim the hedge, trim hair | cut hair, cut costs |\n| 情感 | 中性 | 中性 | 中性 |\n| 差异 | 强调**刮除** | 强调**修剪整齐** | 强调**切割动作** |",
        "antonyms": ["grow（生长）", "grow beard（留胡子）"],
        "memory_anchor": "**谐音锚点**：shave = \"谢夫\" → 感**谢**丈**夫**帮忙刮胡子 → shave = 刮胡子\n\n**画面锚点**：想象一个男人在浴室镜子前用剃须刀刮胡子——shave 就是那个\"刮\"的动作。\n\n**词根锚点**：shave 古英语本义就是\"刮、削\"——用刀片去除表面物质。",
        "derivatives": [
            ("shaver", "n.", "剃须刀", "He bought a new electric shaver."),
            ("shaving", "n.", "刮胡子；刨花", "Shaving every day can irritate sensitive skin."),
            ("shaving cream", "n.", "剃须膏", "Apply shaving cream before using the razor.")
        ],
        "word_form_changes": [("shave", "v.", "刮胡子；剃毛"), ("shave", "n.", "刮胡子"), ("shaved", "adj.", "刮过的"), ("shaven", "adj.", "刮过的（书面语）")]
    },
    {
        "word": "fuse",
        "phonetic": "/fjuːz/",
        "pos": "n./v.",
        "cerf": "B2",
        "prototype": "保险丝——电路中的安全装置，电流过载时熔断以保护电路",
        "extension_dim": "[安全路径, 融合路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "fusus (Latin: poured, melted)",
        "meanings": [
            "n. ①==**保险丝**==（电路保护装置）`blow a fuse` [电气]；",
            "n. ②==**引信，导火线**==（炸弹或爆竹的引爆装置）`light the fuse` [军事/通用]；",
            "v. ③==**融合，合并**==（将不同事物结合为一体）`fuse the elements` [通用/学术]；",
            "v. ④==**熔化**==（加热使固体变为液体）`fuse metals` [工业]；",
            "v. ⑤==**烧断保险丝**==（电路过载）`The lights fused` [电气]；"
        ],
        "collocations": [
            ("blow a fuse", "烧断保险丝；发怒", "The hairdryer blew a fuse when I turned it on."),
            ("light the fuse", "点燃引信", "The soldier carefully lit the fuse of the firework."),
            ("fuse box", "保险丝盒", "Check the fuse box if the power goes out."),
            ("fuse together", "融合在一起", "The two companies decided to fuse together to increase market share."),
            ("short fuse", "易怒的脾气", "He has a short fuse and gets angry easily.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（家庭维护类）", "Troubleshooting home electrical issues", "If the lights go out, check the fuse box to see if a fuse has blown."),
            ("雅思阅读学术语料", "The fusion of traditional and modern architectural styles has created unique urban landscapes.", ""),
            ("雅思口语 Part 3", "How has technology changed the way people work?", "Technology has allowed different industries to fuse their operations and create more efficient workflows.")
        ],
        "synonyms_table": "| 维度 | fuse | merge | blend |\n|------|------|-------|-------|\n| 核心义 | 安全装置/融合 | 合并（组织） | 混合（物质） |\n| 语域 | 电气/通用 | 商业/组织 | 烹饪/艺术 |\n| 搭配 | fuse box, blow a fuse | merge companies, merge files | blend ingredients, blend colors |\n| 情感 | 中性 | 中性 | 中性 |\n| 差异 | 强调**安全/融合** | 强调**组织合并** | 强调**物质混合** |",
        "antonyms": ["separate（分离）", "divide（分开）", "split（分裂）"],
        "memory_anchor": "**谐音锚点**：fuse = \"富滋\" → **富**含**滋**味的融合 → fuse = 融合\n\n**画面锚点**：想象保险丝在电流过载时\"熔断\"——fuse 就是那个\"牺牲自己保护电路\"的小装置。\n\n**词根锚点**：fus-（倾倒，熔化）+ -e → 熔化在一起 = 融合。",
        "derivatives": [
            ("fusion", "n.", "融合；核聚变", "The fusion of jazz and rock created a new musical genre."),
            ("fused", "adj.", "融合的", "The fused metals created a stronger alloy."),
            ("fusion reactor", "n.", "核聚变反应堆", "Scientists are developing fusion reactors for clean energy.")
        ],
        "word_form_changes": [("fuse", "n.", "保险丝；引信"), ("fuse", "v.", "融合；熔化"), ("fused", "adj.", "融合的"), ("fusion", "n.", "融合；聚变")]
    },
    {
        "word": "cable",
        "phonetic": "/ˈkeɪbəl/",
        "pos": "n.",
        "cerf": "B1",
        "prototype": "粗大的绳索或电线——用于传输电力或信号的线状物",
        "extension_dim": "[传输路径, 连接路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "capulum (Latin: rope, halter)",
        "meanings": [
            "n. ①==**电缆，线缆**==（用于传输电力或信号）`power cable` [电气/通信]；",
            "n. ②==**有线电视**==（通过电缆传输的电视服务）`cable TV` [媒体]；",
            "n. ③==**电报**==（旧式用法）`send a cable` [历史/通信]；",
            "n. ④==**钢缆**==（粗大的金属绳索）`steel cable` [工程]；"
        ],
        "collocations": [
            ("power cable", "电源线", "Make sure the power cable is properly connected before turning on the computer."),
            ("cable television", "有线电视", "Cable television offers hundreds of channels for subscribers."),
            ("fiber optic cable", "光纤电缆", "Fiber optic cables transmit data at the speed of light."),
            ("cable car", "缆车", "We took a cable car to the top of the mountain."),
            ("cable network", "有线网络", "The cable network provides high-speed internet access.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（科技类）", "Internet service installation", "The technician will install a fiber optic cable to provide faster internet speeds."),
            ("雅思阅读学术语料", "The laying of transatlantic telegraph cables in the 19th century revolutionized global communication.", ""),
            ("雅思口语 Part 3", "How has technology changed communication?", "Fiber optic cables have made it possible to transmit vast amounts of data across continents in milliseconds.")
        ],
        "synonyms_table": "| 维度 | cable | wire | cord |\n|------|-------|------|------|\n| 核心义 | 传输线（粗大） | 电线（细小） | 绳索/细电线 |\n| 语域 | 电气/通信 | 电气 | 通用/电气 |\n| 搭配 | power cable, cable TV | electrical wire, wire mesh | extension cord, power cord |\n| 情感 | 中性 | 中性 | 中性 |\n| 差异 | 强调**粗大的传输线** | 强调**细小的电线** | 强调**柔软的线/绳** |",
        "antonyms": ["wireless（无线的）"],
        "memory_anchor": "**谐音锚点**：cable = \"凯伯\" → **凯**旋的**伯**爵用电缆发电 → cable = 电缆\n\n**画面锚点**：想象海底电缆连接着各个大陆——cable 就是那个\"跨越海洋的连接者\"。\n\n**词根锚点**：cable 源自拉丁语 capulum（绳索）——粗大的绳索，后引申为电缆。",
        "derivatives": [
            ("cable television", "n.", "有线电视", "Cable television has become increasingly popular worldwide."),
            ("cable car", "n.", "缆车", "The cable car offers stunning views of the valley."),
            ("cable network", "n.", "有线网络", "The cable network infrastructure supports high-speed internet.")
        ],
        "word_form_changes": [("cable", "n.", "电缆；有线电视"), ("cable", "v.", "发电报（旧式）"), ("cabled", "adj.", "用电缆连接的")]
    },
    {
        "word": "cord",
        "phonetic": "/kɔːd/",
        "pos": "n.",
        "cerf": "B2",
        "prototype": "细长的绳索或电线——用于连接或束缚的线状物",
        "extension_dim": "[连接路径, 束缚路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "chord (Greek: string of a musical instrument)",
        "meanings": [
            "n. ①==**细绳，粗线**==（用于捆绑或连接）`nylon cord` [通用]；",
            "n. ②==**电线**==（连接电器的导线）`power cord` [电气]；",
            "n. ③==**绳索**==（较粗的绳子）`climbing cord` [运动/工程]；",
            "n. ④==**灯芯绒**==（一种布料）`cord trousers` [纺织]；"
        ],
        "collocations": [
            ("power cord", "电源线", "Don't forget to unplug the power cord before cleaning the computer."),
            ("extension cord", "延长线", "We need an extension cord to reach the outlet across the room."),
            ("vocal cords", "声带", "The singer damaged her vocal cords from overuse."),
            ("spinal cord", "脊髓", "The spinal cord transmits signals between the brain and the body."),
            ("cord of wood", "木材的计量单位", "They ordered a cord of wood for the fireplace.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（安全类）", "Home safety guidelines", "Ensure that electrical cords are not frayed or damaged to prevent fire hazards."),
            ("雅思阅读学术语料", "Damage to the spinal cord can result in permanent paralysis.", ""),
            ("雅思口语 Part 2", "Describe a piece of technology you use daily", "The power cord of my laptop is something I use every day to keep it charged.")
        ],
        "synonyms_table": "| 维度 | cord | rope | string |\n|------|------|------|--------|\n| 核心义 | 细绳/电线 | 粗绳 | 细线 |\n| 语域 | 通用/电气 | 运动/工程 | 通用/手工 |\n| 搭配 | power cord, extension cord | climbing rope, rope ladder | string, kite string |\n| 情感 | 中性 | 中性 | 中性 |\n| 差异 | 强调**细长的线/绳** | 强调**粗大的绳索** | 强调**细小的线** |",
        "antonyms": ["wireless（无线的）"],
        "memory_anchor": "**谐音锚点**：cord = \"靠的\" → 电器**靠**电**cord**供电 → cord = 电线\n\n**画面锚点**：想象一根电线连接着电器和插座——cord 就是那个\"连接者\"。\n\n**词根锚点**：cord 与 chord 同源，本义是\"琴弦\"——细长的线状物。",
        "derivatives": [
            ("cordless", "adj.", "无线的", "A cordless phone allows you to move freely while talking."),
            ("cordon", "n.", "警戒线", "The police set up a cordon around the crime scene."),
            ("corduroy", "n.", "灯芯绒", "He wore a pair of corduroy trousers to the casual event.")
        ],
        "word_form_changes": [("cord", "n.", "细绳；电线"), ("cordless", "adj.", "无线的"), ("corduroy", "n.", "灯芯绒")]
    },
    {
        "word": "strand",
        "phonetic": "/strænd/",
        "pos": "n./v.",
        "cerf": "B2",
        "prototype": "一缕线或一股绳——从整体中分离出的细长部分",
        "extension_dim": "[分离路径, 组成路径]",
        "metaphor_type": "结构隐喻",
        "word_root": "strand (Old English: shore, beach)",
        "meanings": [
            "n. ①==**线，绳，股**==（细长的一缕）`a strand of hair` [通用]；",
            "n. ②==**（故事、计划的）部分，方面**==（复杂事物的组成部分）`a strand of the argument` [学术]；",
            "n. ③==**（DNA的）链**==（生物学术语）`DNA strand` [生物]；",
            "v. ④==**使搁浅**==（船被困在浅水处）`The ship was stranded` [航海]；",
            "v. ⑤==**使陷入困境**==（无法离开）`stranded travelers` [通用]；"
        ],
        "collocations": [
            ("a strand of", "一缕，一股", "She pulled a strand of hair from her brush."),
            ("strand of DNA", "DNA链", "Each strand of DNA contains genetic information."),
            ("stranded on", "搁浅在；困在", "The boat was stranded on the sandbar after the tide went out."),
            ("stranded travelers", "滞留的旅客", "The snowstorm left many stranded travelers at the airport."),
            ("strand together", "编织在一起", "The different strands of the story are woven together beautifully.")
        ],
        "exam_context": [
            ("雅思阅读学术语料", "DNA is composed of two strands that wind around each other to form a double helix.", ""),
            ("雅思听力 Section 3（学术讨论类）", "Research methodology discussion", "The argument has several strands that need to be addressed separately."),
            ("雅思口语 Part 2", "Describe a difficult situation you've faced", "We were stranded at the airport for hours due to the flight delay.")
        ],
        "synonyms_table": "| 维度 | strand | thread | fiber |\n|------|--------|--------|-------|\n| 核心义 | 一缕/一股（细长部分） | 线（纺织用） | 纤维（物质组成） |\n| 语域 | 通用/学术 | 纺织/手工 | 科学/材料 |\n| 搭配 | a strand of hair, strand of DNA | thread, needle and thread | fiber optic, natural fiber |\n| 情感 | 中性 | 中性 | 中性 |\n| 差异 | 强调**分离出的细长部分** | 强调**纺织用的线** | 强调**物质的基本组成** |",
        "antonyms": ["whole（整体）", "bundle（捆，束）"],
        "memory_anchor": "**谐音锚点**：strand = \"斯传的\" → 斯文地传下来的**一缕**线 → strand = 一缕\n\n**画面锚点**：想象从毛线团中抽出一缕线——strand 就是那个\"分离出来的细长部分\"。\n\n**词根锚点**：strand 古英语本义是\"岸边\"——陆地与水的交界线，后引申为\"细长的部分\"。",
        "derivatives": [
            ("stranded", "adj.", "搁浅的；困住的", "The stranded passengers waited for rescue."),
            ("strandline", "n.", "海岸线", "The strandline marks the highest point of the tide.")
        ],
        "word_form_changes": [("strand", "n.", "线；股"), ("strand", "v.", "使搁浅"), ("stranded", "adj.", "搁浅的；困住的")]
    },
    {
        "word": "match",
        "phonetic": "/mætʃ/",
        "pos": "n./v.",
        "cerf": "A2",
        "prototype": "火柴——点燃火焰的小木棍",
        "extension_dim": "[点燃路径, 匹配路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "mycke (Old English: wick)",
        "meanings": [
            "n. ①==**火柴**==（点燃火焰的小木棍）`strike a match` [通用]；",
            "n. ②==**比赛，竞赛**==（体育或游戏的竞争）`football match` [体育]；",
            "n. ③==**匹配物，配对物**==（与另一物相配的东西）`a good match` [通用]；",
            "n. ④==**对手，敌手**==（实力相当的竞争者）`meet one's match` [通用]；",
            "v. ⑤==**匹配，相配**==（与……相称）`match the colors` [通用]；",
            "v. ⑥==**比得上，敌得过**==（与……相当）`no one can match him` [通用]；"
        ],
        "collocations": [
            ("strike a match", "划火柴", "He struck a match to light the candle."),
            ("football match", "足球比赛", "The football match ended in a draw."),
            ("match point", "赛点", "The tennis player won on match point."),
            ("match up", "匹配，相符", "The two stories don't match up—there must be a mistake."),
            ("meet one's match", "遇到对手", "The champion finally met his match in the young challenger.")
        ],
        "exam_context": [
            ("雅思听力 Section 1（日常生活类）", "Shopping for household items", "I need to buy a box of matches for the fireplace."),
            ("雅思阅读学术语料", "The match between the experimental results and the theoretical predictions confirmed the hypothesis.", ""),
            ("雅思口语 Part 2", "Describe a sports event you watched", "The football match was exciting—the score was tied until the last minute.")
        ],
        "synonyms_table": "| 维度 | match | game | competition |\n|------|-------|------|-------------|\n| 核心义 | 火柴/比赛 | 游戏/比赛 | 竞争/比赛 |\n| 语域 | 通用/体育 | 体育/娱乐 | 通用/体育 |\n| 搭配 | strike a match, football match | play a game, video game | enter a competition, fierce competition |\n| 情感 | 中性 | 中性 | 可含竞争感 |\n| 差异 | 强调**火柴/配对** | 强调**娱乐性比赛** | 强调**正式竞争** |",
        "antonyms": ["mismatch（不匹配）", "contrast（对比）"],
        "memory_anchor": "**谐音锚点**：match = \"麦吃\" → **麦**当劳**吃**完后划火柴点烟 → match = 火柴\n\n**画面锚点**：想象划火柴点燃蜡烛的瞬间——match 就是那个\"点燃火焰的小木棍\"。\n\n**词根锚点**：match 古英语本义是\"灯芯\"——引火之物，后引申为火柴和比赛（对手势均力敌，像火柴一样\"匹配\"）。",
        "derivatives": [
            ("matchbox", "n.", "火柴盒", "She kept a collection of vintage matchboxes."),
            ("matchstick", "n.", "火柴棍", "The children built a house out of matchsticks."),
            ("matchmaker", "n.", "媒人", "In traditional cultures, a matchmaker arranges marriages."),
            ("matching", "adj.", "相配的", "They wore matching outfits to the party.")
        ],
        "word_form_changes": [("match", "n.", "火柴；比赛"), ("match", "v.", "匹配；比得上"), ("matched", "adj.", "匹配的"), ("matching", "adj.", "相配的")]
    },
    {
        "word": "candle",
        "phonetic": "/ˈkændl/",
        "pos": "n.",
        "cerf": "A2",
        "prototype": "蜡烛——燃烧发光的蜡质圆柱体",
        "extension_dim": "[照明路径, 仪式路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "candela (Latin: torch, candle)",
        "meanings": [
            "n. ①==**蜡烛**==（燃烧发光的蜡质圆柱体）`light a candle` [通用]；",
            "n. ②==**烛光**==（蜡烛发出的光）`by candle light` [文学]；",
            "n. ③==**蜡烛形物**==（形状类似蜡烛的东西）`candle holder` [装饰]；"
        ],
        "collocations": [
            ("light a candle", "点燃蜡烛", "She lit a candle to create a romantic atmosphere."),
            ("blow out a candle", "吹灭蜡烛", "The child blew out the candles on the birthday cake."),
            ("candle light", "烛光", "They had dinner by candle light."),
            ("candle holder", "烛台", "The silver candle holder added elegance to the table setting."),
            ("burn the candle at both ends", "过度劳累", "She's been burning the candle at both ends with work and studies.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（文化类）", "Traditional festivals and customs", "During the festival, people light candles to honor their ancestors."),
            ("雅思阅读学术语料", "Before the invention of electric lighting, candles and oil lamps were the primary sources of artificial light.", ""),
            ("雅思口语 Part 2", "Describe a special meal you had", "The restaurant was lit only by candles, creating a very intimate atmosphere.")
        ],
        "synonyms_table": "| 维度 | candle | torch | lamp |\n|------|--------|-------|------|\n| 核心义 | 蜡烛（蜡质照明物） | 火把/手电筒 | 灯（油灯/电灯） |\n| 语域 | 通用/文学 | 通用/户外 | 通用/电气 |\n| 搭配 | light a candle, candle light | flashlight, torch light | oil lamp, desk lamp |\n| 情感 | 含浪漫/传统感 | 含冒险/户外感 | 含现代/实用感 |\n| 差异 | 强调**蜡质燃烧** | 强调**便携照明** | 强调**固定照明** |",
        "antonyms": ["electric light（电灯）"],
        "memory_anchor": "**谐音锚点**：candle = \"坎斗\" → 在**坎**坷中**斗**争，点蜡烛照亮前路 → candle = 蜡烛\n\n**画面锚点**：想象生日蛋糕上点燃的蜡烛——candle 就是那个\"燃烧发光的小圆柱\"。\n\n**词根锚点**：cand-（发光，白）+ -le → 发光的小东西 = 蜡烛。",
        "derivatives": [
            ("candlelight", "n.", "烛光", "They sat and talked by candlelight during the power outage."),
            ("candlestick", "n.", "烛台", "The antique candlestick was made of solid silver."),
            ("candle wax", "n.", "蜡烛蜡", "Candle wax dripped onto the tablecloth.")
        ],
        "word_form_changes": [("candle", "n.", "蜡烛"), ("candlelight", "n.", "烛光"), ("candlelit", "adj.", "烛光照明的")]
    },
    {
        "word": "wax",
        "phonetic": "/wæks/",
        "pos": "n./v.",
        "cerf": "B2",
        "prototype": "蜡——受热会软化、冷却会硬化的物质",
        "extension_dim": "[保护路径, 变化路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "weax (Old English: beeswax)",
        "meanings": [
            "n. ①==**蜡**==（受热软化、冷却硬化的物质）`beeswax` [材料]；",
            "n. ②==**蜡状物**==（类似蜡的物质）`ear wax` [医学]；",
            "n. ③==**唱片**==（旧式用法）`wax record` [历史]；",
            "v. ④==**给……打蜡**==（涂蜡以保护或抛光）`wax the floor` [清洁]；",
            "v. ⑤==**（月亮）变圆**==（逐渐增大）`The moon waxes` [天文]；",
            "v. ⑥==**变得……**==（逐渐进入某种状态）`wax lyrical` [文学]；"
        ],
        "collocations": [
            ("beeswax", "蜂蜡", "Beeswax is used to make candles and cosmetics."),
            ("wax paper", "蜡纸", "Wrap the sandwiches in wax paper to keep them fresh."),
            ("wax the floor", "给地板打蜡", "We need to wax the floor to protect the wood."),
            ("wax and wane", "兴衰，盈亏", "The popularity of the trend tends to wax and wane."),
            ("wax lyrical", "热情洋溢地说", "He waxed lyrical about his vacation in Italy.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（家庭维护类）", "Home maintenance tips", "Regularly waxing wooden furniture helps protect it from scratches and moisture."),
            ("雅思阅读学术语料", "The phases of the moon—waxing and waning—are caused by its position relative to the sun and earth.", ""),
            ("雅思口语 Part 2", "Describe a skill you learned", "I learned how to wax the floor properly to maintain its shine.")
        ],
        "synonyms_table": "| 维度 | wax | polish | coat |\n|------|-----|--------|------|\n| 核心义 | 蜡/打蜡 | 抛光/擦亮 | 涂层/覆盖 |\n| 语域 | 材料/清洁 | 清洁/美容 | 工业/艺术 |\n| 搭配 | wax the floor, beeswax | polish shoes, nail polish | coat of paint, sugar coat |\n| 情感 | 中性 | 中性 | 中性 |\n| 差异 | 强调**蜡质保护** | 强调**光亮效果** | 强调**覆盖层** |",
        "antonyms": ["wane（衰落，月亏）"],
        "memory_anchor": "**谐音锚点**：wax = \"瓦克斯\" → **瓦**片上涂了**克**重的**斯**蜡 → wax = 蜡\n\n**画面锚点**：想象给地板打蜡后闪闪发亮——wax 就是那个\"保护和抛光\"的物质。\n\n**词根锚点**：wax 古英语本义是\"蜂蜡\"——蜜蜂分泌的蜡质物。",
        "derivatives": [
            ("waxwork", "n.", "蜡像", "The wax museum displays lifelike figures of famous people."),
            ("waxy", "adj.", "蜡质的；光滑的", "The waxy coating on the apple makes it shiny."),
            ("beeswax", "n.", "蜂蜡", "Beeswax candles burn cleaner than paraffin candles.")
        ],
        "word_form_changes": [("wax", "n.", "蜡"), ("wax", "v.", "打蜡；变圆"), ("waxy", "adj.", "蜡质的"), ("waxed", "adj.", "打过蜡的")]
    },
    {
        "word": "portfolio",
        "phonetic": "/pɔːtˈfəʊliəʊ/",
        "pos": "n.",
        "cerf": "B2",
        "prototype": "文件夹——携带文件和作品的扁平容器",
        "extension_dim": "[收集路径, 展示路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "portare (Latin: to carry) + foglio (Italian: leaf, sheet)",
        "meanings": [
            "n. ①==**文件夹**==（携带文件的扁平容器）`leather portfolio` [办公]；",
            "n. ②==**作品集**==（展示能力的作品合集）`art portfolio` [艺术/学术]；",
            "n. ③==**投资组合**==（金融资产的集合）`investment portfolio` [金融]；",
            "n. ④==**部长职位**==（政府职务）`ministerial portfolio` [政治]；"
        ],
        "collocations": [
            ("art portfolio", "艺术作品集", "The artist submitted her portfolio to the gallery for consideration."),
            ("investment portfolio", "投资组合", "Diversifying your investment portfolio can reduce risk."),
            ("portfolio career", "组合型职业", "Many millennials prefer a portfolio career with multiple income streams."),
            ("portfolio management", "投资组合管理", "Effective portfolio management requires regular review and rebalancing."),
            ("ministerial portfolio", "部长职位", "The prime minister reshuffled the cabinet, changing several ministerial portfolios.")
        ],
        "exam_context": [
            ("雅思阅读学术语料（商业类）", "Investment strategies for beginners", "Building a diversified investment portfolio is essential for long-term financial security."),
            ("雅思听力 Section 2（职业类）", "Job application process", "Please submit your portfolio along with your CV to demonstrate your design skills."),
            ("雅思口语 Part 2", "Describe a creative person you know", "She carries her art portfolio to every interview to showcase her illustration skills.")
        ],
        "synonyms_table": "| 维度 | portfolio | collection | folder |\n|------|-----------|------------|--------|\n| 核心义 | 文件夹/作品集 | 收集物 | 文件夹（物理/数字） |\n| 语域 | 商业/艺术/金融 | 通用 | 办公/计算机 |\n| 搭配 | art portfolio, investment portfolio | art collection, stamp collection | file folder, folder |\n| 情感 | 含专业/正式感 | 中性 | 中性 |\n| 差异 | 强调**专业展示** | 强调**收集行为** | 强调**组织功能** |",
        "antonyms": [],
        "memory_anchor": "**谐音锚点**：portfolio = \"波特佛里欧\" → **波特**（Harry Potter）拿着**佛**经**里**的**欧**洲作品集 → portfolio = 作品集\n\n**画面锚点**：想象设计师在面试时展示作品集——portfolio 就是那个\"装满作品的文件夹\"。\n\n**词根锚点**：port-（携带）+ foglio（纸张）→ 携带纸张的东西 = 文件夹。",
        "derivatives": [
            ("portfoliomanager", "n.", "投资组合经理", "The portfolio manager recommended rebalancing the investments."),
            ("portfolio career", "n.", "组合型职业", "A portfolio career allows people to pursue multiple interests.")
        ],
        "word_form_changes": [("portfolio", "n.", "文件夹；作品集；投资组合")]
    },
    {
        "word": "paperback",
        "phonetic": "/ˈpeɪpəbæk/",
        "pos": "n.",
        "cerf": "B1",
        "prototype": "平装书——用软纸封面装订的书籍",
        "extension_dim": "[阅读路径, 经济路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "paper + back (cover)",
        "meanings": [
            "n. ①==**平装书**==（用软纸封面装订的书籍）`paperback edition` [出版]；",
            "n. ②==**平装本**==（与精装本相对）`paperback format` [出版]；"
        ],
        "collocations": [
            ("paperback edition", "平装版", "The paperback edition is much cheaper than the hardcover."),
            ("paperback book", "平装书", "I prefer paperback books because they're lighter to carry."),
            ("paperback novel", "平装小说", "She bought a paperback novel to read on the plane."),
            ("in paperback", "以平装形式", "The bestseller is now available in paperback."),
            ("mass-market paperback", "大众市场平装书", "Mass-market paperbacks are designed to be affordable and portable.")
        ],
        "exam_context": [
            ("雅思阅读学术语料（出版类）", "The publishing industry has evolved significantly", "Paperback books made literature accessible to a wider audience due to their lower cost."),
            ("雅思听力 Section 1（购物类）", "Buying books at a bookstore", "Do you have this title in paperback? The hardcover is too expensive for me."),
            ("雅思口语 Part 2", "Describe a book you've read recently", "I bought the paperback version because it was half the price of the hardcover.")
        ],
        "synonyms_table": "| 维度 | paperback | hardcover | ebook |\n|------|-----------|-----------|-------|\n| 核心义 | 平装书 | 精装书 | 电子书 |\n| 语域 | 出版 | 出版 | 数字出版 |\n| 搭配 | paperback edition, paperback book | hardcover edition, hardback | ebook reader, ebook format |\n| 情感 | 含经济/便携感 | 含正式/收藏感 | 含现代/科技感 |\n| 差异 | 强调**软封面/低价** | 强调**硬封面/高品质** | 强调**数字格式** |",
        "antonyms": ["hardcover（精装书）"],
        "memory_anchor": "**谐音锚点**：paperback = \"佩珀拜克\" → **佩珀**（pepper）**拜**倒在**克**制的平装书下 → paperback = 平装书\n\n**画面锚点**：想象在书店里，平装书整齐地排列在书架上——paperback 就是那个\"轻便便宜的书\"。\n\n**词根锚点**：paper（纸）+ back（背面）→ 纸质封面的书 = 平装书。",
        "derivatives": [
            ("paperback book", "n.", "平装书", "Paperback books are popular among casual readers."),
            ("paperback edition", "n.", "平装版", "The paperback edition was released six months after the hardcover.")
        ],
        "word_form_changes": [("paperback", "n.", "平装书"), ("paperback", "adj.", "平装的")]
    },
    {
        "word": "pamphlet",
        "phonetic": "/ˈpæmflɪt/",
        "pos": "n.",
        "cerf": "B2",
        "prototype": "小册子——介绍信息或宣传的小型印刷品",
        "extension_dim": "[信息路径, 宣传路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "Pamphilus (Latin love poem title)",
        "meanings": [
            "n. ①==**小册子**==（介绍信息或宣传的小型印刷品）`information pamphlet` [出版/宣传]；",
            "n. ②==**宣传册**==（用于推广产品或服务）`promotional pamphlet` [商业]；"
        ],
        "collocations": [
            ("information pamphlet", "信息手册", "The tourist office provides free information pamphlets about local attractions."),
            ("promotional pamphlet", "宣传册", "The company distributed promotional pamphlets at the trade show."),
            ("travel pamphlet", "旅游手册", "She picked up a travel pamphlet from the hotel lobby."),
            ("pamphlet distribution", "小册子分发", "Pamphlet distribution is a cost-effective marketing strategy."),
            ("political pamphlet", "政治宣传册", "During the revolution, political pamphlets were used to spread ideas.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（旅游类）", "Tourist information center", "You can find detailed maps and pamphlets about the local area at the information desk."),
            ("雅思阅读学术语料（历史类）", "The spread of literacy in the 18th century", "Political pamphlets played a crucial role in shaping public opinion during the French Revolution."),
            ("雅思口语 Part 2", "Describe a place you visited as a tourist", "I collected several pamphlets from the museum to learn about the exhibits before my visit.")
        ],
        "synonyms_table": "| 维度 | pamphlet | brochure | leaflet |\n|------|----------|----------|----------|\n| 核心义 | 小册子（信息/宣传） | 宣传册（精美） | 传单（单张） |\n| 语域 | 通用/宣传 | 商业/旅游 | 宣传/分发 |\n| 搭配 | information pamphlet, political pamphlet | travel brochure, sales brochure | leaflet, flyer |\n| 情感 | 中性 | 含精美/正式感 | 含简单/临时感 |\n| 差异 | 强调**信息性小册** | 强调**精美宣传品** | 强调**单张印刷品** |",
        "antonyms": ["book（书籍）", "tome（大部头书）"],
        "memory_anchor": "**谐音锚点**：pamphlet = \"潘菲莱特\" → **潘**金莲**菲**常**莱**看**特**别小册子 → pamphlet = 小册子\n\n**画面锚点**：想象旅游信息台上堆放的小册子——pamphlet 就是那个\"提供信息的小印刷品\"。\n\n**词根锚点**：pamphlet 源自中世纪拉丁语爱情诗标题 Pamphilus——一首广为流传的短诗，后引申为\"小册子\"。",
        "derivatives": [
            ("pamphleteer", "n.", "小册子作者", "Political pamphleteers influenced public opinion during the revolution.")
        ],
        "word_form_changes": [("pamphlet", "n.", "小册子"), ("pamphleteer", "n.", "小册子作者")]
    },
    {
        "word": "tissue",
        "phonetic": "/ˈtɪʃuː/",
        "pos": "n.",
        "cerf": "B2",
        "prototype": "薄纸——柔软易撕的纸张",
        "extension_dim": "[柔软路径, 生物路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "tissu (Old French: woven cloth)",
        "meanings": [
            "n. ①==**纸巾**==（柔软的薄纸，用于擦拭）`facial tissue` [日常]；",
            "n. ②==**薄纸，棉纸**==（用于包装或装饰）`tissue paper` [包装/装饰]；",
            "n. ③==**（生物）组织**==（细胞组成的结构）`muscle tissue` [生物/医学]；",
            "n. ④==**（谎言等的）一套**==（一连串）`a tissue of lies` [文学]；"
        ],
        "collocations": [
            ("facial tissue", "面巾纸", "She grabbed a facial tissue to wipe her nose."),
            ("tissue paper", "薄纸，棉纸", "The gift was wrapped in colorful tissue paper."),
            ("muscle tissue", "肌肉组织", "Exercise helps build and repair muscle tissue."),
            ("tissue damage", "组织损伤", "The injury caused significant tissue damage."),
            ("a tissue of lies", "一派谎言", "The defendant's testimony was a tissue of lies.")
        ],
        "exam_context": [
            ("雅思听力 Section 1（购物类）", "Buying household supplies", "I need to buy a box of tissues for the office."),
            ("雅思阅读学术语料（生物类）", "Human anatomy and physiology", "Different types of tissue perform specialized functions in the body."),
            ("雅思口语 Part 3", "How has healthcare improved in recent years?", "Advances in tissue engineering have made it possible to grow replacement organs for transplant patients.")
        ],
        "synonyms_table": "| 维度 | tissue | napkin | handkerchief |\n|------|--------|--------|--------------|\n| 核心义 | 纸巾（柔软薄纸） | 餐巾纸（用餐时用） | 手帕（可重复使用） |\n| 语域 | 日常/医学 | 餐饮 | 传统/个人 |\n| 搭配 | facial tissue, tissue paper | paper napkin, dinner napkin | cloth handkerchief, silk handkerchief |\n| 情感 | 中性 | 中性 | 含传统/个人感 |\n| 差异 | 强调**柔软薄纸** | 强调**用餐清洁** | 强调**可重复使用** |",
        "antonyms": [],
        "memory_anchor": "**谐音锚点**：tissue = \"提休\" → 感冒时**提**醒**休**息，递纸巾 → tissue = 纸巾\n\n**画面锚点**：想象从纸巾盒里抽出一张柔软的纸巾——tissue 就是那个\"柔软易撕的薄纸\"。\n\n**词根锚点**：tissu 源自古法语\"编织的布\"——薄而柔软的织物，后引申为薄纸和生物组织。",
        "derivatives": [
            ("tissue paper", "n.", "薄纸，棉纸", "The delicate item was wrapped in tissue paper for protection."),
            ("tissue culture", "n.", "组织培养", "Scientists use tissue culture to study cells in the laboratory.")
        ],
        "word_form_changes": [("tissue", "n.", "纸巾；薄纸；组织"), ("tissue", "v.", "用薄纸包装（较少用）")]
    },
    {
        "word": "cover",
        "phonetic": "/ˈkʌvə(r)/",
        "pos": "n./v.",
        "cerf": "A2",
        "prototype": "封面，盖子——覆盖在物体表面的保护层",
        "extension_dim": "[保护路径, 隐藏路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "covrir (Old French: to cover, hide)",
        "meanings": [
            "n. ①==**封面，封皮**==（书的外层）`book cover` [出版]；",
            "n. ②==**盖子，罩**==（容器的覆盖物）`lid cover` [通用]；",
            "n. ③==**掩护，隐蔽**==（保护或隐藏）`take cover` [军事/通用]；",
            "n. ④==**（保险的）覆盖范围**==（保障范围）`insurance cover` [金融]；",
            "v. ⑤==**覆盖，遮盖**==（放在……上面）`cover the table` [通用]；",
            "v. ⑥==**涉及，包含**==（包含在内）`cover the topic` [学术]；",
            "v. ⑦==**报道**==（新闻媒体）`cover the event` [媒体]；",
            "v. ⑧==**支付，负担**==（费用）`cover the cost` [商业]；",
            "v. ⑨==**代替**==（临时替代）`cover for someone` [职场]；"
        ],
        "collocations": [
            ("book cover", "书的封面", "The book cover features a beautiful landscape painting."),
            ("take cover", "躲避，隐蔽", "When it started raining, we took cover under a tree."),
            ("cover the cost", "支付费用", "The scholarship will cover the cost of tuition and books."),
            ("cover story", "封面故事", "The journalist wrote a cover story about the political scandal."),
            ("from cover to cover", "从头到尾", "I read the novel from cover to cover in one sitting.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（教育类）", "Library services", "The library offers protective covers for books to extend their lifespan."),
            ("雅思阅读学术语料（环境类）", "Climate change research", "The report covers a wide range of environmental issues, from deforestation to ocean pollution."),
            ("雅思口语 Part 2", "Describe a book you've read", "The cover of the book caught my eye—it had a minimalist design with bold typography.")
        ],
        "synonyms_table": "| 维度 | cover | lid | cap |\n|------|-------|-----|-----|\n| 核心义 | 覆盖物（保护/封闭） | 盖子（容器口） | 盖子（瓶口/笔帽） |\n| 语域 | 通用/出版 | 容器/厨房 | 容器/文具 |\n| 搭配 | book cover, take cover | lid, pot lid | bottle cap, pen cap |\n| 情感 | 中性 | 中性 | 中性 |\n| 差异 | 强调**广义覆盖** | 强调**容器口封闭** | 强调**小口封闭** |",
        "antonyms": ["uncover（揭开）", "reveal（揭示）", "expose（暴露）"],
        "memory_anchor": "**谐音锚点**：cover = \"卡沃\" → **卡**片**沃**在封面上 → cover = 封面\n\n**画面锚点**：想象一本书的封面——cover 就是那个\"保护和装饰\"的外层。\n\n**词根锚点**：cover 源自古法语 covrir（覆盖、隐藏）——将物体包裹起来。",
        "derivatives": [
            ("coverage", "n.", "覆盖范围；报道", "The news coverage of the event was extensive."),
            ("covering", "n.", "覆盖物", "A light covering of snow fell overnight."),
            ("discover", "v.", "发现", "Scientists discovered a new species in the rainforest."),
            ("recover", "v.", "恢复；收回", "She recovered from her illness within a week.")
        ],
        "word_form_changes": [("cover", "n.", "封面；盖子"), ("cover", "v.", "覆盖；涉及"), ("covered", "adj.", "覆盖的"), ("covering", "n.", "覆盖物"), ("coverage", "n.", "覆盖范围")]
    },
    {
        "word": "Xerox",
        "phonetic": "/ˈzɪərɒks/",
        "pos": "n./v.",
        "cerf": "B2",
        "prototype": "复印件——通过静电印刷技术复制的文件副本",
        "extension_dim": "[复制路径, 品牌路径]",
        "metaphor_type": "转喻",
        "word_root": "xero- (Greek: dry) + -graphy (writing)",
        "meanings": [
            "n. ①==**复印件**==（通过复印机复制的文件）`make a Xerox` [办公]；",
            "n. ②==**施乐公司**==（复印机品牌）`Xerox machine` [品牌]；",
            "v. ③==**复印**==（用复印机复制）`Xerox the document` [办公]；"
        ],
        "collocations": [
            ("Xerox machine", "复印机", "The Xerox machine is in the copy room down the hall."),
            ("Xerox a document", "复印文件", "Could you Xerox this report for the meeting?"),
            ("Xerox copy", "复印件", "Please submit the Xerox copy along with the original."),
            ("Xerox paper", "复印纸", "We need to order more Xerox paper for the office."),
            ("Xerox shop", "复印店", "There's a Xerox shop on the corner that offers cheap printing.")
        ],
        "exam_context": [
            ("雅思听力 Section 1（办公类）", "Office equipment usage", "You can use the Xerox machine to make copies of your documents."),
            ("雅思阅读学术语料（科技类）", "The history of printing technology", "Xerox revolutionized office work by introducing the first plain paper photocopier in 1959."),
            ("雅思口语 Part 2", "Describe a piece of technology that changed your life", "The Xerox machine made it possible to duplicate documents quickly and efficiently.")
        ],
        "synonyms_table": "| 维度 | Xerox | photocopy | copy |\n|------|-------|-----------|------|\n| 核心义 | 复印（品牌名） | 复印（技术名） | 复制（通用） |\n| 语域 | 办公/品牌 | 办公/技术 | 通用/计算机 |\n| 搭配 | Xerox machine, Xerox a document | photocopy, make a photocopy | copy, make a copy |\n| 情感 | 含品牌感 | 含技术感 | 中性 |\n| 差异 | 强调**品牌/静电复印** | 强调**光复制技术** | 强调**通用复制** |",
        "antonyms": ["original（原件）"],
        "memory_anchor": "**谐音锚点**：Xerox = \"泽洛克斯\" → **泽**亮的**洛**阳**克**隆**斯**文件 → Xerox = 复印\n\n**画面锚点**：想象办公室里复印机嗡嗡作响，吐出一份份复印件——Xerox 就是那个\"复制文件的机器\"。\n\n**词根锚点**：xero-（干燥）+ -graphy（书写）→ 干式印刷 = 静电复印。",
        "derivatives": [
            ("Xerox machine", "n.", "复印机", "The office invested in a new high-speed Xerox machine."),
            ("Xerox copy", "n.", "复印件", "Keep a Xerox copy of your passport when traveling abroad.")
        ],
        "word_form_changes": [("Xerox", "n.", "复印件；施乐公司"), ("Xerox", "v.", "复印"), ("Xeroxed", "adj.", "复印的")]
    },
    {
        "word": "duplicate",
        "phonetic": "/ˈdjuːplɪkeɪt/",
        "pos": "n./v./adj.",
        "cerf": "B2",
        "prototype": "副本——与原件完全相同的复制品",
        "extension_dim": "[复制路径, 重复路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "duplicare (Latin: to double)",
        "meanings": [
            "n. ①==**副本，复制品**==（与原件相同）`a duplicate of the key` [通用]；",
            "v. ②==**复制，复印**==（制作相同的复制品）`duplicate the document` [办公/通用]；",
            "v. ③==**重复**==（再次做同样的事）`duplicate the success` [通用]；",
            "adj. ④==**复制的，完全相同的**==（与另一物相同）`duplicate copy` [通用]；"
        ],
        "collocations": [
            ("in duplicate", "一式两份", "Please fill out the form in duplicate."),
            ("duplicate key", "复制的钥匙", "I made a duplicate key for my neighbor."),
            ("duplicate the document", "复制文件", "Could you duplicate this report for the team?"),
            ("exact duplicate", "完全相同的复制品", "The painting was an exact duplicate of the original."),
            ("duplicate effort", "重复劳动", "Let's coordinate to avoid duplicate effort.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（行政类）", "Office procedures", "All contracts must be signed in duplicate—one copy for each party."),
            ("雅思阅读学术语料（科学类）", "DNA replication", "Cells must accurately duplicate their DNA before division to prevent mutations."),
            ("雅思口语 Part 3", "How important is originality in art?", "It's difficult to duplicate the emotional impact of an original artwork.")
        ],
        "synonyms_table": "| 维度 | duplicate | copy | replica |\n|------|-----------|------|----------|\n| 核心义 | 副本（完全相同） | 复制品（通用） | 复制品（精密复制） |\n| 语域 | 正式/通用 | 通用 | 艺术/收藏 |\n| 搭配 | in duplicate, duplicate key | make a copy, copy machine | exact replica, replica watch |\n| 情感 | 含正式感 | 中性 | 含精确/收藏感 |\n| 差异 | 强调**完全相同** | 强调**复制行为** | 强调**精密复制** |",
        "antonyms": ["original（原件）", "unique（唯一的）"],
        "memory_anchor": "**谐音锚点**：duplicate = \"杜普利凯特\" → **杜**甫**普**及**利**用**凯**旋**特**制副本 → duplicate = 副本\n\n**画面锚点**：想象一式两份的文件——duplicate 就是那个\"与原件完全相同的副本\"。\n\n**词根锚点**：duplic-（双，二）+ -ate → 使成双 = 复制。",
        "derivatives": [
            ("duplication", "n.", "复制；重复", "The duplication of effort wasted company resources."),
            ("duplicator", "n.", "复印机", "The old duplicator was replaced by a modern photocopier.")
        ],
        "word_form_changes": [("duplicate", "n.", "副本"), ("duplicate", "v.", "复制"), ("duplicate", "adj.", "复制的"), ("duplication", "n.", "复制")]
    },
    {
        "word": "memorandum",
        "phonetic": "/ˌmeməˈrændəm/",
        "pos": "n.",
        "cerf": "B2",
        "prototype": "备忘录——记录事项以备忘的简短文件",
        "extension_dim": "[记录路径, 沟通路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "memorare (Latin: to remember)",
        "meanings": [
            "n. ①==**备忘录**==（记录事项的简短文件）`write a memorandum` [办公]；",
            "n. ②==**备忘录**==（外交文件）`diplomatic memorandum` [政治/外交]；",
            "n. ③==**法律意见书**==（法律文件）`legal memorandum` [法律]；",
            "n. ④==**（公司的）章程**==（公司内部规定）`memorandum of association` [商业]；"
        ],
        "collocations": [
            ("write a memorandum", "写备忘录", "The manager wrote a memorandum to all staff about the new policy."),
            ("memorandum of understanding", "谅解备忘录", "The two countries signed a memorandum of understanding on trade."),
            ("internal memorandum", "内部备忘录", "Please distribute this internal memorandum to all departments."),
            ("memorandum of association", "公司章程", "The memorandum of association outlines the company's objectives."),
            ("diplomatic memorandum", "外交备忘录", "The ambassador delivered a diplomatic memorandum to the foreign ministry.")
        ],
        "exam_context": [
            ("雅思听力 Section 3（学术讨论类）", "Research project planning", "We need to prepare a memorandum outlining the project's objectives and timeline."),
            ("雅思阅读学术语料（商业类）", "Corporate governance", "The memorandum of association is a legal document that defines a company's relationship with the outside world."),
            ("雅思口语 Part 3", "How do companies communicate important information to employees?", "Many companies use internal memorandums to inform staff about policy changes.")
        ],
        "synonyms_table": "| 维度 | memorandum | memo | note |\n|------|------------|------|------|\n| 核心义 | 备忘录（正式） | 备忘录（简短） | 便条（简短记录） |\n| 语域 | 正式/办公 | 办公/日常 | 日常/通用 |\n| 搭配 | memorandum of understanding, internal memorandum | memo, office memo | note, sticky note |\n| 情感 | 含正式/官方感 | 含简短/实用感 | 含随意/临时感 |\n| 差异 | 强调**正式备忘文件** | 强调**简短提醒** | 强调**简短记录** |",
        "antonyms": [],
        "memory_anchor": "**谐音锚点**：memorandum = \"梅莫兰德姆\" → **梅**花**莫**忘**兰**花**德**行**姆**妈的备忘录 → memorandum = 备忘录\n\n**画面锚点**：想象办公室白板上贴着的备忘录——memorandum 就是那个\"提醒你不要忘记的文件\"。\n\n**词根锚点**：memor-（记忆）+ -andum（必须被……的东西）→ 必须被记住的东西 = 备忘录。",
        "derivatives": [
            ("memo", "n.", "备忘录（简写形式）", "The boss sent a memo about the meeting."),
            ("memoranda", "n.", "备忘录（复数形式）", "Several memoranda were circulated among the staff.")
        ],
        "word_form_changes": [("memorandum", "n.", "备忘录"), ("memo", "n.", "备忘录（简写）"), ("memoranda", "n.", "备忘录（复数）")]
    },
    {
        "word": "glue",
        "phonetic": "/ɡluː/",
        "pos": "n./v.",
        "cerf": "B1",
        "prototype": "胶水——将两个物体粘合在一起的粘性物质",
        "extension_dim": "[粘合路径, 连接路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "glus (Old English: sticky substance)",
        "meanings": [
            "n. ①==**胶水**==（粘合用的粘性物质）`wood glue` [手工/办公]；",
            "n. ②==**胶**==（各种粘合剂）`super glue` [工业/日常]；",
            "v. ③==**粘合，粘贴**==（用胶水固定）`glue the pieces` [手工/办公]；",
            "v. ④==**紧贴，盯住**==（固定不动）`glued to the screen` [口语]；"
        ],
        "collocations": [
            ("wood glue", "木工胶", "Use wood glue to bond the joints together."),
            ("super glue", "超级胶水", "Super glue can bond almost any material instantly."),
            ("glue together", "粘在一起", "She glued the broken vase back together."),
            ("glued to", "紧盯着；离不开", "The children were glued to the television screen."),
            ("glue stick", "胶棒", "The teacher handed out glue sticks for the art project.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（手工类）", "Arts and crafts workshop", "Apply wood glue to the edges and press them together for 30 seconds."),
            ("雅思阅读学术语料（材料科学类）", "Adhesive technology", "Modern adhesives are so strong that they can replace traditional mechanical fasteners in many applications."),
            ("雅思口语 Part 2", "Describe something you made by hand", "I used glue to assemble the model airplane, piece by piece.")
        ],
        "synonyms_table": "| 维度 | glue | adhesive | paste |\n|------|------|----------|-------|\n| 核心义 | 胶水（粘合物质） | 粘合剂（技术术语） | 浆糊（淀粉基） |\n| 语域 | 日常/手工 | 工业/技术 | 手工/办公 |\n| 搭配 | wood glue, super glue | adhesive tape, industrial adhesive | paste, wallpaper paste |\n| 情感 | 中性 | 含技术感 | 含传统/手工感 |\n| 差异 | 强调**通用胶水** | 强调**技术性粘合** | 强调**传统浆糊** |",
        "antonyms": ["separate（分离）", "detach（拆开）"],
        "memory_anchor": "**谐音锚点**：glue = \"格鲁\" → **格**外**鲁**莽地涂胶水 → glue = 胶水\n\n**画面锚点**：想象用胶水把两块木头粘在一起——glue 就是那个\"粘合者\"。\n\n**词根锚点**：glue 古英语本义就是\"粘性物质\"——从动物骨头熬制的胶。",
        "derivatives": [
            ("gluey", "adj.", "胶质的；粘的", "The gluey substance stuck to everything it touched."),
            ("glue gun", "n.", "热熔胶枪", "A glue gun is useful for craft projects."),
            ("glue stick", "n.", "胶棒", "She used a glue stick to attach the photos to the scrapbook.")
        ],
        "word_form_changes": [("glue", "n.", "胶水"), ("glue", "v.", "粘合"), ("glued", "adj.", "粘住的"), ("gluey", "adj.", "胶质的")]
    },
    {
        "word": "ink",
        "phonetic": "/ɪŋk/",
        "pos": "n.",
        "cerf": "B1",
        "prototype": "墨水——用于书写的液体颜料",
        "extension_dim": "[书写路径, 印刷路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "encaustum (Latin: purple ink)",
        "meanings": [
            "n. ①==**墨水**==（用于书写的液体颜料）`black ink` [书写/印刷]；",
            "n. ②==**油墨**==（用于印刷）`printing ink` [印刷]；",
            "n. ③==**墨汁**==（乌贼等分泌的液体）`squid ink` [生物/烹饪]；"
        ],
        "collocations": [
            ("ink cartridge", "墨盒", "The printer needs a new ink cartridge."),
            ("ink stain", "墨水渍", "She got an ink stain on her white shirt."),
            ("ink pad", "印台", "The rubber stamp was pressed onto the ink pad."),
            ("printer ink", "打印机墨水", "Printer ink can be quite expensive."),
            ("invisible ink", "隐形墨水", "The spy wrote the message in invisible ink.")
        ],
        "exam_context": [
            ("雅思听力 Section 1（购物类）", "Buying office supplies", "I need to order a set of ink cartridges for the printer."),
            ("雅思阅读学术语料（历史类）", "The history of writing", "The invention of ink was crucial for the development of writing and printing."),
            ("雅思口语 Part 2", "Describe a piece of technology you use daily", "The ink in my pen allows me to write smoothly on paper.")
        ],
        "synonyms_table": "| 维度 | ink | dye | pigment |\n|------|-----|-----|----------|\n| 核心义 | 墨水（书写用） | 染料（染色用） | 颜料（绘画用） |\n| 语域 | 书写/印刷 | 纺织/染色 | 艺术/工业 |\n| 搭配 | ink cartridge, ink stain | dye, hair dye | pigment, natural pigment |\n| 情感 | 中性 | 中性 | 中性 |\n| 差异 | 强调**书写/印刷** | 强调**染色功能** | 强调**着色功能** |",
        "antonyms": [],
        "memory_anchor": "**谐音锚点**：ink = \"印刻\" → **印**章**刻**上墨水 → ink = 墨水\n\n**画面锚点**：想象钢笔尖上滴落的墨水——ink 就是那个\"书写用的液体颜料\"。\n\n**词根锚点**：ink 源自拉丁语 encaustum（紫色墨水）——古罗马用于书写的紫色液体。",
        "derivatives": [
            ("inky", "adj.", "墨水般的；漆黑的", "The inky blackness of the night sky was filled with stars."),
            ("inkwell", "n.", "墨水池", "The antique desk had a built-in inkwell."),
            ("inkjet", "n.", "喷墨", "Inkjet printers are popular for home use.")
        ],
        "word_form_changes": [("ink", "n.", "墨水"), ("ink", "v.", "用墨水写（较少用）"), ("inky", "adj.", "墨水般的")]
    },
    {
        "word": "rubber",
        "phonetic": "/ˈrʌbə(r)/",
        "pos": "n./adj.",
        "cerf": "B1",
        "prototype": "橡皮——用于擦除铅笔痕迹的柔软材料",
        "extension_dim": "[擦除路径, 弹性路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "rub (to erase) + -er",
        "meanings": [
            "n. ①==**橡皮**==（用于擦除铅笔痕迹）`pencil rubber` [文具]；",
            "n. ②==**橡胶**==（弹性材料）`natural rubber` [材料/工业]；",
            "n. ③==**橡胶制品**==（用橡胶制成的东西）`rubber gloves` [日常]；",
            "adj. ④==**橡胶制的**==（由橡胶制成）`rubber band` [日常]；"
        ],
        "collocations": [
            ("rubber band", "橡皮筋", "She tied her hair back with a rubber band."),
            ("rubber glove", "橡胶手套", "Wear rubber gloves when handling chemicals."),
            ("rubber stamp", "橡皮图章", "The document received the rubber stamp of approval."),
            ("rubber duck", "橡皮鸭", "The child played with a rubber duck in the bathtub."),
            ("natural rubber", "天然橡胶", "Natural rubber is harvested from rubber trees.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（办公类）", "Office supplies inventory", "We need to reorder rubber bands and paper clips for the office."),
            ("雅思阅读学术语料（材料科学类）", "Sustainable materials", "Rubber trees provide a renewable source of natural rubber for various industries."),
            ("雅思口语 Part 2", "Describe a useful object in your home", "I always keep a rubber band on my desk to organize loose papers.")
        ],
        "synonyms_table": "| 维度 | rubber | eraser | elastic |\n|------|--------|--------|----------|\n| 核心义 | 橡皮/橡胶 | 橡皮（擦除工具） | 松紧带（弹性材料） |\n| 语域 | 文具/材料 | 文具 | 服装/日常 |\n| 搭配 | rubber band, rubber glove | eraser, pencil eraser | elastic band, elastic waistband |\n| 情感 | 中性 | 中性 | 中性 |\n| 差异 | 强调**材料/通用** | 强调**擦除功能** | 强调**弹性功能** |",
        "antonyms": [],
        "memory_anchor": "**谐音锚点**：rubber = \"拉伯\" → **拉**伸**伯**爵的橡皮筋 → rubber = 橡胶\n\n**画面锚点**：想象用橡皮擦除铅笔痕迹——rubber 就是那个\"擦除错误\"的工具。\n\n**词根锚点**：rub（擦）+ -er（做……的工具）→ 用来擦的工具 = 橡皮。",
        "derivatives": [
            ("rubberize", "v.", "给……涂橡胶", "The fabric was rubberized to make it waterproof."),
            ("rubbery", "adj.", "橡胶似的", "The overcooked meat had a rubbery texture."),
            ("rubber tree", "n.", "橡胶树", "Rubber trees are grown in tropical regions for their latex.")
        ],
        "word_form_changes": [("rubber", "n.", "橡皮；橡胶"), ("rubber", "adj.", "橡胶制的"), ("rubbery", "adj.", "橡胶似的")]
    },
    {
        "word": "scissors",
        "phonetic": "/ˈsɪzəz/",
        "pos": "n.",
        "cerf": "A2",
        "prototype": "剪刀——两片刀片交叉的切割工具",
        "extension_dim": "[切割路径, 分离路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "cisoria (Latin: cutting instrument)",
        "meanings": [
            "n. ①==**剪刀**==（两片刀片交叉的切割工具）`a pair of scissors` [文具/日常]；",
            "n. ②==**（体操）剪式动作**==（双腿交叉的动作）`scissors kick` [体育]；"
        ],
        "collocations": [
            ("a pair of scissors", "一把剪刀", "She picked up a pair of scissors to cut the ribbon."),
            ("scissors kick", "剪刀踢", "The footballer scored with a spectacular scissors kick."),
            ("scissors paper stone", "石头剪刀布", "They played scissors paper stone to decide who goes first."),
            ("scissors and paste", "剪刀加浆糊（拼凑）", "The report was just scissors and paste from various sources."),
            ("scissors sharpener", "磨刀器", "Use a scissors sharpener to keep the blades sharp.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（手工类）", "Arts and crafts instructions", "Use scissors to cut the paper along the dotted line."),
            ("雅思阅读学术语料（设计类）", "Design tools and techniques", "Precision scissors are essential for detailed cutting in graphic design."),
            ("雅思口语 Part 2", "Describe a tool you often use", "I use scissors almost every day at work to open packages and cut materials.")
        ],
        "synonyms_table": "| 维度 | scissors | shears | clippers |\n|------|----------|--------|----------|\n| 核心义 | 剪刀（小型） | 大剪刀（园艺用） | 修剪器（指甲/毛发） |\n| 语域 | 文具/日常 | 园艺/裁缝 | 个人护理 |\n| 搭配 | a pair of scissors, scissors kick | garden shears, hedge shears | nail clippers, hair clippers |\n| 情感 | 中性 | 中性 | 中性 |\n| 差异 | 强调**小型切割** | 强调**大型修剪** | 强调**精细修剪** |",
        "antonyms": [],
        "memory_anchor": "**谐音锚点**：scissors = \"斯泽斯\" → **斯**文地**泽**亮地**斯**开剪刀 → scissors = 剪刀\n\n**画面锚点**：想象两片刀片交叉开合——scissors 就是那个\"剪切工具\"。\n\n**词根锚点**：scissors 源自拉丁语 cisoria（切割工具）——用于切割的双刃工具。",
        "derivatives": [
            ("scissor", "v.", "剪（较少用）", "She scissored the article out of the newspaper."),
            ("scissor-like", "adj.", "剪刀状的", "The bird's scissor-like tail helps it maneuver in flight.")
        ],
        "word_form_changes": [("scissors", "n.", "剪刀"), ("scissor", "v.", "剪"), ("scissored", "adj.", "剪开的")]
    },
    {
        "word": "shear",
        "phonetic": "/ʃɪə(r)/",
        "pos": "v./n.",
        "cerf": "B2",
        "prototype": "剪切——用剪刀或类似工具切割",
        "extension_dim": "[切割路径, 变形路径]",
        "metaphor_type": "功能隐喻",
        "word_root": "sceran (Old English: to cut)",
        "meanings": [
            "v. ①==**剪切，剪**==（用剪刀切割）`shear the wool` [纺织/农业]；",
            "v. ②==**修剪**==（修剪树枝或篱笆）`shear the hedge` [园艺]；",
            "v. ③==**剥夺**==（剥夺某物）`shear of power` [文学]；",
            "n. ④==**剪刀**==（大剪刀，常用复数 shears）`a pair of shears` [工具]；",
            "n. ⑤==**剪切力**==（物理学概念）`shear stress` [物理]；"
        ],
        "collocations": [
            ("shear the sheep", "剪羊毛", "The farmer shears the sheep once a year."),
            ("shear off", "剪掉；断裂", "The bolt sheared off under extreme pressure."),
            ("shear force", "剪切力", "The bridge was designed to withstand shear forces."),
            ("shear stress", "剪切应力", "Engineers calculate shear stress when designing structures."),
            ("a pair of shears", "一把大剪刀", "He used a pair of shears to trim the bushes.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（农业类）", "Farm operations", "Shearing sheep requires skill to avoid injuring the animal."),
            ("雅思阅读学术语料（工程类）", "Structural engineering", "Shear stress can cause materials to deform or fail under load."),
            ("雅思口语 Part 2", "Describe a traditional craft in your country", "Wool production begins with shearing the sheep to obtain the raw material.")
        ],
        "synonyms_table": "| 维度 | shear | cut | trim |\n|------|-------|-----|------|\n| 核心义 | 剪切（用剪刀） | 切割（通用） | 修剪（使整齐） |\n| 语域 | 农业/工程 | 通用 | 园艺/个人护理 |\n| 搭配 | shear the sheep, shear force | cut paper, cut costs | trim the hedge, trim hair |\n| 情感 | 中性 | 中性 | 中性 |\n| 差异 | 强调**剪切动作** | 强调**通用切割** | 强调**修剪整齐** |",
        "antonyms": ["grow（生长）"],
        "memory_anchor": "**谐音锚点**：shear = \"希尔\" → **希**望**尔**等用剪刀剪羊毛 → shear = 剪切\n\n**画面锚点**：想象牧羊人用大剪刀剪羊毛——shear 就是那个\"剪切\"的动作。\n\n**词根锚点**：shear 古英语本义就是\"剪、切\"——用刃具分割。",
        "derivatives": [
            ("shears", "n.", "大剪刀", "Garden shears are used for trimming hedges."),
            ("shearer", "n.", "剪羊毛的人", "The skilled shearer could shear a sheep in minutes.")
        ],
        "word_form_changes": [("shear", "v.", "剪切"), ("shear", "n.", "剪切力"), ("shears", "n.", "大剪刀"), ("shorn", "adj.", "剪过的")]
    },
    {
        "word": "edge",
        "phonetic": "/edʒ/",
        "pos": "n./v.",
        "cerf": "A2",
        "prototype": "边缘——物体的边界或边沿",
        "extension_dim": "[边界路径, 优势路径]",
        "metaphor_type": "结构隐喻",
        "word_root": "ecg (Old English: sharpness, blade)",
        "meanings": [
            "n. ①==**边缘，边**==（物体的边界）`edge of the table` [通用]；",
            "n. ②==**刀口，刃**==（刀的锋利部分）`sharp edge` [工具]；",
            "n. ③==**优势**==（有利条件）`competitive edge` [商业]；",
            "n. ④==**（情感的）强烈程度**==（紧张或兴奋感）`edge of excitement` [情感]；",
            "v. ⑤==**缓慢移动**==（侧身移动）`edge towards` [通用]；",
            "v. ⑥==**给……加边**==（装饰边缘）`edge the border` [装饰]；"
        ],
        "collocations": [
            ("edge of the cliff", "悬崖边", "They stood at the edge of the cliff, looking down at the ocean."),
            ("competitive edge", "竞争优势", "Innovation gives the company a competitive edge in the market."),
            ("on edge", "紧张不安", "She was on edge before the job interview."),
            ("edge out", "险胜", "The team edged out their rivals by one point."),
            ("cutting edge", "前沿的，尖端的", "The company is at the cutting edge of technology.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（旅游类）", "Scenic viewpoints", "Please stay behind the safety barrier at the edge of the canyon."),
            ("雅思阅读学术语料（商业类）", "Business strategy", "Companies must innovate to maintain a competitive edge in the global market."),
            ("雅思口语 Part 3", "What qualities make a successful entrepreneur?", "Having a cutting edge approach to technology can give a startup a significant advantage.")
        ],
        "synonyms_table": "| 维度 | edge | border | margin |\n|------|------|--------|--------|\n| 核心义 | 边缘（物体边界） | 边界（区域分界） | 页边空白 |\n| 语域 | 通用 | 地理/政治 | 出版/商业 |\n| 搭配 | edge of the table, cliff edge | border, national border | margin, profit margin |\n| 情感 | 中性 | 中性 | 中性 |\n| 差异 | 强调**物体边沿** | 强调**区域分界** | 强调**空白/余量** |",
        "antonyms": ["center（中心）", "middle（中间）"],
        "memory_anchor": "**谐音锚点**：edge = \"埃奇\" → **埃**菲尔铁塔的**奇**特边缘 → edge = 边缘\n\n**画面锚点**：想象站在悬崖边往下看——edge 就是那个\"危险的边界\"。\n\n**词根锚点**：edge 古英语本义是\"锋利\"——刀刃的锋利边缘，后引申为物体的边界。",
        "derivatives": [
            ("edgy", "adj.", "紧张不安的；前卫的", "The edgy design appealed to young consumers."),
            ("edging", "n.", "边缘装饰", "The garden had beautiful stone edging."),
            ("edgeless", "adj.", "无边缘的", "The edgeless design created a seamless look.")
        ],
        "word_form_changes": [("edge", "n.", "边缘；刃"), ("edge", "v.", "缓慢移动；加边"), ("edgy", "adj.", "紧张的；前卫的"), ("edging", "n.", "边缘装饰")]
    },
    {
        "word": "rim",
        "phonetic": "/rɪm/",
        "pos": "n./v.",
        "cerf": "B2",
        "prototype": "边缘——圆形物体的外沿",
        "extension_dim": "[边界路径, 框架路径]",
        "metaphor_type": "结构隐喻",
        "word_root": "rima (Old English: edge, border)",
        "meanings": [
            "n. ①==**边缘，轮圈**==（圆形物体的外沿）`rim of the wheel` [机械/通用]；",
            "n. ②==**眼镜框**==（眼镜的边框）`glasses rim` [日常]；",
            "n. ③==**篮筐**==（篮球的篮圈）`basketball rim` [体育]；",
            "n. ④==**（容器的）口沿**==（杯子的边缘）`rim of the cup` [通用]；",
            "v. ⑤==**给……装边框**==（装饰边缘）`rimmed with gold` [装饰]；",
            "v. ⑥==**环绕**==（围绕边缘）`trees rimmed the lake` [文学]；"
        ],
        "collocations": [
            ("rim of the wheel", "轮圈", "The car's alloy rims were polished to a mirror finish."),
            ("glasses rim", "眼镜框", "He adjusted the rim of his glasses before reading."),
            ("basketball rim", "篮筐", "The ball bounced off the rim and missed the basket."),
            ("rim shot", "敲边击", "The drummer played a rim shot for emphasis."),
            ("gold-rimmed", "金边的", "She drank from a gold-rimmed teacup.")
        ],
        "exam_context": [
            ("雅思听力 Section 2（体育类）", "Basketball court facilities", "The basketball rim is positioned 10 feet above the floor."),
            ("雅思阅读学术语料（天文学类）", "Lunar craters", "The rim of the crater was clearly visible through the telescope."),
            ("雅思口语 Part 2", "Describe a piece of jewelry or accessory", "His glasses had thin titanium rims that were almost invisible.")
        ],
        "synonyms_table": "| 维度 | rim | edge | brim |\n|------|-----|------|------|\n| 核心义 | 圆形物体边缘 | 物体边缘 | 容器上沿 |\n| 语域 | 机械/体育 | 通用 | 容器/帽子 |\n| 搭配 | rim of the wheel, basketball rim | edge of the table, cliff edge | brim of the hat, cup brim |\n| 情感 | 中性 | 中性 | 中性 |\n| 差异 | 强调**圆形边缘** | 强调**通用边沿** | 强调**容器/帽子上沿** |",
        "antonyms": ["center（中心）", "middle（中间）"],
        "memory_anchor": "**谐音锚点**：rim = \"瑞姆\" → **瑞**士手表的**姆**指边缘 → rim = 边缘\n\n**画面锚点**：想象篮球砸在篮筐边缘弹开——rim 就是那个\"圆形的边\"。\n\n**词根锚点**：rim 古英语本义就是\"边缘、边框\"——圆形物体的外沿。",
        "derivatives": [
            ("rimless", "adj.", "无边框的", "She preferred rimless glasses for a minimalist look."),
            ("rimmed", "adj.", "有边框的", "The red-rimmed eyes showed she had been crying.")
        ],
        "word_form_changes": [("rim", "n.", "边缘；轮圈"), ("rim", "v.", "装边框；环绕"), ("rimmed", "adj.", "有边框的"), ("rimless", "adj.", "无边框的")]
    },
    {
        "word": "element",
        "phonetic": "/ˈelɪmənt/",
        "pos": "n.",
        "cerf": "B1",
        "prototype": "元素——构成事物的基本成分",
        "extension_dim": "[组成路径, 基本路径]",
        "metaphor_type": "结构隐喻",
        "word_root": "elementum (Latin: first principle, element)",
        "meanings": [
            "n. ①==**元素**==（化学元素）`chemical element` [科学]；",
            "n. ②==**要素，成分**==（构成整体的部分）`key element` [通用/学术]；",
            "n. ③==**部件，元件**==（机器的组成部分）`heating element` [工程]；",
            "n. ④==**（环境的）自然力**==（风雨等）`brave the elements` [文学]；",
            "n. ⑤==**（数学中的）元素**==（集合中的成员）`set element` [数学]；",
            "n. ⑥==**适应的环境**==（适合的环境）`in one's element` [通用]；"
        ],
        "collocations": [
            ("chemical element", "化学元素", "Oxygen is a chemical element essential for life."),
            ("key element", "关键要素", "Communication is a key element of successful teamwork."),
            ("heating element", "加热元件", "The heating element in the kettle needs to be replaced."),
            ("in one's element", "在适合的环境中", "She's in her element when teaching young children."),
            ("brave the elements", "冒着风雨", "The hikers braved the elements to reach the summit.")
        ],
        "exam_context": [
            ("雅思阅读学术语料（科学类）", "The periodic table", "The periodic table organizes chemical elements by their atomic number."),
            ("雅思听力 Section 3（学术讨论类）", "Research methodology", "The survey includes several elements that measure customer satisfaction."),
            ("雅思口语 Part 3", "What are the essential elements of a good education?", "Critical thinking is a key element that should be included in every curriculum.")
        ],
        "synonyms_table": "| 维度 | element | component | factor |\n|------|---------|-----------|--------|\n| 核心义 | 元素/成分 | 组成部分 | 因素 |\n| 语域 | 科学/通用 | 工程/通用 | 研究/通用 |\n| 搭配 | chemical element, key element | component, machine component | factor, contributing factor |\n| 情感 | 中性 | 中性 | 中性 |\n| 差异 | 强调**基本构成** | 强调**部件功能** | 强调**影响因素** |",
        "antonyms": ["compound（化合物）", "whole（整体）"],
        "memory_anchor": "**谐音锚点**：element = \"埃利门特\" → **埃**及**利**用**门**特**殊**元素建造金字塔 → element = 元素\n\n**画面锚点**：想象化学元素周期表——element 就是那个\"构成万物的基本单位\"。\n\n**词根锚点**：element 源自拉丁语 elementum（第一原理、基本成分）——构成事物的基础。",
        "derivatives": [
            ("elemental", "adj.", "基本的；元素的", "Water is an elemental force of nature."),
            ("elementary", "adj.", "初级的；基本的", "The elementary school teaches basic reading and math skills."),
            ("elements", "n.", "自然力；基础", "The building was exposed to the elements for years.")
        ],
        "word_form_changes": [("element", "n.", "元素；要素"), ("elemental", "adj.", "基本的"), ("elementary", "adj.", "初级的"), ("elements", "n.", "自然力（复数）")]
    }
]

def generate_markdown(vocab):
    """Generate markdown content for a vocabulary word"""
    # Build meanings string
    meanings_str = "\n".join(vocab["meanings"])
    
    # Build collocations string
    collocations_str = ""
    for eng, chn, example in vocab["collocations"]:
        collocations_str += f"- **{eng}**：{chn}\n  - *{example}*\n"
    
    # Build exam context string
    exam_str = ""
    for context_type, question, answer in vocab["exam_context"]:
        if answer:
            exam_str += f"- **{context_type}**：*{question}*\n  - {answer}\n"
        else:
            exam_str += f"- **{context_type}**：*{question}*\n"
    
    # Build antonyms string
    antonyms_str = "\n".join([f"- **{a}**" for a in vocab["antonyms"]])
    
    # Build derivatives string
    derivatives_str = ""
    for word, pos, meaning, example in vocab["derivatives"]:
        derivatives_str += f"- **{word}** ({pos}) — {meaning}\n  - *{example}*\n"
    
    # Build word form changes string
    word_form_str = ""
    for word, pos, meaning in vocab["word_form_changes"]:
        word_form_str += f"- **{word}** ({pos}) — {meaning}\n"
    
    # Generate full markdown
    markdown = f"""---
title: "{vocab['word']}"
tags:
  - 学习/英语/雅思
  - 语义场/物品材料/文具办公用品
aliases: []
date: 2026-05-31
word_freq: 雅思词汇
semantic_field: 文具/办公用品
prototype: {vocab['prototype']}
extension_dim: {vocab['extension_dim']}
phonetic: "{vocab['phonetic']}"
pos: {vocab['pos']}
metaphor_type: {vocab['metaphor_type']}
word_root: "{vocab['word_root']}"
network_activation: [词根, 同义辨析, 派生词族]
last_review: 2026-05-31
review_count: 0
---

# {vocab['word']}

> [!info] 基础信息
> **音标** {vocab['phonetic']} | **词级** 雅思词汇 | **语义场** [[文具/办公用品]] | **CERF** {vocab['cerf']}

## 核心释义

{meanings_str}

> [!tip] 原型义
> **原型义**：{vocab['prototype']}
> **延伸维度**：{vocab['extension_dim']}
> **隐喻类型**：{vocab['metaphor_type']}

## 词根词缀

{vocab['word_root']}

**叙事**：{vocab['word']}-词根词缀叙事待补充。

---

## 词义链路

> [!abstract]- 词义链路法
> 以"**{vocab['prototype']}**"为统筹中心，沿{vocab['extension_dim']}向外扩展：
>
> 1. **{vocab['prototype']}**（基本层面）
>    - → **核心义延伸**
>      - 激活条件：相关搭配和语境

### 统筹（选择适用的模式）

- **一字一词概括**：{vocab['word']} 就是"{vocab['prototype']}"
- **延伸中心**：从基本义向相关概念延伸

> [!check]- 链路验证
> - [x] **可逆性**：从延伸义能反向推导到原型义
> - [x] **可统筹**：一句话——"{vocab['word']} 就是{vocab['prototype']}"

---

## 搭配与短语

{collocations_str}

## 真题/语料关联

{exam_str}

---

## 同义词辨析

{vocab['synonyms_table']}

---

## 反义词

{antonyms_str}

---

## 记忆锚点

{vocab['memory_anchor']}

---

## 派生词链接

{derivatives_str}

---

## 词性转换

{word_form_str}"""
    
    return markdown

def main():
    output_dir = r"D:\Notes\app\新建文件夹\vocab-observatory-local\data\ielts-vocabulary\物品材料"
    
    for vocab in vocab_list:
        filename = f"{vocab['word']}.md"
        filepath = os.path.join(output_dir, filename)
        
        content = generate_markdown(vocab)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Generated: {filename}")
    
    print(f"\nTotal: {len(vocab_list)} files generated.")

if __name__ == "__main__":
    main()