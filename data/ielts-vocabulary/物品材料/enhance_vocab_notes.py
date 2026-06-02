#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhance vocabulary note files with more detailed content
"""

import os
import re

# Enhanced narratives for each word
enhanced_narratives = {
    "nail": "nail 的原始画面是古代工匠的作坊——地上散落着各种尺寸的金属钉。这些\"钉子\"虽然简单，却是建造房屋、固定家具的关键。后来人们发现，\"钉子\"的形状与手指的\"指甲\"相似——都是细长、坚硬、一端尖锐的物体。nail 从\"金属固定物\"延伸到\"身体部位\"，体现了\"形状相似\"的转喻思维。",
    
    "razor": "razor 的原始画面是理发师的工作台——上面摆着各种锋利的刀片。这些\"刀片\"虽然危险，却是保持整洁的必需品。razor 的词根 ras-（刮、擦）揭示了它的核心功能：通过刮除来创造光滑的表面。从手动剃刀到电动剃须刀，razor 始终是\"个人护理\"的象征。",
    
    "shave": "shave 的原始画面是清晨的浴室——男人对着镜子用剃须刀刮胡子。这个\"刮\"的动作看似简单，却包含了\"去除\"和\"光滑\"的双重含义。shave 从\"刮胡子\"延伸到\"削减\"——就像刮去多余的毛发，我们也可以\"刮去\"多余的时间或成本。",
    
    "fuse": "fuse 的原始画面是电气工程师的工作台——上面放着各种规格的保险丝。这些\"保险丝\"虽然细小，却是电路安全的守护者。当电流过载时，保险丝会\"熔断\"——牺牲自己来保护整个电路。fuse 从\"安全装置\"延伸到\"融合\"——就像熔化的金属融合在一起。",
    
    "cable": "cable 的原始画面是海底电缆铺设船——巨大的卷轴上缠绕着数千公里的电缆。这些\"电缆\"虽然笨重，却是连接世界的纽带。cable 从\"物理连接\"延伸到\"信息传输\"——就像电缆传输电力，它也传输电视信号和互联网数据。",
    
    "cord": "cord 的原始画面是登山者的背包——里面塞满了各种粗细的绳索。这些\"绳索\"虽然简单，却是生命安全的保障。cord 从\"物理连接\"延伸到\"电气连接\"——就像绳索连接人与安全点，电线连接电器与电源。",
    
    "strand": "strand 的原始画面是纺织厂的纺锤——上面缠绕着无数根细线。这些\"线\"虽然纤细，却是编织布料的基础。strand 从\"物理线\"延伸到\"抽象线\"——就像一根线是布料的一部分，一个 strand 是故事或论点的一部分。",
    
    "match": "match 的原始画面是厨房的火柴盒——里面整齐地排列着小木棍。这些\"火柴\"虽然微小，却能点燃火焰。match 从\"点火工具\"延伸到\"匹配\"——就像火柴头与火柴盒的摩擦产生火焰，两个相配的事物产生和谐。",
    
    "candle": "candle 的原始画面是中世纪的教堂——烛光摇曳，照亮了黑暗的空间。这些\"蜡烛\"虽然简单，却是光明和希望的象征。candle 从\"照明工具\"延伸到\"浪漫氛围\"——就像蜡烛驱散黑暗，它也创造了温馨和浪漫。",
    
    "wax": "wax 的原始画面是养蜂人的作坊——地上堆满了蜂蜡块。这些\"蜡\"虽然普通，却是制作蜡烛、保护木材的材料。wax 从\"物理材料\"延伸到\"变化过程\"——就像月亮从新月到满月的\"变圆\"，事物也可以\"变得\"更加繁荣或衰落。",
    
    "portfolio": "portfolio 的原始画面是艺术家的画室——墙上挂满了装着作品的文件夹。这些\"文件夹\"虽然普通，却是展示才华的窗口。portfolio 从\"物理容器\"延伸到\"抽象集合\"——就像文件夹装着作品，投资组合装着各种资产。",
    
    "paperback": "paperback 的原始画面是书店的书架——上面整齐地排列着各种平装书。这些\"平装书\"虽然便宜，却是普及知识的重要载体。paperback 从\"物理形式\"延伸到\"经济价值\"——就像平装书让更多人能够买得起书，它也代表了\"经济实惠\"的理念。",
    
    "pamphlet": "pamphlet 的原始画面是革命时期的街头——人们分发着小册子宣传新思想。这些\"小册子\"虽然简单，却是传播思想的利器。pamphlet 从\"信息载体\"延伸到\"宣传工具\"——就像小册子传播信息，它也传播观点和主张。",
    
    "tissue": "tissue 的原始画面是女士的手提包——里面放着柔软的纸巾。这些\"纸巾\"虽然轻薄，却是日常生活的必需品。tissue 从\"物理材料\"延伸到\"生物组织\"——就像纸巾是薄而柔软的，生物组织也是由薄而柔软的细胞组成。",
    
    "cover": "cover 的原始画面是图书馆的书架——上面摆满了各种封面的书籍。这些\"封面\"虽然只是装饰，却是保护内容的屏障。cover 从\"物理保护\"延伸到\"抽象覆盖\"——就像封面保护书页，保险覆盖风险，新闻报道覆盖事件。",
    
    "Xerox": "Xerox 的原始画面是办公室的复印机——嗡嗡作响，吐出一份份复印件。这个\"复印\"过程虽然机械，却是信息复制的革命。Xerox 从\"品牌名称\"延伸到\"通用动作\"——就像人们说\"复印\"时可能用\"Xerox\"，品牌名称变成了通用动词。",
    
    "duplicate": "duplicate 的原始画面是行政办公室——职员在制作一式两份的文件。这些\"副本\"虽然相同，却是法律效力的保障。duplicate 从\"物理复制\"延伸到\"抽象重复\"——就像文件可以复制，成功也可以\"复制\"。",
    
    "memorandum": "memorandum 的原始画面是公司会议室——经理在分发备忘录。这些\"备忘录\"虽然简短，却是沟通的重要工具。memorandum 从\"记录工具\"延伸到\"沟通方式\"——就像备忘录记录事项，它也传达了公司的决策和指示。",
    
    "glue": "glue 的原始画面是手工匠人的工作台——上面摆满了各种粘合剂。这些\"胶水\"虽然普通，却是连接物体的纽带。glue 从\"物理粘合\"延伸到\"抽象连接\"——就像胶水粘合物体，它也可以\"粘合\"人与人之间的关系。",
    
    "ink": "ink 的原始画面是古代书法家的书案——上面放着墨汁和毛笔。这些\"墨水\"虽然简单，却是记录文明的载体。ink 从\"书写工具\"延伸到\"印刷材料\"——就像墨水记录文字，油墨印刷书籍，它们都是知识的传播者。",
    
    "rubber": "rubber 的原始画面是热带橡胶园——工人们在割胶。这些\"橡胶\"虽然普通，却是现代工业的重要材料。rubber 从\"物理材料\"延伸到\"功能工具\"——就像橡胶可以擦除铅笔痕迹，它也可以制成各种弹性制品。",
    
    "scissors": "scissors 的原始画面是裁缝的工作台——上面放着各种尺寸的剪刀。这些\"剪刀\"虽然简单，却是裁剪布料的利器。scissors 从\"切割工具\"延伸到\"分离手段\"——就像剪刀分离布料，它也可以\"分离\"纸张或其他材料。",
    
    "shear": "shear 的原始画面是牧羊人的羊圈——他在用大剪刀剪羊毛。这个\"剪切\"动作虽然简单，却是获取羊毛的必要步骤。shear 从\"物理剪切\"延伸到\"抽象剥夺\"——就像剪刀剪去羊毛，命运也可以\"剪去\"人的权力或财富。",
    
    "edge": "edge 的原始画面是悬崖边——人们站在边缘俯瞰深渊。这个\"边缘\"虽然危险，却是观察风景的最佳位置。edge 从\"物理边界\"延伸到\"抽象优势\"——就像悬崖边缘提供了最佳视角，竞争优势提供了最佳市场位置。",
    
    "rim": "rim 的原始画面是篮球场——球员们在篮筐下激烈争抢。这个\"篮筐\"虽然只是金属圈，却是比赛的目标。rim 从\"物理边缘\"延伸到\"框架结构\"——就像篮筐是篮球的框架，眼镜框是镜片的框架。",
    
    "element": "element 的原始画面是化学实验室——科学家们在研究元素周期表。这些\"元素\"虽然微小，却是构成万物的基础。element 从\"化学元素\"延伸到\"基本要素\"——就像化学元素构成物质，基本要素构成系统或理论。"
}

def enhance_file(filepath, word):
    """Enhance a single file with more detailed content"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace generic narrative with enhanced one
    if word in enhanced_narratives:
        old_narrative_pattern = r'\*\*叙事\*\*：.+?。'
        new_narrative = f"**叙事**：{enhanced_narratives[word]}"
        content = re.sub(old_narrative_pattern, new_narrative, content)
    
    # Enhance word chain section with more specific examples
    # This would require more complex parsing, so we'll leave it for now
    
    return content

def main():
    output_dir = r"D:\Notes\app\新建文件夹\vocab-observatory-local\data\ielts-vocabulary\物品材料"
    
    # List of words to enhance
    words = [
        "nail", "razor", "shave", "fuse", "cable", "cord", "strand", 
        "match", "candle", "wax", "portfolio", "paperback", "pamphlet", 
        "tissue", "cover", "Xerox", "duplicate", "memorandum", "glue", 
        "ink", "rubber", "scissors", "shear", "edge", "rim", "element"
    ]
    
    enhanced_count = 0
    for word in words:
        filepath = os.path.join(output_dir, f"{word}.md")
        if os.path.exists(filepath):
            try:
                enhanced_content = enhance_file(filepath, word)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(enhanced_content)
                print(f"Enhanced: {word}.md")
                enhanced_count += 1
            except Exception as e:
                print(f"Error enhancing {word}.md: {e}")
    
    print(f"\nTotal enhanced: {enhanced_count} files.")

if __name__ == "__main__":
    main()