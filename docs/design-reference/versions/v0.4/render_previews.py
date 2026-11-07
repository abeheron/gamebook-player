# Code-rendered static previews (Pillow) approximating index.html. Not a browser screenshot.
from PIL import Image, ImageDraw, ImageFont
import textwrap, os
G="/usr/share/fonts/truetype/sand-box/google/"
def F(kind,size,bold=False):
    p={"serif":"/usr/share/fonts/truetype/dejavu/DejaVuSerif"+("-Bold" if bold else "")+".ttf","sans":"/usr/share/fonts/truetype/dejavu/DejaVuSans"+("-Bold" if bold else "")+".ttf","mono":"/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"}[kind]
    f=ImageFont.truetype(p,size)
    if kind=="serif":
        try: f.set_variation_by_axes([100,600 if bold else 400])
        except Exception: pass
    return f
PAPER="#f6f1e7";PANEL="#fffdf8";INK="#1f1b16";MUTED="#5c5348";LINE="#ddd3c2";ACC="#8a2f1d";CHIP="#efe6d6";OK="#2f6b3a";BAD="#9b2a1f"
def tick(c,x,y,sz,checked):
    w=2 if sz>18 else 1.5
    c.d.rectangle((x,y,x+sz,y+sz),outline=INK,width=int(round(w)),fill=INK if checked else None)
    if checked:
        cx,cy=x+sz/2,y+sz/2;k=sz/22
        c.d.line([(cx-5*k,cy+0.5*k),(cx-1.5*k,cy+4*k),(cx+5.5*k,cy-4*k)],fill=PAPER,width=max(2,int(2.4*k)),joint="curve")
def back(c,x,y,label): c.t(x,y,"← Back to "+label,F("sans",14,True),ACC)
def art(c,x,y,w,h):
    c.d.rounded_rectangle((x,y,x+w,y+h),10,fill="#efe6d6",outline=LINE)
    c.d.rectangle((x+1,y+h*0.57,x+w-1,y+h-1),fill="#d9cfbd")
    c.d.polygon([(x+w*0.39,y+h-1),(x+w*0.47,y+h*0.57),(x+w*0.53,y+h*0.57),(x+w*0.61,y+h-1)],fill="#c2b49c")
    for i in range(16):
        for bx,dx in ((x+14+i*w*0.018,4),(x+w*0.66+i*w*0.018,-4)):
            c.d.line((bx,y+h-2,bx+dx,y+h*0.5+(i%4)*8),fill="#7d7462",width=2)
    cx,cy=x+w/2,y+h*0.53;c.d.ellipse((cx-28,cy-22,cx+28,cy+22),fill="#8f8574")
    for ex in(-10,10): c.d.ellipse((cx+ex-5,cy-9,cx+ex+5,cy+1),fill="#3d372e")
    c.t(x+12,y+10,"PLACEHOLDER ART · DEMO",F("sans",11),MUTED)
def prefseg(c,x,y,on=0):
    c.t(x,y+7,"Illustrations:",F("sans",12),MUTED);return seg(c,x+92,y,["Inline","Link only","Hidden"],on,sm=True)
class C:
    def __init__(s,w,h): s.im=Image.new("RGB",(w,h),PAPER);s.d=ImageDraw.Draw(s.im);s.w=w
    def t(s,x,y,txt,f,fill=INK): s.d.text((x,y),txt,font=f,fill=fill); return s.d.textbbox((x,y),txt,font=f)[2]
    def para(s,x,y,txt,f,width,lh,fill=INK):
        for ln in textwrap.wrap(txt,width): s.t(x,y,ln,f,fill); y+=lh
        return y
    def box(s,x,y,w,h,fill=PANEL,outline=LINE,r=12,width=1): s.d.rounded_rectangle((x,y,x+w,y+h),r,fill=fill,outline=outline,width=width)
    def demo(s,x,y):
        f=F("sans",10,True);w=s.d.textlength("DEMO",font=f)+10;s.d.rounded_rectangle((x,y,x+w,y+16),3,outline=MUTED);s.t(x+5,y+2,"DEMO",f,MUTED);return x+w
