import re

with open('lib/words.ts', 'rb') as f:
    data = f.read()

# Find the start of 'const fetchPublicWordRowsUncached = unstable_cache('
start_marker = b'const fetchPublicWordRowsUncached = unstable_cache('
start = data.find(start_marker)
print('start found at', start)

# Find the end: search forward for the pattern after the options block
# Look for the closing ');\n' after the tags array
search_start = start + len(start_marker)
end_marker = b'[PUBLIC_CACHE_TAGS.wordIndex],\n  },\n);\n'
end = data.find(end_marker, search_start)
print('end found at', end, 'len marker', len(end_marker))

if start == -1 or end == -1:
    print('NOT FOUND, trying fallback')
    # Fallback: find start and then search for the next ');\n' after a line with just '  },'
    sub = data[start:]
    # Search for the pattern
    m = re.search(rb'\[PUBLIC_CACHE_TAGS\.wordIndex\],\n  \},\n\);\n', sub)
    if m:
        end = start + m.end()
        print('fallback end at', end)
    else:
        print('FALLBACK ALSO FAILED')
        exit(1)
else:
    end = end + len(end_marker)

old_block = data[start:end]
print('old block length:', len(old_block))

new_block = b'''async function fetchPublicWordRowsUncachedImpl(): Promise<CachedPublicWordIndexRecord[]> {
  const supabase = getPublicSupabaseClientOrNull();
  if (!supabase) {
    throw new Error("Public Supabase client not configured");
  }

  return await withTransientPublicReadRetry("public word index", async () => {
    const PAGE_SIZE = 500;
    const accumulated: BareSlimPublicWordIndexRow[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("words")
        .select(WORD_INDEX_SELECT)
        .eq("is_published", true)
        .eq("is_deleted", false)
        .order("lemma")
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) {
        throw error;
      }
      const rows = (data ?? []) as unknown as BareSlimPublicWordIndexRow[];
      accumulated.push(...rows);
      if (rows.length < PAGE_SIZE) {
        break;
      }
      offset += PAGE_SIZE;
    }

    return accumulated.map(toCachedPublicWordIndexRecord);
  });
}

// Use React cache() instead of unstable_cache() because the full word
// index (~3.2 MB) exceeds Next.js's 2 MB per-entry unstable_cache limit.
const fetchPublicWordRowsUncached = cache(fetchPublicWordRowsUncachedImpl);
'''

new_data = data[:start] + new_block + data[end:]

with open('lib/words.ts', 'wb') as f:
    f.write(new_data)

print('Done! Replaced', len(old_block), 'bytes with', len(new_block), 'bytes')
