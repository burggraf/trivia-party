#!/bin/bash
echo "Counting lines of code..."
echo -e "----------------------------------------------------------"

# Count Svelte files
svelte_files=$(find src -name "*.svelte" -type f | wc -l)
svelte_lines=$(find src -name "*.svelte" -type f -exec cat {} \; | wc -l)
printf "%-30s %5d files, %8d lines\n" "Svelte files:" $svelte_files $svelte_lines

# Count TypeScript files
ts_files=$(find src -name "*.ts" -type f | wc -l)
ts_lines=$(find src -name "*.ts" -type f -exec cat {} \; | wc -l)
printf "%-30s %5d files, %8d lines\n" "TypeScript files:" $ts_files $ts_lines

# Count HTML files
ht_files=$(find src -name "*.html" -type f | wc -l)
ht_lines=$(find src -name "*.html" -type f -exec cat {} \; | wc -l)
printf "%-30s %5d files, %8d lines\n" "HTML files:" $ht_files $ht_lines

# Count CSS files
cs_files=$(find src -name "*.css" -type f | wc -l)
cs_lines=$(find src -name "*.css" -type f -exec cat {} \; | wc -l)
printf "%-30s %5d files, %8d lines\n" "CSS files:" $cs_files $cs_lines

# Count Edge Function files
sb_files=$(find supabase -name "*.ts" -type f | wc -l)
sb_lines=$(find supabase -name "*.ts" -type f -exec cat {} \; | wc -l)
printf "%-30s %5d files, %8d lines\n" "Supabase Edge Function files:" $sb_files $sb_lines

# Count JavaScript files
js_files=$(find src -name "*.js" -type f | wc -l)
js_lines=$(find src -name "*.js" -type f -exec cat {} \; | wc -l)
printf "%-30s %5d files, %8d lines\n" "JavaScript files:" $js_files $js_lines

# Count Bash files
bash_files=$(find . -name "*.sh" -type f | wc -l)
bash_lines=$(find . -name "*.sh" -type f -exec cat {} \; | wc -l)
printf "%-30s %5d files, %8d lines\n" "Bash files:" $bash_files $bash_lines

# Count SQL files
sql_files=$(find data -name "*.sql" -type f | wc -l)
sql_lines=$(find data -name "*.sql" -type f -exec cat {} \; | wc -l)
printf "%-30s %5d files, %8d lines\n" "SQL files:" $sql_files $sql_lines

# Count TOML files
toml_files=$(find . -name "*.toml" -type f | wc -l)
toml_lines=$(find . -name "*.toml" -type f -exec cat {} \; | wc -l)
printf "%-30s %5d files, %8d lines\n" "TOML files:" $toml_files $toml_lines

# Count JSON files
json_files=$(ls *.json 2>/dev/null | wc -l)
json_lines=$(cat *.json 2>/dev/null | wc -l)
printf "%-30s %5d files, %8d lines\n" "JSON files:" $json_files $json_lines

# Calculate totals
total_files=$((svelte_files + ts_files + js_files + bash_files + sql_files + sb_files + toml_files + json_files + ht_files + cs_files))
total_lines=$((svelte_lines + ts_lines + js_lines + bash_lines + sql_lines + sb_lines + toml_lines + json_lines + ht_lines + cs_lines))
echo -e "----------------------------------------------------------"
printf "%-30s %5d files, %8d lines\n" "Total:" $total_files $total_lines
