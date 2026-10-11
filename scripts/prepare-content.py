import json,re,hashlib,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
original=json.load(open(sys.argv[1]))
paragraphs=original['paragraphs']
# Visual comparison against PDF file pages 69–70 (printed 68–69).
paragraphs[0]['text']=paragraphs[0]['text'].replace(' - ', ' – ')
paragraphs[1]['text']='‘'+paragraphs[1]['text']
paragraphs[2]['text']=paragraphs[2]['text'].replace("'It",'‘It').replace(',’said',',’ said')
paragraphs[4]['text']=paragraphs[4]['text'].replace(' - ',' – ').replace("'We",'‘We')
paragraphs[6]['text']=paragraphs[6]['text'].replace("Singh's",'Singh’s')
article={k:original[k] for k in ['id','title','subtitle']}
article['id']='c13-t3-p3'
article['instruction']='You should spend about 20 minutes on Questions 27–40, which are based on Reading Passage 3 below.'
article['paragraphs']=[]
for p in paragraphs:
 sentences=[x.strip() for x in re.findall(r'[^.!?]+[.!?][’”\']?|[^.!?]+$',p['text']) if x.strip()]
 assert ' '.join(sentences)==p['text']
 article['paragraphs'].append({'id':p['id'],'sentences':[{'id':p['id']+str(i+1),'text':s} for i,s in enumerate(sentences)]})
article['source']={'book':'Cambridge IELTS 13 Academic','test':3,'passage':3,'printedPages':[68,69], 'pdfPages':[69,70], 'sha256':'f6bbbbf97633bc8dfd71f11b68b8fff4da607cbe2408cfebdbe54cf05c6b18cf','checked':'2026-10-11','method':'原始 PDF 文字提取与六页逐页图像核对；修复提取引号、连接号与空格，保留原书措辞。'}