def banner(c):
    c.d.rectangle((0,0,c.w,30),fill=INK);f=F("sans",12)
    msg="Prototype · all narrative, sections, stats, rolls, items and keywords are illustrative demo data"
    c.t((c.w-c.d.textlength(msg,font=f))/2,8,msg,f,PAPER)
NAV=[("read","Read"),("sheet","Character"),("test","Test & fight"),("log","Keywords & ticks"),("lib","Library"),("rules","Rules")]
def side(c,cur,h):
    c.d.line((220,30,220,h),fill=LINE);c.t(22,50,"Gamebook Player",F("serif",18,True));c.t(22,76,"prototype v0.1",F("sans",12),MUTED)
    c.t(22,100,"Temple of the Skull God · GNAT",F("sans",11),MUTED);y=130
    for k,l in NAV:
        if k==cur: c.box(14,y,192,36,fill=ACC,outline=ACC,r=8)
        c.t(28,y+9,l,F("sans",14),"#fff" if k==cur else INK);y+=40
def stat(c,x,y,w,lab,val,sub=None):
    c.box(x,y,w,72,r=10);f=F("sans",11);c.t(x+(w-c.d.textlength(lab.upper(),font=f))/2,y+8,lab.upper(),f,MUTED)
    fv=F("serif",26,True);c.t(x+(w-c.d.textlength(val,font=fv))/2,y+24,val,fv)
    if sub: c.t(x+(w-c.d.textlength(sub,font=f))/2,y+56,sub,f,MUTED)
def choice(c,x,y,w,label,to,why=None,test=False,locked=False):
    h=64 if why else 48;c.box(x,y,w,h,r=10)
    if test: c.d.rectangle((x,y+2,x+4,y+h-2),fill=ACC)
    col=MUTED if locked else INK;c.t(x+16,y+14,label,F("sans",15),col)
    if why: c.t(x+16,y+36,why,F("sans",12),MUTED)
    fm=F("mono",13,);c.t(x+w-16-c.d.textlength(to,font=fm),y+15,to,fm,MUTED if locked else ACC);return y+h+10
PROSE=["The causeway narrows where the reeds close in, and the water on either side lies black and still. Ahead, half-sunk in the mud, a carved head grins up at the sky, its eye sockets packed with old offerings.",
"A heron lifts from the shallows. Somewhere beyond the reeds you hear the slow knock of a boat against a post, and a voice humming a tune you almost recognise."]
def read_desktop():
    W,H=1440,900;c=C(W,H);banner(c);side(c,"read",H);x=268
    e=c.t(x,60,"SECTION 214",F("sans",13,True),ACC);c.demo(e+8,60)
    tick(c,x,92,20,False);c.t(x+30,94,"Not ticked yet. The engine ticks it when you read on.",F("sans",13),MUTED)
    prefseg(c,x,124);art(c,x,164,720,190)
    c.d.rounded_rectangle((x,362,x+142,380),4,fill=CHIP);c.t(x+6,364,"Scanned · demo label",F("sans",11,True))
    c.t(x+152,364,"Placeholder SVG, not a scan or AI image. Select to view full size.",F("sans",12),MUTED)
    y=398;fs=F("serif",18)
    for p in PROSE: y=c.para(x,y,p,fs,74,28)+8
    y=c.t(x,y,"Placeholder prose written for this prototype; not from Temple of the Skull God.",F("sans",12),MUTED) and y+24
    cw=720
    y=choice(c,x,y,cw,"Test Naturalist to read the heron's flight","test →","Roll 2d6 ≤ Talent ± modifier · opens the test panel",test=True)
    y=choice(c,x,y,cw,"Bathe in the lake","232");y=choice(c,x,y,cw,"Follow the humming toward the boat","118")
    y=choice(c,x,y,cw,"Fight whatever stirs in the reeds","fight →","3 rounds at −2 · opens the fight panel",test=True)
    ax=1080;c.box(ax,60,312,300);e=c.t(ax+18,76,"Adventurer",F("serif",18,True));c.demo(e+8,80)
    for i,(l,v) in enumerate([("Talent","9"),("Vitality","3"),("Fortune","3")]): stat(c,ax+18+i*94,112,86,l,v)
    yy=200
    for k,v in [("Gold","12"),("Skills","Naturalist, Stealth"),("Weapon","Short sword")]: c.t(ax+18,yy,k,F("sans",14),MUTED);c.t(ax+90,yy,v,F("sans",14));yy+=24
    c.box(ax+18,284,110,38,fill=PANEL,r=9);c.t(ax+34,294,"Full sheet",F("sans",14,True))
    c.box(ax+138,284,120,38,fill=PANEL,r=9);c.t(ax+152,294,"☆ Bookmark",F("sans",14,True))
    c.t(ax+18,334,"Autosaved · slot “Marsh run” (simulated)",F("sans",12),MUTED);return c.im
