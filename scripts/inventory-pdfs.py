"""Read-only PDF text inventory. Originals are never edited."""
from pathlib import Path
from pypdf import PdfReader
import re, json, concurrent.futures, hashlib

root=Path(__file__).resolve().parents[1]
out=root/'tmp/library-sources'
out.mkdir(parents=True,exist_ok=True)
files=[p for p in (root.parent/'剑雅').glob('*.pdf') if '21' not in p.name]
def extract(p):
    reader=PdfReader(p)
    rows=[]
    for i,page in enumerate(reader.pages):
        text=page.extract_text() or ''
        (out/(p.stem+f'-{i+1:03}.txt')).write_text(text)
        if re.search(r'READING\s*PASSAGE|Reading\s*Passage',text,re.I):
            rows.append({'page':i+1,'text':text[:650]})
    info={'file':p.name,'pages':len(reader.pages),'sha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest(),'readings':rows}
    (out/(p.stem+'.json')).write_text(json.dumps(info,ensure_ascii=False,indent=2))
    print(json.dumps({'file':p.name,'pages':len(reader.pages),'readingPages':[r['page'] for r in rows],'sample':rows[:1]},ensure_ascii=False),flush=True)
    return info
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    infos=list(pool.map(extract,files))
(out/'inventory.json').write_text(json.dumps(infos,ensure_ascii=False,indent=2))
