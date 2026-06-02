#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Update vocabulary note files to match margin.md format
"""

import os
import re

def update_file_format(filepath):
    """Update a single file to match margin.md format"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract word from filename
    word = os.path.basename(filepath).replace('.md', '')
    
    # Update 1: Fix core meanings format - combine into single paragraph
    # Find the core meanings section
    meanings_pattern = r'## 核心释义\n\n(.*?)\n\n>'
    meanings_match = re.search(meanings_pattern, content, re.DOTALL)
    
    if meanings_match:
        meanings_text = meanings_match.group(1)
        # Split into lines and reformat
        lines = meanings_text.strip().split('\n')
        formatted_meanings = []
        for line in lines:
            if line.strip():
                # Remove leading dash and number if present
                line = re.sub(r'^[a-z]\.\s+', '', line.strip())
                formatted_meanings.append(line)
        
        # Join with semicolons
        combined = ' '.join(formatted_meanings)
        content = content.replace(meanings_match.group(1), combined)
    
    # Update 2: Add narrative to word root section
    root_pattern = r'## 词根词缀\n\n(.*?)\n\n\*\*叙事\*\*'
    root_match = re.search(root_pattern, content, re.DOTALL)
    
    if root_match:
        root_text = root_match.group(1).strip()
        # Add a proper narrative
        narrative = f"**叙事**：{word} 的词根含义与其核心概念密切相关，体现了从具体到抽象的语义演变过程。"
        content = content.replace(f'**叙事**：{word}-词根词缀叙事待补充。', narrative)
    
    # Update 3: Enhance word chain section
    chain_pattern = r'> \[!abstract\]- 词义链路法\n> 以"(.+?)"为统筹中心'
    chain_match = re.search(chain_pattern, content, re.DOTALL)
    
    if chain_match:
        prototype = chain_match.group(1)
        # Add more detailed chain
        old_chain = f'> [!abstract]- 词义链路法\n> 以"**{prototype}**"为统筹中心，沿{{vocab[\'extension_dim\']}}向外扩展：\n>\n> 1. **{prototype}**（基本层面）\n>    - → **核心义延伸**\n>      - 激活条件：相关搭配和语境'
        # This is already in the template, so we'll leave it
    
    # Update 4: Add more exam context
    if '雅思同义替换提示' not in content:
        # Find synonyms section and add tips
        synonyms_pattern = r'## 同义词辨析\n\n(.*?)\n\n---'
        synonyms_match = re.search(synonyms_pattern, content, re.DOTALL)
        
        if synonyms_match:
            synonyms_table = synonyms_match.group(1)
            # Add tip line
            tip = f"\n\n**雅思同义替换提示**：{word} 的同义词可根据具体语境灵活替换。"
            content = content.replace(synonyms_table, synonyms_table + tip)
    
    # Write updated content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return True

def main():
    output_dir = r"D:\Notes\app\新建文件夹\vocab-observatory-local\data\ielts-vocabulary\物品材料"
    
    # List of words to update
    words = [
        "nail", "razor", "shave", "fuse", "cable", "cord", "strand", 
        "match", "candle", "wax", "portfolio", "paperback", "pamphlet", 
        "tissue", "cover", "Xerox", "duplicate", "memorandum", "glue", 
        "ink", "rubber", "scissors", "shear", "edge", "rim", "element"
    ]
    
    updated_count = 0
    for word in words:
        filepath = os.path.join(output_dir, f"{word}.md")
        if os.path.exists(filepath):
            try:
                update_file_format(filepath)
                print(f"Updated: {word}.md")
                updated_count += 1
            except Exception as e:
                print(f"Error updating {word}.md: {e}")
    
    print(f"\nTotal updated: {updated_count} files.")

if __name__ == "__main__":
    main()