def header(c,x,title,sub,dy=0):
    c.t(x,52+dy,title,F("serif",28,True));c.t(x,94+dy//2,sub,F("sans",14),MUTED)
def table(c,x,y,w,cols,rows,cx):
    f=F("sans",11,True);[c.t(x+cx[i],y,h.upper(),f,MUTED) for i,h in enumerate(cols)];y+=22;c.d.line((x,y,x+w,y),fill=LINE)
    for r in rows:
        for i,v in enumerate(r): c.t(x+cx[i],y+9,v,F("sans",13))
        y+=34;c.d.line((x,y,x+w,y),fill=LINE)
    return y
def sheet():
    W,H=1440,900;c=C(W,H);banner(c);side(c,"sheet",H);x=268
    back(c,x,40,"reading");header(c,x,"Adventure sheet","Shows only what Temple of the Skull God needs: stats, skills, items, money, keywords and titles. Values are demo.",12)
    cw=360;g=20
    c.box(x,130,cw,420);c.t(x+18,148,"Stats",F("serif",18,True))
    for i,(l,v) in enumerate([("Talent","9"),("Vitality","3"),("Fortune","3")]): stat(c,x+18+i*110,186,100,l,v,"/ 3" if i else None)
    c.para(x+18,276,"Starting values per the design doc: Talent 9, Vitality 3, Fortune 3 (max 3). Wounds reduce Vitality.",F("sans",12),48,18,MUTED)
    c.t(x+18,330,"XP   4",F("sans",14));c.t(x+18,356,"Gold 12",F("sans",14));c.demo(x+100,358)
    c.box(x+18,392,130,38,outline=LINE,r=9);c.t(x+30,402,"Rest (ration)",F("sans",13),MUTED);c.box(x+158,392,110,38,r=9);c.t(x+172,402,"Spend XP",F("sans",13),MUTED)
    c.t(x+18,442,"Rest and advancement: placeholders.",F("sans",12),MUTED)
    x2=x+cw+g;c.box(x2,130,cw,420);c.t(x2+18,148,"Skills",F("serif",18,True))
    c.para(x2+18,180,"Having a skill gives +2 on its tests, lacking it −2. Item bonuses: highest only.",F("sans",12),48,18,MUTED)
    y=table(c,x2+18,224,cw-36,["Skill","Mod"],[["Naturalist (demo)","+2"],["Stealth (demo)","+2"],["Any other skill","−2"]],[0,250])
    c.t(x2+18,y+18,"Titles",F("serif",18,True));c.box(x2+18,y+52,250,26,fill=CHIP,outline=CHIP,r=13);c.t(x2+30,y+57,"Friend of the Fisherfolk (demo)",F("sans",12))
    c.t(x2+18,y+92,"Titles carry between books (later phase).",F("sans",12),MUTED)
    x3=x2+cw+g;c.box(x3,130,cw,520);c.t(x3+18,148,"Inventory",F("serif",18,True))
    y=table(c,x3+18,186,cw-36,["Item","Tags"],[["Short sword","weapon"],["Wooden shield","shield · heavy"],["Leather armour","armour · ignores 1 wound"],["Rations ×2","rest"],["Scroll of Light","spell · vs 10 · consumed"],["Rope","—"]],[0,130])
    c.t(x3+18,y+14,"Heavy items",F("sans",13));c.t(x3+cw-60,y+14,"1 / 6",F("sans",13))
    c.d.rounded_rectangle((x3+18,y+38,x3+cw-18,y+46),4,fill=CHIP);c.d.rounded_rectangle((x3+18,y+38,x3+18+(cw-36)//6,y+46),4,fill=ACC)
    c.para(x3+18,y+60,"Item names and tags are demo; heavy limit shown as 2 × max Vitality per the doc.",F("sans",12),46,18,MUTED);return c.im
PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}
def die(c,x,y,v,sel=False):
    c.box(x,y,74,74,fill=PANEL,outline=ACC if sel else INK,r=14,width=3 if sel else 2)
    for k in PIPS[v]:
        cx=x+17+(k%3)*20;cy=y+17+(k//3)*20;c.d.ellipse((cx-6,cy-6,cx+6,cy+6),fill=INK)
def seg(c,x,y,items,on,sm=False):
    f=F("sans",12 if sm else 13);hh=28 if sm else 34;pad=20 if sm else 28;ws=[c.d.textlength(i,font=f)+pad for i in items];c.box(x,y,sum(ws),hh,r=8);xx=x
    for i,(it,w) in enumerate(zip(items,ws)):
        if i==on: c.d.rounded_rectangle((xx,y,xx+w,y+hh),8,fill=INK)
        c.t(xx+pad/2,y+(6 if sm else 9),it,f,PAPER if i==on else INK);xx+=w
    return x+sum(ws)
def test():
    W,H=1440,900;c=C(W,H);banner(c);side(c,"test",H);x=268
    back(c,x,40,"reading");header(c,x,"Test & fight","Simulated dice in the browser. Rule shape from the doc; the scenario is demo.",12)
    e=seg(c,x,128,["Skill test","Fight"],1);e=seg(c,e+12,128,["App dice","My dice"],0)
    for lab,on,dx in(("Animate rolls",True,16),("Rolling sound",True,150)):
        bx=e+dx;c.d.rounded_rectangle((bx,137,bx+16,153),3,fill=ACC if on else PANEL,outline=ACC if on else MUTED,width=2)
        if on: c.d.line([(bx+4,145),(bx+7,149),(bx+12,140)],fill="#fff",width=2)
        c.t(bx+22,137,lab,F("sans",13))
    c.box(x,180,760,470);e=c.t(x+20,198,"Fight the marsh lurker: 3 rounds at −2",F("serif",18,True));c.demo(e+8,202)
    c.box(x+20,236,720,40,fill=CHIP,outline=CHIP,r=8);fm=F("mono",14);s="Each round: 2d6 ≤ Talent 9 − 2 = 7 · fail = 1 Wound · double 6 = +1 Wound";c.t(x+20+(720-c.d.textlength(s,font=fm))/2,247,s,fm)
    cx=x+380
    for i,(st,col,tx) in enumerate([("ok",OK,"✓"),("bad",BAD,"✗"),("ok",OK,"✓")]):
        bx=cx-70+i*48;c.box(bx,296,38,38,fill="#e3ecdf" if st=="ok" else "#f1dcd6" if st=="bad" else PANEL,outline=col,r=8,width=2);c.t(bx+12,305,tx,F("sans",15,True),col)
    die(c,cx-88,356,4,True);die(c,cx+14,356,2)
    r="Round 3: 6 ≤ 7 — pass";fr=F("serif",22,True);c.t(cx-c.d.textlength(r,font=fr)/2,452,r,fr,OK)
    c.box(cx-250,500,180,42,fill="#c9a89f",outline="#c9a89f",r=9);c.t(cx-232,511,"Roll 2d6 (R)",F("sans",15,True),"#fff")
    c.box(cx-56,500,320,42,r=9);c.t(cx-40,511,"Spend 1 Fortune: re-roll selected die",F("sans",14,True))
    s="Double 1 always passes · double 6 always fails. Select a die, then spend Fortune.";f=F("sans",12);c.t(cx-c.d.textlength(s,font=f)/2,566,s,f,MUTED)
    ax=x+790;c.box(ax,180,330,330);c.t(ax+18,198,"Outcome",F("serif",18,True));yy=236
    for k,v in [("Fortune","3 / 3"),("Vitality","2 / 3")]: c.t(ax+18,yy,k,F("sans",14),MUTED);c.t(ax+100,yy,v,F("sans",14));yy+=26
    c.box(ax+18,yy+8,294,42,fill=ACC,outline=ACC,r=9);c.t(ax+32,yy+19,"Fight over → turn to 326",F("sans",14,True),"#fff")
    c.t(ax+18,yy+60,"Encounter complete · 1 Wound taken.",F("sans",12),MUTED);c.t(ax+18,yy+78,"Destination is demo.",F("sans",12),MUTED);yy+=104
    c.para(ax+18,yy+4,"Fight: N rounds at −X; each failed round is one Wound, a fumble adds a Wound. Advantage/Disadvantage and armour not simulated.",F("sans",12),44,18,MUTED);return c.im
LOG=[("Ferryman","Keyword","—","not gained"),("Heron-Sign","Keyword","§88","✓ gained"),("Broken Idol","Keyword","§301","✓ gained"),("Salt Debt","Keyword","§412","✓ gained"),("§27 box","Tickbox","§27",(1,1)),("§150 boxes","Tickbox","§150",(2,3)),("§214 box","Tickbox","§214",(0,1)),("§333 boxes","Tickbox","§333",(0,2)),("§402 box","Tickbox","§402",(1,1))]
def log():
    W,H=1440,900;c=C(W,H);banner(c);side(c,"log",H);x=268
    header(c,x,"Keywords & ticks","Open-world log. In the book, section 574 lists all keywords and tickboxes; entries here are demo.")
    c.box(x,128,380,36,r=8);c.t(x+12,137,"Filter by name or section",F("sans",14),MUTED);seg(c,x+392,129,["All","Keywords","Ticks"],0)
    c.box(x,184,760,40+34*len(LOG)+20);y=204;f=F("sans",11,True)
    for i,h in enumerate(["ENTRY","TYPE","WHERE","STATE"]): c.t(x+20+[0,300,440,560][i],y,h,f,MUTED)
    y+=22;c.d.line((x+20,y,x+740,y),fill=LINE)
    for n,t,w,s in LOG:
        e=c.t(x+20,y+9,n,F("sans",13,True));c.demo(e+8,y+10);c.t(x+320,y+9,t,F("sans",13));c.t(x+460,y+9,w,F("sans",13))
        if isinstance(s,tuple):
            for k in range(s[1]):
                tick(c,x+580+k*22,y+9,16,k<s[0])
        else: c.t(x+580,y+9,s,F("sans",13),INK if "✓" in s else MUTED)
        y+=34;c.d.line((x+20,y,x+740,y),fill=LINE)
    ax=x+790;c.box(ax,184,330,280);c.t(ax+18,202,"Summary",F("serif",18,True));yy=240
    for k,v in [("Keywords","3 gained"),("Ticked boxes","4 boxes"),("Sections visited","38 (demo)")]: c.t(ax+18,yy,k,F("sans",14),MUTED);c.t(ax+150,yy,v,F("sans",14));yy+=26
    c.para(ax+18,yy+10,"Ticks are per-section counters: a section may have several boxes. Keywords survive losing your items.",F("sans",12),44,18,MUTED);return c.im
def lib():
    W,H=1440,900;c=C(W,H);banner(c);side(c,"lib",H);x=268
    header(c,x,"Library","Books stay local on this device. Import is simulated in this prototype.")
    c.box(x,130,760,180);c.d.rounded_rectangle((x+18,148,x+106,272),6,fill="#5a2a1c");c.para(x+26,220,"Temple of the Skull God",F("serif",12,True),12,15,"#f6e7cf")
    c.t(x+126,150,"Temple of the Skull God",F("serif",18,True));c.t(x+126,180,"Paul Partington, 2024 · GNAT system (CC BY-SA 4.0) · 573 sections + 574 reference",F("sans",12),MUTED)
    e=c.t(x+126,208,"Explored 38 sections",F("sans",13));c.demo(e+8,209);c.d.rounded_rectangle((x+126,232,x+740,240),4,fill=CHIP);c.d.rounded_rectangle((x+126,232,x+166,240),4,fill=ACC)
    c.box(x+126,256,170,40,fill=ACC,outline=ACC,r=9);c.t(x+142,267,"Continue · §214",F("sans",14,True),"#fff")
    c.box(x+306,256,150,40,r=9);c.t(x+320,267,"New adventurer",F("sans",14),MUTED);c.box(x+466,256,110,40,r=9);c.t(x+480,267,"Save slots",F("sans",14),MUTED)
    c.box(x,326,760,150);c.d.rounded_rectangle((x+18,340,x+106,464),6,fill="#3a4f58");c.t(x+26,440,"Sample",F("serif",12,True),"#f6e7cf")
    e=c.t(x+126,344,"Sample: user-written book",F("serif",18,True));c.demo(e+8,350);c.t(x+126,374,"Placeholder entry · Fighting Fantasy system (phase 2)",F("sans",12),MUTED)
    c.box(x+126,410,230,40,r=9);c.t(x+140,421,"System not yet supported",F("sans",14),MUTED)
    ax=x+790;c.box(ax,130,330,440);c.t(ax+18,148,"Import a book",F("serif",18,True))
    c.d.rounded_rectangle((ax+18,184,ax+312,320),12,outline=LINE,width=2);c.t(ax+90,206,"Drop a book file (YAML or JSON)",F("sans",12),MUTED)
    c.box(ax+100,250,130,36,r=9);c.t(ax+110,259,"Simulate import",F("sans",13,True))
    yy=340
    for i,s in enumerate(["Read file locally","Validate against JSON Schema","Check system file (GNAT)","Add to library"]):
        done=i<2;c.d.ellipse((ax+18,yy,ax+40,yy+22),fill=OK if done else CHIP);c.t(ax+24,yy+3,"✓" if done else str(i+1),F("sans",12,True),"#fff" if done else INK);c.t(ax+52,yy+3,s,F("sans",13));yy+=30
    c.para(ax+18,yy+8,"No file is read; steps animate for illustration. AI converter is a later optional feature.",F("sans",12),44,18,MUTED);return c.im
def phone(screen):
    W,H=390,844;c=C(W,H);banner_f=F("sans",10);c.d.rectangle((0,0,W,26),fill=INK);c.t(12,7,"Prototype · illustrative demo data",banner_f,PAPER);x=16
    if screen=="read":
        e=c.t(x,44,"SECTION 214",F("sans",12,True),ACC);c.demo(e+8,44)
        tick(c,x,72,18,False);c.t(x+28,73,"Box not ticked yet",F("sans",12),MUTED)
        prefseg(c,x,100);art(c,x,136,W-32,150);c.d.rounded_rectangle((x,292,x+142,310),4,fill=CHIP);c.t(x+6,294,"Scanned · demo label",F("sans",11,True));y=320
        for p in PROSE: y=c.para(x,y,p,F("serif",17),38,28)+10
        y+=6;y=choice(c,x,y,W-32,"Test Naturalist","test →","Opens the test panel",test=True);y=choice(c,x,y,W-32,"Bathe in the lake","232")
        y=choice(c,x,y,W-32,"Follow the humming","118");choice(c,x,y,W-32,"Say the keyword","locked","Needs “Ferryman”",locked=True)
    else:
        back(c,x,36,"reading");c.t(x,56,"Adventure sheet",F("serif",22,True))
        for i,(l,v) in enumerate([("Talent","9"),("Vitality","3"),("Fortune","3")]): stat(c,x+i*122,84,114,l,v,"/ 3" if i else None)
        c.t(x,176,"Skills",F("serif",17,True));table(c,x,206,W-32,["Skill","Mod"],[["Naturalist (demo)","+2"],["Stealth (demo)","+2"],["Other skills","−2"]],[0,300])
        c.t(x,350,"Inventory",F("serif",17,True));table(c,x,380,W-32,["Item","Tags"],[["Short sword","weapon"],["Wooden shield","shield · heavy"],["Rations ×2","rest"],["Scroll of Light","spell · consumed"]],[0,170])
        c.t(x,560,"Titles",F("serif",17,True));c.box(x,592,250,26,fill=CHIP,outline=CHIP,r=13);c.t(x+12,597,"Friend of the Fisherfolk (demo)",F("sans",12))
    c.d.rectangle((0,H-64,W,H),fill=PANEL);c.d.line((0,H-64,W,H-64),fill=LINE)
    for i,(k,l) in enumerate([("read","Read"),("sheet","Sheet"),("test","Dice"),("log","Log"),("lib","Library"),("rules","Rules")]):
        f=F("sans",11,k==screen);cx=33+i*65;c.t(cx-c.d.textlength(l,font=f)/2,H-36,l,f,ACC if k==screen else MUTED);c.d.ellipse((cx-5,H-54,cx+5,H-44),fill=ACC if k==screen else LINE)
    return c.im
RULES=[("Character",["Talent 9, Vitality 3, Fortune 3 (max 3).","Each Wound costs 1 Vitality (doc sample).","Dice: 2d6."]),
("Tests",["Roll 2d6; pass if total ≤ Talent ± modifier.","Double 1 always passes; double 6 always fails.","Spend Fortune to re-roll a die.","Advantage / Disadvantage re-rolls."]),
("Skills",["+2 if you have the skill, −2 if not.","Item bonuses: only the highest counts."]),
("Fighting",["“Fight N rounds at −X”: a test at −X each round.","Failed round = 1 Wound; fumble adds a Wound.","Armour ignores N wounds per adventure."]),
("Items and spells",["Heavy items limited to 2 × max Vitality.","Scroll spells: test vs 10; scroll destroyed."]),
("Keywords, titles, ticks",["Keywords survive losing items; titles carry over.","Tickboxes: if ticked turn to …, else tick it.","Section 574: reference list of keywords, tickboxes."]),
("Rest and advancement",["Rest with rations.","XP buys stats and skills."]),
("Not in the design doc / not modelled",["Exact Advantage, weapon, shield, armour values.","What happens at Vitality 0.","Rest amounts; XP costs; Fortune cost per re-roll."])]
def rules():
    W,H=1440,900;c=C(W,H);banner(c);side(c,"rules",H);x=268
    back(c,x,40,"reading");header(c,x,"Rules: Temple of the Skull God","Summary of the GNAT rules as listed in the design doc; not the book's wording. GNAT rules by David M. Donachie, CC BY-SA 4.0.",12)
    cw=550
    for i,(h,items) in enumerate(RULES):
        bx=x+(i%2)*(cw+20);by=136+(i//2)*178
        c.box(bx,by,cw,162,outline=MUTED if i==7 else LINE)
        c.t(bx+18,by+14,h,F("serif",17,True));yy=by+46
        for it in items: c.t(bx+18,yy,"• "+it,F("sans",13));yy+=24
    return c.im
shots=[("1-reading",read_desktop()),("2-character-sheet",sheet()),("3-test-fight",test()),("4-keywords-ticks",log()),("5-library-import",lib()),("6-rules",rules()),("7-phone-reading",phone("read")),("8-phone-sheet",phone("sheet"))]
for n,im in shots: im.save(f"previews/{n}.png")
# contact sheet: 5 desktop thumbs (2 rows) + phones
tw,th=640,400;ph=[s[1].resize((int(390*(2*th+24)/844),2*th+24),Image.LANCZOS) for s in shots[6:]]
pw=ph[0].width;S=Image.new("RGB",(24+3*(tw+24)+2*(pw+24),2*th+3*24+60),"#e9e1d2");d=ImageDraw.Draw(S)
d.text((24,18),"Gamebook Player — 6 prototype screens + phone (code-rendered previews, illustrative demo data)",font=F("sans",20,True),fill=INK)
for k,(n,im) in enumerate(shots[:6]): S.paste(im.resize((tw,th),Image.LANCZOS),(24+(k%3)*(tw+24),60+(k//3)*(th+24)))
for i,p in enumerate(ph): S.paste(p,(24+3*(tw+24)+i*(pw+24),60))
S.save("contact-sheet.png")
for f in sorted(os.listdir("previews"))+["../contact-sheet.png"]:
    print(f,Image.open("previews/"+f).size)
