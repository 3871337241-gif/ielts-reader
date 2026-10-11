"""Build reading-only library from local OCR boxes. Preserve provenance and reference images."""
from pathlib import Path
import json,re,statistics,csv,hashlib,unicodedata
root=Path(__file__).resolve().parents[1]
load=lambda p:json.loads(Path(p).read_text())
inventory=load(root/'tmp/library-sources/inventory.json')
word_re=re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]+(?:[-’'][A-Za-zÀ-ÖØ-öø-ÿĀ-ž]+)*")
key=lambda w:''.join(c for c in unicodedata.normalize('NFKD',w.lower().replace("'",'’')) if not unicodedata.combining(c))
basic=set('a an the and or but if as so nor yet for of to in on at by with from into onto upon over under through about before after between among than that this these those i you he she it we they me him her us them my your his its our their who whom whose which what whatever some any each every both either neither all no not do does did be am is are was were been being have has had will would shall should can could may might must also only very'.split())

corrections=load(root/'scripts/ocr-corrections.json')['pages']
section_specs=load(root/'scripts/paragraph-sections.json')

def clean_rows(data,book):
    if book==20 and data.get('wholeLines'):
        data={**data,'lines':data['wholeLines'],'twoColumns':False}
    if book==20:data={**data,'singleColumn':True}
    lines=[dict(x) for x in data['lines'] if not x['text'].lower().startswith('facebook.com/ieltsvn') and not (re.fullmatch(r'(?:Test\s*[1-8Il]|Reading|READING|\d{1,3})',x['text'],re.I) and (x['y']<.12 or x['y']>.88))]
    # Book 16 is scanned with wide outer margins: its printed page numbers sit
    # around y=.79, inside the usual footer threshold. Keep numerical article
    # content, and remove only that book's matching isolated page number.
    if book==16:
        lines=[x for x in lines if not (x['text']==str(data['page']) and .75<x['y']<.83)]
    left=[x for x in lines if x['x']<.45 and x['width']<.55 and len(x['text'].split())>3]
    right=[x for x in lines if x['x']>.48 and len(x['text'].split())>3]
    if data.get('twoColumns'):
        cut=data['headerCut'];gutter=data['gutter']
        if data.get('wholeLines'):
            left_rows=sorted([r for r in lines if r['x']<gutter*.72 and r['y']>=cut],key=lambda r:r['y'])
            # A prose column has adjacent lines at the same left margin. Keep full-width
            # titles/subtitles from the original page OCR above that first prose line.
            prose=next((r for r,n in zip(left_rows,left_rows[1:]) if len(r['text'].split())>=4 and .005<n['y']-r['y']<.029 and abs(n['x']-r['x'])<.045),None)
            if prose and prose['y']<.52:
                cut=prose['y']-.003
            cut={(5,63):.359}.get((book,data['page']),cut)
            prefix=[dict(x,page=data['page']) for x in data['wholeLines'] if x['y']<cut and not (re.fullmatch(r'(?:Test\s*[1-8Il]|Reading|READING|\d{1,3})',x['text'],re.I) and (x['y']<.12 or x['y']>.88))]
        else:prefix=[x for x in lines if x['y']<cut]
        remaining=[x for x in lines if x['y']>=cut]
        lines=sorted(prefix,key=lambda x:(x['y'],x['x']))+sorted([x for x in remaining if x['x']<gutter],key=lambda x:(x['y'],x['x']))+sorted([x for x in remaining if x['x']>=gutter],key=lambda x:(x['y'],x['x']))
    elif len(left)>7 and len(right)>7 and not data.get('singleColumn'):
        top=[x for x in lines if x['width']>.55 or (x['y']<min(y['y'] for y in left) and x['height']>.012)]
        cut=max([x['y']+x['height'] for x in top if x['y']<.4],default=0)
        prefix=[x for x in lines if x['y']<=cut]
        remaining=[x for x in lines if x['y']>cut]
        lines=sorted(prefix,key=lambda x:(x['y'],x['x']))+sorted([x for x in remaining if x['x']<.49],key=lambda x:(x['y'],x['x']))+sorted([x for x in remaining if x['x']>=.49],key=lambda x:(x['y'],x['x']))
    else: lines.sort(key=lambda x:(round(x['y'],3),x['x']))
    correction=corrections.get(f'{book}:{data["page"]}',{})
    lines=[r for r in lines if r['text'] not in correction.get('remove',[])]
    for change in correction.get('replace',[]):
        for r in lines:
            if r['text'].startswith(change['starts']):r['text']=change['text']
    for extra in correction.get('insert',[]):
        index=next((i for i,r in enumerate(lines) if r['text'].startswith(extra['after'])),None)
        if index is not None:lines.insert(index+1,{k:v for k,v in extra.items() if k!='after'})
    # A standalone section letter can sit a few pixels below the first prose line.
    for i in range(1,len(lines)):
        r,prev=lines[i],lines[i-1]
        if re.fullmatch(r'[A-Z](?:\s+[\dIl|]+)?',r['text']) and abs(r['y']-prev['y'])<.014 and r['x']<prev['x']:
            lines[i-1],lines[i]=r,prev
    if book==20:lines=[r for r in lines if not re.fullmatch(r'\d{1,2}\s*[|]?',r['text'])]
    for row in lines: row['page']=data['page']
    return lines

def start_number(text):
    m=re.fullmatch(r'READING\s+PASSAGE\s+([1-3Il])\.?',text,re.I) or re.fullmatch(r'Test\s*[1-4]\s*[-:]?\s*reading\s*[- ]?\s*passage\s*([1-3])',text,re.I)
    return (1 if m[1] in 'Il' else int(m[1])) if m else None
def is_question(text):
    if re.match(r'^(?:Reading Passage [1-3] has|List of (?:Headings|Experts|People)|Choose (?:the correct|TWO|ONE)|Write (?:the correct|your answers)|Complete (?:the|each))',text,re.I):return True
    return bool(re.match(r'^[•·]?\s*Questions?\s*\d+\s*(?:[-–—−]|and\b)',text,re.I))
def join_rows(rows):
    text=' '.join(x['text'] for x in rows)
    text=re.sub(r'\s+([,;:.!?])',r'\1',text)
    return re.sub(r'\s+',' ',text).strip()
def sentences(text,pid):
    # Keep abbreviations and decimal points in the same sentence.
    pieces=re.split(r'(?<=[.!?])\s+(?=[‘“\"\']?[A-Z])',text)
    out=[]
    for piece in pieces:
        if out and re.search(r'(?:\b(?:Dr|Mr|Mrs|Ms|Prof|St|vs|e\.g|i\.e)|\b[A-Z])\.$',out[-1]):out[-1]+=' '+piece
        else:out.append(piece)
    return [{'id':f'{pid}{i+1}' if pid.isalpha() and len(pid)==1 else f'{pid}_{i+1}','text':t} for i,t in enumerate(out) if t]
articles=[];renders=[];errors=[];debug_starts={}
boundary_file=root/'scripts/article-boundaries.json'
boundaries=load(boundary_file) if boundary_file.exists() else {}
for info in inventory:
    filename=info['file'];book=int(re.search(r'【(\d+)】',filename)[1]) if '【' in filename else (20 if '剑20' in filename else 19)
    fixed_test=int(re.search(r'Test(\d)',filename)[1]) if book==20 else None
    directory=root/'tmp/ocr'/(str(book)+(f'-{fixed_test}' if fixed_test else ''))
    pages={int(p.stem):clean_rows(load(p),book) for p in directory.glob('*.json')}
    starts=[(page,i,start_number(row['text'])) for page,rows in sorted(pages.items()) for i,row in enumerate(rows) if start_number(row['text'])]
    test=0
    for page,idx,passage in starts:
        if passage==1:test+=1
        actual_test=fixed_test or test+(4 if book==12 else 0)
        aid=f'c{book}-t{actual_test}-p{passage}'
        if actual_test<=0:errors.append(f'{aid} missing preceding passage');continue
        rows=pages[page][idx+1:]
        # Only the examination timing instruction is removed here. Heading questions
        # have their own 'below' lines and must never be mistaken for this instruction.
        if rows and re.match(r'^You should spend',rows[0]['text'],re.I):
            rows=rows[1:]
            while rows and (re.match(r'^(?:below|on the following pages|(?:Reading )?Passage\s+[1-3])',rows[0]['text'],re.I)):
                rows=rows[1:]
        first_page=page
        preamble=bool(rows and is_question(rows[0]['text']))
        if preamble:
            # The next printed page starts the passage; keep title and every paragraph.
            first_page=page+1;rows=pages.get(first_page,[])
        body=[];end=False
        for current in range(first_page,first_page+6):
            current_rows=rows if current==first_page else pages.get(current,[])
            if current!=first_page and not current_rows:break
            for row in current_rows:
                if is_question(row['text']) or start_number(row['text']):end=True;break
                # Printed test footer/header is not article text.
                if re.fullmatch(r'(?:Test\s*[1-8Il]|Reading|READING|\d{1,3})',row['text'],re.I) and (row['y']<.12 or row['y']>.88):continue
                body.append(row)
            if end:break
        if not body:errors.append(aid+' empty');continue
        debug_starts[aid]={'page':first_page,'rows':body[:24]}
        normal=statistics.median([r['height'] for r in body if len(r['text'].split())>5])
        def label_of(r):
            t=r['text']
            return re.fullmatch(r'([A-Z])(?:\s+[\dIl|]+)?',t) or re.match(r'^([A-Z])\s+\S',t)
        section_spec=section_specs.get(aid)
        labelled=bool(section_spec) or len(set(m[1] for r in body if (m:=label_of(r)) and m[1] in 'BCDEFGH'))>=2
        first_label=next((i for i,r in enumerate(body) if (m:=label_of(r)) and m[1]=='A'),None) if labelled else None
        if section_spec:
            a_start=section_spec['sections'][0]
            first_label=next((i for i,r in enumerate(body) if r['page']==a_start['page'] and r['text']==a_start['starts']),None)
        if first_label is not None and first_label<9:
            first=first_label
        else:
            # A heading is larger than prose or inset from the prose's left margin.
            # A later sentence beginning 'A ...' is not a paragraph label.
            first=next((i for i,(r,n) in enumerate(zip(body,body[1:])) if len(r['text'].split())>=4 and r['height']<=normal*1.4 and r['page']==n['page'] and .004<n['y']-r['y']<normal*2.5 and abs(n['x']-r['x'])<.06),0)
        while first>0 and re.fullmatch(r'[A-Z](?:\s+[lI|])?',body[first-1]['text']):first-=1
        spec=boundaries.get(aid,{})
        first=spec.get('bodyStart',first)
        title_rows=body[:first]
        heading_rows=body[:spec.get('titleLines',first)]
        subtitle_rows=body[spec.get('titleLines',first):first]
        title=join_rows(heading_rows)
        if not title:title=f'Reading Passage {passage}'
        body=body[first:]
        # Vision can split one physical line into left/right fragments. Put those
        # fragments in horizontal order, without changing any recognised words.
        merged=[];remaining=list(body)
        while remaining:
            r=remaining.pop(0)
            if remaining:
                n=remaining[0]
                same_line=r['page']==n['page'] and abs(r['y']-n['y'])<min(r['height'],n['height'])*.45
                separated=r['x']+r['width']<=n['x']+.008 or n['x']+n['width']<=r['x']+.008
                gutter=re.fullmatch(r'[A-Z](?:\s+[\dIl|]+)?',r['text']) or re.fullmatch(r'[A-Z](?:\s+[\dIl|]+)?',n['text'])
                section_edge=section_spec and any(v['page']==line['page'] and line['text'].startswith(v['starts']) for v in section_spec['sections'] for line in [r,n])
                if same_line and separated and not gutter and not section_edge:
                    remaining.pop(0);left,right=sorted([r,n],key=lambda v:v['x'])
                    r={**left,'text':left['text']+' '+right['text'],'width':max(v['x']+v['width'] for v in [r,n])-left['x'],'y':min(r['y'],n['y']),'height':max(r['height'],n['height'])}
            merged.append(r)
        body=merged
        paragraphs=[];current=[];label=None;prev=None
        height_steps=[b['y']-a['y'] for a,b in zip(body,body[1:]) if a['page']==b['page'] and 0<b['y']-a['y']<.06]
        step=statistics.median(height_steps) if height_steps else normal*1.5
        def flush():
            global current,label
            if current:
                text=join_rows(current)
                pid=f'P{len(paragraphs)+1}'
                paragraphs.append({'id':pid,'label':label or str(len(paragraphs)+1),'sentences':sentences(text,pid)})
                current=[]
        section_starts={(s['page'],s['starts']):s for s in section_spec['sections']} if section_spec else {}
        matched=[]
        for r in body:
            t=r['text'];section=next((v for (page,prefix),v in section_starts.items() if r['page']==page and t.startswith(prefix)),None)
            if section:
                flush();label=section['label'];matched.append(label)
                r=dict(r)
                if section['strip']:r['text']=re.sub(r'^[A-Z•]\s+','',t,count=1)
            elif section_spec and re.fullmatch(r'[A-Z](?:\s+[\dIl|]+)?',t):
                # The first prose line is the recorded section anchor. Discard the
                # separate printed gutter glyph, never a sentence initial.
                prev=r;continue
            elif not labelled and spec.get('paragraphStarts') and any(r['page']==v['page'] and t.startswith(v['starts']) for v in spec['paragraphStarts']):
                flush();label=None
            elif not labelled and not spec.get('paragraphStarts') and prev and prev['page']==r['page'] and r['y']>prev['y'] and r['y']-prev['y']>step*1.24:
                flush();label=None
            current.append(r);prev=r
        if section_spec and matched!=list('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[:ord(section_spec['end'])-64]):
            errors.append(f'{aid} section anchors did not match: {matched}')
        flush()
        # An existing fully checked passage retains its hand-verified sentences.
        curated=aid=='c13-t3-p3'
        if curated:
            original=load(root/'content/c13-t3-p3/article.json');title=original['title'];paragraphs=original['paragraphs']
            for p in paragraphs:p['label']=p['id']
        count=len(word_re.findall(' '.join(s['text'] for p in paragraphs for s in p['sentences'])))
        if count<400 or count>1600:errors.append(f'{aid} unusual words {count}')
        all_source=title_rows+body
        used=sorted(set(r['page'] for r in all_source))
        source_parts=[{'page':p,'top':min(r['y'] for r in all_source if r['page']==p),'bottom':max(r['y']+r['height'] for r in all_source if r['page']==p)} for p in used]
        a={'id':aid,'book':book,'test':actual_test,'passage':passage,'title':title,'subtitle':original.get('subtitle','') if curated else join_rows(subtitle_rows), 'paragraphs':paragraphs,'wordCount':count,'source':{'file':filename,'filePages':used,'sha256':info['sha256'],'method':'逐句核对' if curated else '扫描原书整理','sectionLabels':list('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[:ord(section_spec['end'])-64]) if section_spec else [],'image':f'content/originals/{aid}.jpg'},'notes':[]}
        articles.append(a)
        renders.append({'pdf':str(root.parent/'剑雅'/filename),'parts':source_parts,'output':str(root/'content/originals'/f'{aid}.jpg')})


raw={}
with (root/'tmp/dictionary/ecdict.csv').open(newline='') as f:
    for row in csv.DictReader(f):
        word=key(row['word'])
        if re.fullmatch(r"[a-z]+(?:[-’][a-z]+)*",word):raw[word]=row
# Remove a printed line break within a word only when the joined dictionary form exists.
def unfold(text):
    return re.sub(r'([A-Za-z]+)-\s+([a-z]+)',lambda m:m[1]+m[2] if key(m[1]+m[2]) in raw else m[0],text)
for a in articles:
    if a['id']=='c20-t1-p1':
        a['title']='The kākāpō'
        a['subtitle']=re.sub(r'k[āäa]k[āäa]p[ōõóo]', 'kākāpō',a['subtitle'],flags=re.I)
        for p in a['paragraphs']:
            for sentence in p['sentences']:sentence['text']=re.sub(r'k[āäa]k[āäa]p[ōõóo]',lambda m:'Kākāpō' if m[0][0].isupper() else 'kākāpō',sentence['text'],flags=re.I)
    if a['id']=='c20-t1-p2':a['notes'].append('提供的扫描页标题只保留了“to Britain”，未猜测补全。')
    if a['id']=='c13-t3-p3':continue
    a['title']=unfold(a['title']);a['subtitle']=unfold(a['subtitle'])
    for p in a['paragraphs']:
        for s in p['sentences']:s['text']=unfold(s['text'])
    a['wordCount']=len(word_re.findall(' '.join(s['text'] for p in a['paragraphs'] for s in p['sentences'])))

forms=set(key(w) for a in articles for w in word_re.findall(a['title']+' '+a['subtitle']+' '+' '.join(s['text'] for p in a['paragraphs'] for s in p['sentences'])))
def lemma(form):
    row=raw.get(form);exchanges=dict(x.split(':',1) for x in row.get('exchange','').split('/') if ':' in x) if row else {}
    base=key(exchanges.get('0',''))
    if base in raw:return base
    if form.endswith('’s') and form[:-2] in raw:return form[:-2]
    return form
lexicon={}
for form in sorted(forms):
    base=lemma(form);row=raw.get(base) or raw.get(form)
    if row:
        translation=row['translation'].replace('\\n','\n').strip()
        definition=row['definition'].replace('\\n','\n').strip()
        translation=re.sub(r'\n\[网络\].*','',translation,flags=re.S)
        if base=='kakapo':definition=''  # Historical dictionary definition conflicts with this passage's flightless bird.
        lexicon[form]={'lemma':base,'commonZh':translation[:2400],'pos':row['pos'] or ' / '.join(dict.fromkeys(re.findall(r'(?:^|\n)([a-z]+)\.',translation))) or '词典未标注','definition':definition[:1800],'basic':form in basic,'verified':bool(translation)}
    else:lexicon[form]={'lemma':form.removesuffix('’s'),'commonZh':'词库未收录此词形；请结合原句在词典核对。','pos':'未核实','definition':'','basic':form in basic,'verified':False}

library={'version':3,'range':[4,20],'articles':[],'books':[],'dictionarySource':{'name':'ECDICT','url':'https://github.com/skywind3000/ECDICT','license':'MIT'}}
for book in range(4,21):
    group=sorted([a for a in articles if a['book']==book],key=lambda a:(a['test'],a['passage']))
    for a in group:
        library['articles'].append({k:a[k] for k in ['id','book','test','passage','title','wordCount','source']})
    library['books'].append({'number':book,'count':len(group),'tests':sorted(set(a['test'] for a in group)),'path':f'content/book-{book}.json'})
    (root/f'content/book-{book}.json').write_text(json.dumps({'book':book,'articles':{a['id']:a for a in group}},ensure_ascii=False,separators=(',',':')))
(root/'content/library.json').write_text(json.dumps(library,ensure_ascii=False,separators=(',',':')))
(root/'content/lexicon.json').write_text(json.dumps(lexicon,ensure_ascii=False,separators=(',',':')))
(root/'tmp/render-manifest.json').write_text(json.dumps(renders,ensure_ascii=False))
(root/'verification/library-build.json').write_text(json.dumps({'articles':len(articles),'forms':len(forms),'dictionaryCovered':sum(v['verified'] for v in lexicon.values()),'errors':errors,'books':[{"book":b['number'],"count":b['count']} for b in library['books']]},ensure_ascii=False,indent=2))
print(json.dumps(load(root/'verification/library-build.json'),ensure_ascii=False,indent=2))
(root/'tmp/library-summary.txt').write_text('\n'.join(f'{a["id"]}: {a["title"]} | {a["wordCount"]} words | {len(a["paragraphs"])} paragraphs | {a["source"]["filePages"]}' for a in sorted(articles,key=lambda a:(a['book'],a['test'],a['passage']))))

(root/'tmp/article-starts.json').write_text(json.dumps(debug_starts,ensure_ascii=False,indent=2))
