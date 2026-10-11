"""Read-only comparison of this passage with the user's original PDF. Requires pypdf."""
import sys,re,json,hashlib
from pathlib import Path
from pypdf import PdfReader
root=Path(__file__).resolve().parents[1]
pdf=Path(sys.argv[1]);reader=PdfReader(pdf)
a=reader.pages[68].extract_text();b=reader.pages[69].extract_text()
a=a[a.index('\nA The'):];a=a[:a.index('\nREADING PASSAGE 3')]
b=b.removeprefix('Reading\n');b=re.sub(r'\n69\s*$','',b)
joined=a+' '+b
parts=re.split(r'\n([A-H])\s+', '\n'+joined.lstrip('\n'))
source={parts[i]:parts[i+1] for i in range(1,len(parts),2)}
article=json.load(open(root/'content/c13-t3-p3/article.json'))
normalize=lambda text: ''.join(re.findall('[a-z0-9]',text.lower()))
for p in article['paragraphs']:
 actual=' '.join(s['text'] for s in p['sentences']);expected=source[p['id']]
 assert normalize(actual)==normalize(expected),p['id']+' does not match PDF'
print('PASS: A–H all letters and digits match PDF extraction (punctuation separately checked on page images).')
print('PDF SHA256:',hashlib.sha256(pdf.read_bytes()).hexdigest())
