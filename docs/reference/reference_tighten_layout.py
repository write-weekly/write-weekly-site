import sys, json, itertools, functools, re
import pymupdf as fitz

SRC = sys.argv[1]
OUT = sys.argv[2]
FONT = '/home/claude/fonts/Jost-Regular.ttf'
GRAY = (0.27, 0.27, 0.27)

PW, PH = 576, 720
X0, X1 = 72, 504
W = X1 - X0
PHOTO_TOP, PHOTO_BOT = 66, 664
GUT = 8
TEXT_GAP = 22
MIN_REGION = 150
MIN_ROW = 125
MIN_SCALE = 0.8
BAND = (0.851, 0.7882, 0.7216)
MISSION = 'Chile Antofagasta Mission'

src = fitz.open(SRC)
jost = fitz.Font(fontfile=FONT)

# ---------- analyse source pages ----------
info = []
for i, p in enumerate(src):
    hdr, ftr, body = [], [], []
    title = None
    for b in p.get_text('dict')['blocks']:
        if b['type'] != 0:
            continue
        spans = [s for l in b['lines'] for s in l['spans']]
        t = ''.join(s['text'] for s in spans)
        y0, y1 = b['bbox'][1], b['bbox'][3]
        if y1 < 52:
            hdr.append(t)
        elif y0 > 670:
            ftr.append(t)
        else:
            body.append(b['bbox'])
            if spans[0]['size'] >= 30:
                title = t
    imgs = []
    for im in p.get_image_info(xrefs=True):
        if im['width'] < 100:
            continue
        imgs.append(im)
    imgs.sort(key=lambda im: (round(im['bbox'][1]), im['bbox'][0]))
    info.append(dict(i=i, hdr=hdr, ftr=ftr, bot=max([b[3] for b in body], default=None),
                     title=title, imgs=imgs, nbody=len(body)))

# segments: front matter pages 0..7, then weeks starting at title pages, closing page last
first_week = next(k for k in range(8, len(info)) if info[k]['title'])
weeks = []
cur = None
for k in range(first_week, len(info) - 1):
    if info[k]['title']:
        cur = dict(pages=[k])
        weeks.append(cur)
    else:
        cur['pages'].append(k)
closing = len(info) - 1

for w in weeks:
    w['text'] = [k for k in w['pages'] if not info[k]['imgs']]
    w['photo_pages'] = [k for k in w['pages'] if info[k]['imgs']]
    # sanity: photo pages carry no body text
    for k in w['photo_pages']:
        assert info[k]['nbody'] == 0, k
    label = loc = date = None
    for k in w['pages']:
        for h in info[k]['hdr']:
            m = re.match(r'WEEK\s*(\d+)', h)
            if m:
                label = 'WEEK ' + m.group(1)
            elif h.strip() and h.strip() != MISSION and loc is None:
                loc = h.strip()
        for f in info[k]['ftr']:
            m = re.match(r'(.+?)\s*\|\s*\d+$', f)
            if m:
                date = m.group(1).strip()
    w['label'], w['loc'], w['date'] = label, (loc or MISSION), date
    w['photos'] = []
    for k in w['photo_pages']:
        for im in info[k]['imgs']:
            w['photos'].append(im['xref'])
    assert label and date, (w['pages'], label, date)

# ---------- photo layout ----------
aspect = {}
for w in weeks:
    for x in w['photos']:
        d = src.extract_image(x)
        aspect[x] = d['width'] / d['height']


def compositions(n, maxrow=3):
    if n == 0:
        yield []
        return
    for r in range(1, min(maxrow, n) + 1):
        for rest in compositions(n - r, maxrow):
            yield [r] + rest


def orderings(items):
    if len(items) <= 5:
        seen = set()
        for p in itertools.permutations(items):
            key = tuple(round(a, 3) for a in p)
            if key in seen:
                continue
            seen.add(key)
            yield list(p)
    else:
        yield list(items)
        yield sorted(items)
        yield sorted(items, reverse=True)
        s = sorted(items)
        alt = []
        while s:
            alt.append(s.pop(0))
            if s:
                alt.append(s.pop())
        yield alt