def write(name,obj): (ROOT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
write('content/c13-t3-p3/article.json',article)
write('content/index.json',[{'id':article['id'],'title':article['title'],'book':13,'test':3,'passage':3,'path':'content/c13-t3-p3/'}])
# Full printed question instructions, summary and researcher options.
summary=["Yama Dixit and David Hodell have found the first definitive evidence of climate change affecting the plains of north-western India thousands of years ago. By collecting the {{32}} of snails and analysing them, they discovered evidence of a change in water levels in a {{33}} in the region. This occurred when there was less {{34}} than evaporation, and suggests that there was an extended period of drought.","Petrie and Singh’s team are using archaeological records to look at {{35}} from five millennia ago, in order to know whether people had adapted their agricultural practices to changing climatic conditions. They are also examining objects including {{36}}, so as to find out about links between inhabitants of different parts of the region and whether these changed over time."]
qs=[{'id':int(q['id']),'answer':q['answer'],'text':q['text']} for q in original['questions']]
for q in qs:
 if 32<=q['id']<=36: q['text']=summary[0 if q['id']<35 else 1]
groups=[{'id':'paragraphs','label':'Questions 27–31','type':'paragraph','instructions':['Reading Passage 3 has eight paragraphs, A–H.','Which paragraph contains the following information?','Write the correct letter, A–H, in boxes 27–31 on your answer sheet.','NB You may use any letter more than once.'],'questionIds':list(range(27,32)),'options':list('ABCDEFGH')}, {'id':'summary','label':'Questions 32–36','type':'summary','instructions':['Complete the summary below.','Choose ONE WORD ONLY from the passage for each answer.','Write your answers in boxes 32–36 on your answer sheet.'],'heading':'Looking at evidence of climate change','paragraphs':summary,'questionIds':list(range(32,37))}, {'id':'researchers','label':'Questions 37–40','type':'researcher','instructions':['Look at the following statements (Questions 37–40) and the list of researchers below.','Match each statement with the correct researcher, A, B, C or D.','Write the correct letter, A, B, C or D, in boxes 37–40 on your answer sheet.','NB You may use any letter more than once.'],'questionIds':list(range(37,41)),'options':{'A':'Cameron Petrie','B':'Ravindanath Singh','C':'Yama Dixit','D':'David Hodell'}}]
write('content/c13-t3-p3/questions.json',{'groups':groups,'questions':qs,'source':{'questionPrintedPages':[70,71,72],'answerPrintedPage':123,'checked':'2026-10-11'}})
analysis={
27:('C1','proposed explanations → Some have claimed / others','C 段逐一提出河流改道、人口压力、资源耗尽、贸易崩溃、入侵及气候变化等解释。题目找的是“提出的解释”，并不要求这些解释已经被证明。','E 段虽有气候证据，但不是列举多种解释的段落。'),
28:('H2','present-day application → engage with the public / be more proactive','Petrie 提出把历史研究用于公众沟通、水资源管理与城乡发展等现实议题，正是考古发现的当代应用。','题目强调应用，不能仅选择介绍研究方法的 E 段。'),
29:('A3','difference / same period → lack of self-imagery / at a time when the Egyptians','哈拉帕几乎不留下自我形象，而同时期埃及人在神庙雕刻、描绘自己。这一对比同时满足 difference 和 same period。','F 段比较的是各文明的衰落时间，不是同一时期的文化差别。'),
30:('B2 B3','urban design → distinct sectors / blocks / streets / drainage systems','B 段介绍功能分区、街区、宽主街、窄巷、水井和排水系统，属于城市布局特征。','A 段的 megacities 只是城市规模，缺少布局细节。'),
31:('D2 D3','errors → inaccuracies / fundamentally flawed','新团队发现已发表的古聚落地理位置偏差从几百米到数千米，说明前人记录存在错误。','D 段末尾的 198 个新遗址是另一个发现；真正对应 errors 的是位置不准确。'),
32:('E2','collecting → gathered; of snails → shells of … snails','研究者收集的是蜗牛的壳。空格后有 of snails，因此填原文的复数名词 shells，且只能填一个词。','snails 是壳的所属对象，不能填入 shells 的位置；shell 单数不符合官方答案。'),
33:('E2 E4','water levels in a … → an ancient lake / evaporation from the lake','材料来自古湖沉积物，随后比较湖的蒸发量与降雨量，因此该水体是 lake。a 后填单数名词。','sediments 是材料所在层，不是水位发生变化的水体。'),
34:('E4','less … than evaporation → evaporation … exceeded the rainfall','原文说蒸发量超过降雨量，题干把比较方向反过来：降雨量小于蒸发量。填 rainfall。','drought 是这种不平衡表明的结果，不是与 evaporation 比较的量。'),
35:('G2','adapted agricultural practices → adjusting the combinations of crops','团队分析当时种植的谷物，检查缺水条件及作物组合是否调整，所以被研究的材料是 grains。','crops 出现在研究的目的中；原文直接跟在 analysing 后的是 grains。'),
36:('G3 G4','objects → pottery; links → interactive networks','团队检查陶器等物质文化，以了解各地区互动网络是否变化，填 pottery。pottery 是不可数名词。','networks 对应研究目标，空格要求的是实际检查的物品。'),
37:('F3','further information / vital → more climate data / essential','引语明确由 Singh 解释，并称获取更多气候数据 essential（至关重要），对应 B Ravindanath Singh。','不能因 E 段涉及气候数据就选 Dixit；此题须找说话者。'),
38:('H1 H2','previous patterns of behaviour → past societies responded; long-term benefits → in the future','H 段以 Petrie believes 开头，提出研究过去社会的应对方式，改善未来水资源与文化遗产管理。对应 A Cameron Petrie。','选项允许重复；40 题也选 A 不构成排除理由。'),
39:('E5','rough calculations → estimate; approximate length → about 200 years','Hodell adds 后明确估计季风减弱持续约 200 年，兼顾“估算”和“持续时长”两个线索。对应 D David Hodell。','Dixit 提到 4,100 年前，这是事件发生时间，不是干旱持续时间。'),
40:('B1 C3','information … lacking → relatively little about its fall / little solid evidence','B 段明确标注 Petrie 的话：兴起证据很多，衰落证据相对少；C 段也指出缺乏扎实证据。对应 A Cameron Petrie。','注意 rise 与 fall 的对比，缺乏的是衰落的信息。')}
smap={s['id']:s['text'] for p in article['paragraphs'] for s in p['sentences']}
items=[]
for n,(ids,para,logic,trap) in analysis.items():
 items.append({'questionId':n,'evidence':[{'sentenceId':i,'quote':smap[i]} for i in ids.split()],'paraphrase':para,'logic':logic,'trap':trap})
write('content/c13-t3-p3/analysis.json',{'questions':items,'sentences':[{'id':'C1','main':'Some have claimed …; or …; and yet others …','parts':['主干：Some have claimed that …（有些人提出……）。','that 从句列举河流、人口、资源、贸易及入侵等解释；and yet others 省略 have claimed。','读法：先按分号分三块，再识别各块的主语与动词；不要把所有解释当作确定事实。']},{'id':'H2','main':'we can learn from the past … to be more proactive …','parts':['By investigating … 是方式状语；主干为 we can learn from the past。','to engage … 与 to be more proactive … 说明学习过去的应用目的。','such as 后列举水资源、城乡发展和文化遗产三个领域。']} ]})
# Study vocabulary: inherited translations are revised below; no conjectural etymology.
gloss={k.replace("'",'’'):v['meaning'] for k,v in original['glossary'].items() if v['verified']}
missing='''a|一；一个（不定冠词）
about|关于；大约（时间、数量前）
adds|补充说道
ago|以前
all|全部
almost|几乎
also|也；还
an|一；一个（元音音素前的不定冠词）
and|和；并且
any|任何
are|是；构成现在时被动或进行时
area|地区；区域
areas|地区；区域
around|大约（时间前）
as|当……时；像……一样；作为
asia|亚洲（地名）
at|在（地点、时间）；处于
banaras|贝拿勒斯（大学名称的一部分）
bc|公元前（Before Christ）
be|是；处于；构成被动语态
been|be 的过去分词，构成完成时被动语态
before|在……之前
being|be 的现在分词，构成被动结构
both|两者都
but|但是
by|由；通过；借助
cambridge|剑桥（地名或大学名称）
cambridge’s|剑桥大学的（所有格）
cameron|Cameron（研究者的名字）
can|能够；可以
change|变化；改变
cities|城市
civilisations|文明
climatic|气候的
could|能够（过去式）；可能
 david|David（研究者的名字）
department|系；部门（此处指大学院系）
dixit|Dixit（研究者姓氏）
down|向下；在 broke down 中表示崩溃
 dr|博士（Doctor 的缩写）
earth|地球；Earth Sciences 指地球科学
 events|事件
fact|事实
final|最终的
first|首次的；第一的
five|五
food|食物
for|对于；为了
from|从；来自
 gives|给；带来
harappa|哈拉帕（古城名）
harappan|哈拉帕的（文明或遗址名称的修饰语）
has|有；构成第三人称单数完成时
have|有；构成完成时
hindu|印度教的（此处为大学名称的一部分）
hodell|Hodell（研究者姓氏）
how|如何；怎样
in|在……中
india|印度（国名）
indian|印度的
into|进入……；向……中
is|是；构成被动或进行时
it|它；形式主语
its|它的
key|关键的
larger-scale|规模更大的
later|后来；更晚
learn|学习；吸取经验
left|留下（leave 的过去分词）
little|很少；少量
lives|生活（life 的复数，此处为名词）
long|长久地；很久
looking|查看；研究（look at）
lot|大量（a lot of）
many|许多
melanoides|Melanoides（蜗牛属的学名，专名不强译）
mohenjodaro|摩亨佐达罗（古城名）
more|更多；更
most|大多数
much|非常；大量
new|新的
no|没有
not|不；未
now|现在
of|……的
on|关于；对……（产生影响）
once|一次；once more 为再次
only|仅仅；唯一的
or|或者
other|其他的
others|其他人
out|向外；在动词短语中与动词合用
 over|在……期间；遍及
own|自己的
pakistan|巴基斯坦（国名）
part|部分
people|人们
petrie|Petrie（研究者姓氏）
population|人口
professor|教授
punjab|旁遮普（地区名）
ravindanath|Ravindanath（研究者的名字）
really|确实；真正地
regions|地区
responses|回应；应对方式
said|说（say 的过去式）
says|说（say 的第三人称单数）
sciences|科学（学科名称）
see|看到
seemed|似乎；看来
seen|被看作（seen as）；see 的过去分词
self-imagery|对自身形象的表现
settlement|聚落；定居点
singh|Singh（研究者姓氏）
singh’s|Singh 的（所有格）
some|一些；有些人
south|南方；South Asia 为南亚
started|开始
still|仍然
such|这样的（such as 为例如）
tell|告诉；提供信息
that|……的；那个；引导从句
 the|定冠词，指特定事物
 their|他们的
 themselves|他们自己
then|然后；随后
there|存在（there is/was）；那里
these|这些
 they|他们
this|这；这个
those|那些
thought|被认为；think 的过去分词
 time|时间；时期
 to|到；向；不定式标记
 today|如今
 trying|尝试；努力
 tuberculata|tuberculata（物种学名的一部分，不推测词源）
two|二；两个
 types|种类
under|处于（某种条件）；在……下
understand|理解
university|大学
until|直到
us|我们（宾格）
use|使用
used|被使用；用作
very|非常
was|是；构成过去时被动或进行时
water|水
way|方式
we|我们
went|变得（went uncleaned）；go 的过去式
were|是；构成过去时被动或进行时
when|当……时
where|在……的地方
whether|是否
which|……的；引导关系从句
while|虽然；然而（此句为让步）
who|……的；引导关系从句
with|有；与；随着
work|work out：弄清楚
 yama|Yama（研究者的名字）
years|年
 yet|然而；仍然
 whatever|究竟什么（标题中加强疑问）
 happened|发生
 sheds|揭示（shed light on）
 light|在 shed light on 中表示阐明、揭示
 disappearance|消失'''
for row in missing.splitlines():
 k,v=row.strip().split('|',1);gloss[k.strip()]=v
# Amend polysemy, phrases, and translations after reading the actual sentences.
gloss.update({'bodies':'机构（政府与行政机构），不是身体','fell':'不再被使用（fell out of use）；fall 的过去式','fall':'衰落（文明的衰落）','rise':'兴起（文明的兴起）','course':'河道；过程（over the course of）','stress':'水分胁迫；缺水压力','solid':'确凿的；扎实的（证据）','interest':'研究兴趣；研究关注点','position':'有利位置；具备条件（in a … position to）','lies':'在于（lie in）','record':'记录','records':'考古记录','considering':'考虑到','plenty':'大量（plenty of）','settled':'人们定居；地区有人居住','laid':'布局；安排（laid out）','base':'基础；资源基础','craft':'工艺；手工艺','luxury':'奢侈的；高档的（修饰工艺品）','major':'主要的','supposed':'按原有记录应当（be supposed to）','material':'物质的（material culture）','public':'公众（the public）','climate':'气候','fieldwork':'实地调查工作','sophisticated':'发达的；复杂精细的','geochemical':'地球化学的','threats':'威胁','environmental':'环境的','fundamentally':'根本上','provided':'提供','affected':'影响','caused':'引起；造成','finding':'发现','investigating':'调查；研究','growing':'种植','grown':'被种植（grow 的过去分词）'})
gloss.update({'shells':'蜗牛壳（此句指蜗牛的外壳）','led':'引领；lead their lives 指过生活','engage':'交流；接触（engage with）','millennia':'千年（millennium 的复数）','millennium':'一千年','distinct':'分明的；独立划分的','after':'在……之后','archaeologists':'考古学家（复数）','had':'有；构成过去完成时'})
# Explicit parts of speech for every word form; no suffix-based guessing.
posgroups={
'动词':'''adds affected appeared arranged began believes broke built carried carving caused changed claimed cope cultivated declined engage estimate exceeded examining exhausted explains fell finding flourished found gathered gives growing grown had has have increased inhabited investigate investigating involved known laid lasted learn led left lies linked looking obtain observed painting passed preserving provided published ranging realised recovering responded said says see seemed seen settled should situated started succumbed supposed tell thought tracing traded trying understand use used weakening went work sheds happened''',
'名词':'''administration agriculture alleyways amount analysis archaeologist archaeologists archaeology area areas aspects attempts balance base baths blocks bodies buildings cause change cities civilisation civilisations climate combinations conditions conflict course craft crops culture data debate decline demise department depictions details development disappearance drainage drought earth economy elements environments evaporation event events evidence fact fall fieldwork food future grains halls heritage history houses hundreds imagery impact importance inaccuracies insight interest invasion investigations issues kilometres lack lake light lives locations lot management means metres millennium millennia monsoon mystery networks palaces part people plains population populations position pottery pressures processes products provision rainfall records region regions representations research researchers resource responses rise rivers sciences seasons sectors sediments self-imagery settlement settlements shells snails society societies source sources speculation streets stress structures summer supply survey surveys systems team temples threats thousand time transformation types university understanding vocabulary water way weather wells workshops years''',
'形容词':'''abrupt administrative ancient archaeological astonishing bronze climatic close cultural definitive different distinct distinctive environmental essential existing extreme final first flawed fundamentally geographic geochemical glacier-fed global-scale governmental great harappan indian indicative interactive key large-scale larger larger-scale likely local-scale luxury main major material narrow north-western possible previous proactive relevant ritual rural similar single solid sophisticated specific thriving uncleaned unique unknown unlikely urban variable vast well-argued wide''',
'副词':'''ago almost also around completely dramatically early internationally later long much now previously really relatively still today together very yet''',
'专有名词':'''asia banaras cambridge cambridge’s cameron david dixit dr egyptians harappa hindu hodell india melanoides mohenjodaro pakistan petrie professor punjab ravindanath singh singh’s south tuberculata yama age''',
'数词':'''five two''',
'功能词':'''a about after all an and any are as at bc be been before being both but by can could down for from how in into is it its little many more most new no not of on once only or other others out over own some such that the their themselves then there these they this those to under until us was we were when where whether which while who with whatever'''
}
pos={w:p for p,words in posgroups.items() for w in words.split()}
# Form → lemma map, explicitly curated, including irregular and British forms.
lemma={}
formrows='''abandon abandoned
add adds
affect affected affecting
adjust adjusting
alter altering
analyse analysing
appear appeared
arrange arranged
attempt attempts
bath baths
believe believes
body bodies
build built buildings
begin began
break broke
carry carried
carve carving
cause caused
change changed
city cities
civilisation civilisations
claim claimed
combination combinations
condition conditions
consider considering
crop crops
cultivate cultivated
decline declined
depiction depictions
detail details
Egyptian egyptians
environment environments
element elements
event events
examine examining
exceed exceeded
exhaust exhausted
explain explains
find found finding
flourish flourished
gather gathered
give gives
grain grains
grow grown growing
hall halls
house houses
inaccuracy inaccuracies
increase increased increasing
inhabit inhabited
investigate investigating investigations
involve involved
issue issues
kilometre kilometres
know known
large larger
last lasted
lay laid
lead led
leave left
life lives
link linked
location locations
look looking
metre metres
millennium millennia
network networks
observe observed
paint painting
palace palaces
pass passed
plain plains
population populations
preserve preserving
pressure pressures
process processes
product products
provide provided
publish published
range ranging
realise realised
record records
recover recovering
region regions
representation representations
researcher researchers
respond responded
response responses
river rivers
say said says
science sciences
season seasons
sector sectors
sediment sediments
see seen
seem seemed
settle settled
settlement settlements
shell shells
site sites
snail snails
society societies
source sources
start started
street streets
structure structures
succumb succumbed
suppose supposed
survey surveys
system systems
temple temples
threat threats
think thought
trace tracing
trade traded trading
try trying
type types
use used
weaken weakening
well wells
workshop workshops
year years
fall fell
lie lies
go went
shed sheds
happen happened
archaeologist archaeologists
be is are was were been being
have had has'''
for row in formrows.splitlines():
 base,*forms=row.split()
 for f in forms:lemma[f]=base.lower()
# Additional POS forms present in original verified glossary.
for p,words in [('动词','abandoned adjusting affecting altering analysing increasing'),('名词','archaeological'),('名词','archaeological')]:
 for w in words.split():
  if w not in pos:pos[w]=p
pos.update({'archaeological':'形容词','archaeologists':'名词','archaeologist':'名词','archaeological':'形容词','archaeological':'形容词','trading':'名词（作定语）','hundred':'数词','several':'限定词','baths':'名词','abandoned':'动词（过去分词）','adjusting':'动词','affecting':'动词','altering':'动词','analysing':'动词','increasing':'形容词（现在分词作定语）','supplies':'名词','archaeological':'形容词','science':'名词','few':'限定词'})
pos.update({'across':'介词','considering':'介词（现在分词引导）','megacities':'名词','past':'名词／形容词','plenty':'代词','public':'名词','real':'形容词','relation':'名词','sites':'名词','fundamentally':'副词','bc':'时间缩写'})
lemma.update({'buildings':'building','investigations':'investigation','inaccuracies':'inaccuracy','weakening':'weakening','understanding':'understanding','cambridge’s':'cambridge','singh’s':'singh'})
pos.update({'weakening':'名词（动名词）','growing':'动词（现在分词）','considering':'介词（现在分词形式）'})
for category,forms in {
 '冠词':'a an the',
 '介词':'about after at before by for from in into of on over under until with across',
 '连词':'and but or whether while yet',
 '关系代词／连词':'that which who',
 '代词':'it themselves they us we others whatever',
 '物主限定词':'its their own',
 '限定词／代词':'all any both little many more most no other some these this those such',
 '副词':'down out not once only then there when where how',
 '助动词／情态动词':'are be been being can could is was were',
 '介词／不定式标记':'to'
}.items():
 for word in forms.split():pos[word]=category
words=set(re.findall(r"[A-Za-z]+(?:[-’'][A-Za-z]+)*",article['title']+' '+article['subtitle']+' '+' '.join(p['text'] for p in paragraphs)))
words={w.lower().replace("'",'’') for w in words}
missingmean=sorted(words-gloss.keys());missingpos=sorted(words-pos.keys())
if missingmean or missingpos:
 print('MISSING MEANING:',missingmean);print('MISSING POS:',missingpos)
# Store only words actually used; generation fails if any translation is missing.
assert not missingmean and not missingpos
common={'relevant':'相关的；切题的','flourish':'繁荣；茁壮成长','decline':'下降；衰退；（动词另有）婉拒','fall':'落下；下降；（名词）秋天','rise':'上升；增加','body':'身体；主体；团体或机构','course':'课程；路线；进程','stress':'压力；重音；强调','interest':'兴趣；利益；利息','lie':'躺；位于（lie–lay–lain）；说谎（lie–lied–lied）','record':'记录；纪录；录制','shell':'壳；外壳','grain':'谷物；颗粒','pottery':'陶器；制陶工艺','proactive':'积极主动、提前采取行动的','position':'位置；处境；职位','mean':'意思是；意味着；（形容词另有）吝啬的','solid':'固体的；结实的；可靠的','plain':'平原；（形容词另有）朴素的、清楚的','craft':'手艺；工艺品；（动词）精心制作','draw':'绘画；拉；吸引','supply':'供应；供给','trade':'贸易；交易','flaw':'缺陷；瑕疵','society':'社会；协会','sophisticated':'复杂精细的；见多识广的','demise':'消亡；终止；死亡','succumb':'屈服；抵挡不住；死于','heritage':'遗产；传统','abandon':'遗弃；放弃','network':'网络；关系网','water':'水；（动词）浇水','broke':'break 的过去式；（形容词另有）没钱的','well':'井；（副词）好地','research':'研究；调查','earth':'地球；土地','climate':'气候；社会风气','figure':'数字；人物；图形'}
contextOverrides={'G1':{'led':'过生活（led their lives）'},'D1':{'led':'领导（a team led by …）'},'B1':{'fall':'衰落（名词，指哈拉帕文明的衰落）'},'B6':{'fell':'在 fell out of use 中表示“不再被使用”','out':'fell out of use：不再被使用','use':'用途；使用（名词，out of use）'},'C1':{'course':'河道（河流的流向）','change':'变化（名词）','broke':'在 broke down 中表示“崩溃”'},'C2':{'cause':'原因（名词）'},'D2':{'settled':'定居；有人居住','sources':'水源'},'D4':{'course':'过程；期间（over the course of）'},'E2':{'means':'方法；手段（单复数同形）'},'E4':{'change':'变化（名词）'},'F1':{'cause':'原因（名词）','seen':'被看作（being seen as）'},'F2':{'lies':'在于（lie in）','interest':'研究关注点'},'H1':{'position':'具备特别有利的条件（in a unique position to）','past':'过去的（形容词）'},'H2':{'bodies':'机构（政府与行政机构）','public':'公众（the public）','past':'过去（名词）','balance':'平衡（名词）','issues':'议题；问题'}}
# Safe morphology: grammatical endings and transparent compounds, no invented roots.
compounds={'rainfall':'rain（雨）+ fall（降落）：降雨；透明复合词。','fieldwork':'field（实地）+ work（工作）：实地调查。','self-imagery':'self（自身）+ imagery（形象表现）：自我形象。','glacier-fed':'glacier（冰川）+ fed（feed 的过去分词）：由冰川供水的。','north-western':'north-west（西北）+ -ern（方位形容词后缀）：西北部的。','uncleaned':'un-（否定）+ cleaned（清扫过的）：未清扫的。','unknown':'un-（否定）+ known（已知的）：未知的。','unlikely':'un-（否定）+ likely（可能的）：不太可能的。','well-argued':'well（充分地）+ argued（论证过的）：论证充分的。'}
stop=set(original['stopwords'])
vocabulary={}
for w in sorted(words):
 base=lemma.get(w,w)
 morphology=compounds.get(w,'没有已核实的词根词缀拆解；不强行拆分。')
 if w!=base and w not in ['cambridge’s','singh’s']:
  morphology=f'词形还原：{w} → {base}。这里只说明屈折或复数变化，不推断词源。'
 if w.endswith('’s'):morphology='’s 表示所属关系；专有名称不作词源拆解。'
 vocab={'lemma':base,'pos':pos.get(w,'待核实'),'contextZh':gloss[w],'commonZh':common.get(base,gloss[w]),'morphology':morphology,'sourceNote':'中文释义依据本篇上下文整理；常见义为学习提示。专名按原文身份标注，不推测词源。','basic':w in stop,'occurrences':[],'contexts':{sid:v[w] for sid,v in contextOverrides.items() if w in v},'questionLinks':[]}
 for p in article['paragraphs']:
  for s in p['sentences']:
   for i,m in enumerate(re.finditer(r"[A-Za-z]+(?:[-’'][A-Za-z]+)*",s['text'])):
    form=m.group().lower().replace("'",'’')
    if lemma.get(form,form)==base:vocab['occurrences'].append({'sentenceId':s['id'],'tokenIndex':i,'form':m.group()})
 vocabulary[w]=vocab
# Only evidence-backed question-word links, all attached to real sentences.
links={27:'claimed decline',28:'proactive management',29:'self-imagery egyptians',30:'blocks streets drainage sectors',31:'inaccuracies flawed',32:'gathered shells',33:'lake',34:'exceeded rainfall evaporation',35:'grains cultivated adjusting',36:'pottery interactive networks',37:'essential obtain data',38:'past future responded',39:'estimate lasted',40:'little fall evidence'}
for n,ws in links.items():
 a=next(a for a in items if a['questionId']==n)
 for w in ws.split():
  if w in vocabulary:vocabulary[w]['questionLinks'].append({'questionId':n,'sentenceId':a['evidence'][0]['sentenceId'],'paraphrase':a['paraphrase']})
write('content/c13-t3-p3/vocabulary.json',vocabulary)
write('verification/source-check.json',{'pdfSha256':article['source']['sha256'],'paragraphWordHashes':{p['id']:hashlib.sha256(' '.join(re.findall(r"[A-Za-z0-9]+",p['text'])).encode()).hexdigest() for p in paragraphs},'officialAnswers':{str(q['id']):q['answer'] for q in qs},'printedPages':{'article':[68,69],'questions':[70,71,72],'answers':123},'visualChecked':True,'corrections':['补回 B 段开头的引号','C、E 段直引号改为印刷版弯引号','补回 C 段 said 前空格','按印刷版复原连接号','Singh’s 复原弯撇号','补齐完整摘要、全部说明与研究者列表']})
print('Content prepared:',len(words),'word forms,',len(smap),'sentences')
