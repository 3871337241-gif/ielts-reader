"""Run local OCR only. No network calls or PDF mutations."""
from pathlib import Path
import re,json,subprocess,concurrent.futures
root=Path(__file__).resolve().parents[1]
inventory=json.load(open(root/'tmp/library-sources/inventory.json'))
def run(info):
    filename=info['file']
    book=int(re.search(r'【(\d+)】',filename)[1]) if '【' in filename else (20 if '剑20' in filename else 19)
    test=int(re.search(r'Test(\d)',filename)[1]) if book==20 else 0
    destination=root/'tmp/ocr'/(str(book)+(f'-{test}' if test else ''))
    if info['readings']:
        pages=set()
        for row in info['readings']:
            if row['page']>110: continue
            text=(root/'tmp/library-sources'/(Path(filename).stem+f'-{row["page"]:03}.txt')).read_text()
            if re.search(r'READING\s+PASSAGE',text,re.I):
                pages.update(range(row['page'],min(row['page']+4,info['pages']+1)))
        page_range=','.join(map(str,sorted(pages)))
    else: page_range=f'1-{info["pages"]}' if book==20 else ('1-108' if book==9 else '14-108')
    proc=subprocess.run([str(root/'tmp/ocr-pdf'),str(root.parent/'剑雅'/filename),str(destination),page_range],capture_output=True,text=True)
    log=root/'tmp/ocr'/(destination.name+'.log');log.write_text(proc.stdout+proc.stderr)
    print(f'{filename}: {len(list(destination.glob("*.json")))} OCR pages, exit {proc.returncode}',flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool: list(pool.map(run,inventory))