@functools.lru_cache(maxsize=None)
def best_layout(asp, H):
    """asp: sorted tuple of aspects. Returns (fill, scale, rows[[aspects]], total_h) or None."""
    n = len(asp)
    best = None
    for order in orderings(list(asp)):
        for comp in compositions(n):
            rows, idx, hs = [], 0, []
            for r in comp:
                row = order[idx:idx + r]
                idx += r
                rows.append(row)
                hs.append((W - GUT * (r - 1)) / sum(row))
            total = sum(hs) + GUT * (len(rows) - 1)
            gaps = GUT * (len(rows) - 1)
            st = (H - gaps) / sum(hs)
            if MIN_STRETCH <= st <= MAX_STRETCH:
                s = 1.0
            elif st > MAX_STRETCH:
                s, st = 1.0, MAX_STRETCH
            else:
                st = MIN_STRETCH
                s = (H - gaps) / (sum(hs) * st)
            if s < MIN_SCALE or min(hs) * s * st < MIN_ROW:
                continue
            used_h = sum(hs) * s * st + gaps
            area = sum(h * s * h * s * st * sum(row) for h, row in zip(hs, rows))
            fill = area / (W * H)
            import math
            cand = (fill - 0.12 * abs(math.log(st)) - 0.02 * (max(hs) - min(hs)) / 600, s, rows, used_h, st)
            if best is None or cand[0] > best[0]:
                best = cand
    return best


def key(xs):
    return tuple(sorted(round(aspect[x], 4) for x in xs))


PAGE_H = PHOTO_BOT - PHOTO_TOP
PAGE_COST = 0.6 * W * PAGE_H
MAX_STRETCH = 1.35
MIN_STRETCH = 0.70


@functools.lru_cache(maxsize=None)
def pack_pages(asp):
    """Return (white_area, [list of aspect-groups per page]) for photo-only pages."""
    if not asp:
        return (0.0, [])
    bl = best_layout(asp, PAGE_H)
    best = None
    if bl:
        best = ((1 - bl[0]) * W * PAGE_H, [asp])
    n = len(asp)
    if n >= 2:
        idxs = range(n)
        for r in range(1, n // 2 + 1):
            for sub in itertools.combinations(idxs, r):
                a = tuple(asp[i] for i in sub)
                b = tuple(asp[i] for i in idxs if i not in sub)
                pa, pb = pack_pages(a), pack_pages(b)
                if pa is None or pb is None:
                    continue
                cand = (pa[0] + pb[0] + PAGE_COST, pa[1] + pb[1])
                if best is None or cand[0] < best[0] - 1:
                    best = cand
    return best


def plan_week(w):
    xs = w['photos']
    last = w['text'][-1]
    region_top = info[last]['bot'] + TEXT_GAP
    region_h = PHOTO_BOT - region_top
    n = len(xs)
    best = None
    for mask in range(1 << n):
        on = [xs[i] for i in range(n) if mask >> i & 1]
        off = [xs[i] for i in range(n) if not mask >> i & 1]
        if on:
            if region_h < MIN_REGION:
                continue
            bl = best_layout(key(on), region_h)
            if not bl:
                continue
            white = (1 - bl[0]) * W * region_h
        else:
            white = W * max(region_h, 0)
        pp = pack_pages(key(off))
        if pp is None:
            continue
        white += pp[0]
        npages = len(pp[1])
        score = white + npages * PAGE_COST
        if best is None or score < best[0]:
            best = (score, on, off, pp[1])
    _, on, off, groups = best
    # assign concrete xrefs to page groups
    pool = list(off)
    pages = []
    for g in groups:
        chosen = []
        for a in g:
            x = next(x for x in pool if round(aspect[x], 4) == a)
            pool.remove(x)
            chosen.append(x)
        pages.append(chosen)
    return dict(on=on, region_top=region_top, region_h=region_h, pages=pages)


from PIL import Image, ImageOps
import io
def cropped(xr, target):
    raw = src.extract_image(xr)['image']
    im = Image.open(io.BytesIO(raw))
    a = im.width / im.height
    if abs(a - target) < 0.005:
        return raw
    icc = im.info.get('icc_profile')
    if a > target:  # too wide: trim sides
        nw = round(im.height * target); x0 = (im.width - nw) // 2
        im = im.crop((x0, 0, x0 + nw, im.height))
    else:  # too tall: trim top/bottom, keep a bit more of the top (faces)
        nh = round(im.width / target); y0 = int((im.height - nh) * 0.4)
        im = im.crop((0, y0, im.width, y0 + nh))
    b = io.BytesIO(); im.convert('RGB').save(b, 'JPEG', quality=90, icc_profile=icc)
    return b.getvalue()


def place(page, xs, top, H, valign):
    bl = best_layout(key(xs), H)
    _, s, rows, total, st = bl
    total = sum((W - GUT * (len(r) - 1)) / sum(r) * s * st for r in rows) + GUT * (len(rows) - 1)
    pool = list(xs)
    y = top if valign == 'top' else top + (H - total) / 2
    for row in rows:
        h0 = (W - GUT * (len(row) - 1)) / sum(row) * s
        h = h0 * st
        rw = sum(a * h0 for a in row) + GUT * (len(row) - 1)
        x = X0 + (W - rw) / 2
        for a in row:
            xr = next(q for q in pool if round(aspect[q], 4) == round(a, 4))
            pool.remove(xr)
            wdt = a * h0
            page.insert_image(fitz.Rect(x, y, x + wdt, y + h), stream=cropped(xr, wdt / h))
            x += wdt + GUT
        y += h + GUT


# ---------- strip old headers/footers in a working copy ----------
work = fitz.open(SRC)
for k in list(range(6, 8)) + [q for w in weeks for q in w['text']]:
    p = work[k]
    p.add_redact_annot(fitz.Rect(40, 34, 536, 52), fill=None)
    p.add_redact_annot(fitz.Rect(40, 674, 536, 694), fill=None)
    p.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE)


def text_right(page, xr, y, s, size=8):
    page.insert_text((xr - jost.text_length(s, size), y), s, fontsize=size, fontfile=FONT, fontname='jost', color=GRAY)


def text_left(page, x, y, s, size=8):
    page.insert_text((x, y), s, fontsize=size, fontfile=FONT, fontname='jost', color=GRAY)


HDR_Y, FTR_Y = 45.6, 686.0


def chrome(page, num, w, header=True, date=None):
    if header:
        if num % 2 == 0:
            text_left(page, X0, HDR_Y, w['loc'])
        else:
            text_right(page, X1, HDR_Y, w['label'])
    if num % 2 == 0:
        text_left(page, X0, FTR_Y, f'{num} | {MISSION}')
    else:
        text_right(page, X1, FTR_Y, f'{date or w["date"]} | {num}')


def photo_page_frame(page):
    page.draw_rect(fitz.Rect(X0, 56.2, X1, 57.0), color=None, fill=(0, 0, 0), width=0)
    page.draw_rect(fitz.Rect(0, 711, PW, 720), color=None, fill=BAND, width=0)


out = fitz.open()
out.insert_pdf(work, from_page=0, to_page=7)
# fix the mis-numbered blessing pages (7, 8)
bless = dict(loc=MISSION, label='', date='Sunday, February 15, 2026')
chrome(out[6], 7, bless, header=False)
chrome(out[7], 8, bless, header=False)

toc_pages = {'Farewell talk': 4, 'Additional file': 7}
stats = []
for wi, w in enumerate(weeks):
    plan = plan_week(w)
    start = len(out) + 1
    toc_pages[w['label']] = start
    for j, k in enumerate(w['text']):
        out.insert_pdf(work, from_page=k, to_page=k)
        pg = out[-1]
        num = len(out)
        chrome(pg, num, w, header=(j > 0))
        if k == w['text'][-1] and plan['on']:
            place(pg, plan['on'], plan['region_top'], plan['region_h'], 'top')
    for xs in plan['pages']:
        pg = out.new_page(width=PW, height=PH)
        photo_page_frame(pg)
        chrome(pg, len(out), w)
        place(pg, xs, PHOTO_TOP, PAGE_H, 'middle')
    stats.append((w['label'], len(w['pages']), len(w['text']) + len(plan['pages']), len(plan['on']), len(w['photos'])))

if (len(out) + 1) % 2 == 1:
    pass
out.insert_pdf(work, from_page=closing, to_page=closing)

# ---------- update table of contents ----------
for tp in (1, 2):
    p = out[tp]
    spans = [sp for bl in p.get_text('dict')['blocks'] if bl['type'] == 0
             for l in bl['lines'] for sp in l['spans']]
    labels = []
    for sp in spans:
        t = sp['text'].strip()
        if sp['bbox'][0] < 60 and (t.startswith('WEEK') or t in ('Farewell talk', 'Additional file')):
            labels.append((sp, t))
    nums = [sp for sp in spans if sp['text'].strip().isdigit() and sp['bbox'][0] > 495 and sp['bbox'][1] < 670]
    edits = []
    for sp, t in labels:
        if t.startswith('WEEK'):
            # week number is in the following span ("1.")
            idx = spans.index(sp)
            m = re.match(r'(\d+)', spans[idx + 1]['text'].strip())
            name = 'WEEK ' + m.group(1)
        else:
            name = t
        yc = (sp['bbox'][1] + sp['bbox'][3]) / 2
        nsp = min(nums, key=lambda n: abs((n['bbox'][1] + n['bbox'][3]) / 2 - yc))
        assert abs((nsp['bbox'][1] + nsp['bbox'][3]) / 2 - yc) < 5, name
        edits.append((fitz.Rect(nsp['bbox']), toc_pages[name], nsp['origin'][1], nsp['size']))
    for r, _, _, _ in edits:
        p.add_redact_annot(r + (-1, -0.5, 1, 0.5), fill=None)
    p.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE)
    for r, num, base, size in edits:
        text_right(p, r.x1, base, str(num), size=size)
    print('toc page', tp + 1, 'updated', len(edits))

out.save(OUT, garbage=4, deflate=True)
print('pages', len(src), '->', len(out))
for s in stats:
    print(s)
json.dump(toc_pages, open('/home/claude/work/toc.json', 'w'), indent=1)
