#!/usr/bin/env python3
"""
将 mypilot-icons-svg/ 转换为 SF Symbols 7 模板 SVG。
直接变换路径坐标到设计空间（不用嵌套 transform）。

用法：
  python3 scripts/convert_to_sf_symbol_templates.py
"""

import re
import xml.etree.ElementTree as ET
from pathlib import Path

INPUT_DIR = Path(__file__).parent.parent / "mypilot-icons-svg"
OUTPUT_DIR = Path(__file__).parent.parent / "output-sf-templates"

CANVAS_W = 3300
CANVAS_H = 2200
BASELINE_Y = 696
VARIANT_X = {"Ultralight": 523.942, "Regular": 1410.15, "Black": 2885.55}
MARGIN_LEFT = 263
MARGIN_RIGHT = 3036
SCALE = 5.5


# ── SVG Path 解析与变换 ────────────────────────────────

def tokenize_path(d: str) -> list:
    """
    将 path d 字符串拆分为 token 列表。
    每个 token 是 ('cmd', 'M') 或 ('num', 3.14) 或 ('flag', 1)。
    """
    tokens = []
    i = 0
    while i < len(d):
        c = d[i]
        if c in "MmLlHhVvCcSsQqTtAaZz":
            tokens.append(("cmd", c))
            i += 1
        elif c in ", \t\n\r":
            i += 1
        elif c == "-" or c.isdigit() or c == ".":
            # 读一个数字（可能带负号）
            j = i
            if d[j] == "-":
                j += 1
            has_dot = False
            while j < len(d) and (d[j].isdigit() or (d[j] == "." and not has_dot)):
                if d[j] == ".":
                    has_dot = True
                j += 1
            # 处理科学计数法中的 e/E
            if j < len(d) and d[j] in "eE":
                j += 1
                if j < len(d) and d[j] in "+-":
                    j += 1
                while j < len(d) and d[j].isdigit():
                    j += 1
            num_str = d[i:j]
            tokens.append(("num", float(num_str)))
            i = j
        else:
            i += 1
    return tokens


def get_param_counts(cmd: str) -> int:
    """返回每个命令的参数数量。"""
    counts = {
        "M": 2, "m": 2,
        "L": 2, "l": 2,
        "H": 1, "h": 1,
        "V": 1, "v": 1,
        "C": 6, "c": 6,
        "S": 4, "s": 4,
        "Q": 4, "q": 4,
        "T": 2, "t": 2,
        "A": 7, "a": 7,
        "Z": 0, "z": 0,
    }
    return counts.get(cmd.upper(), 0)


def get_xy_indices(cmd: str, param_idx: int) -> int | None:
    """
    返回参数在当前命令中的 X/Y 角色。
    0 = X 坐标，1 = Y 坐标，None = 非坐标参数（如 rx, ry, rot, flags）。

    cmd: 命令字符（大写=绝对，小写=相对）
    param_idx: 当前命令内的第几个参数（从 0 开始）
    """
    cu = cmd.upper()
    if cu == "M" or cu == "L":
        return 0 if param_idx % 2 == 0 else 1
    elif cu == "H":
        return 0
    elif cu == "V":
        return 1
    elif cu == "C":
        # C: x1 y1 x2 y2 x y → 最后两个是端点坐标
        if param_idx >= 4:
            return 0 if param_idx % 2 == 0 else 1
        return None  # 控制点也参与变换
    elif cu == "S":
        # S: x2 y2 x y → 后两个是端点
        if param_idx >= 2:
            return 0 if param_idx % 2 == 0 else 1
        return None
    elif cu == "Q":
        # Q: x1 y1 x y → 后两个是端点
        if param_idx >= 2:
            return 0 if param_idx % 2 == 0 else 1
        return None
    elif cu == "T":
        return 0 if param_idx % 2 == 0 else 1
    elif cu == "A":
        # A: rx ry rot large sweep x y → 最后两个是端点
        if param_idx >= 5:
            return 0 if param_idx == 5 else 1
        return None
    return None


def transform_path_d(d: str, ox: float, oy: float, s: float) -> str:
    """变换 path 的 d 属性字符串中所有坐标。"""
    tokens = tokenize_path(d)

    result_parts = []
    cur_x = 0.0  # 跟踪当前位置（用于相对命令）
    cur_y = 0.0
    first_move = True

    i = 0
    while i < len(tokens):
        ttype, tval = tokens[i]

        if ttype == "cmd":
            result_parts.append(tval)
            if tval.upper() == "M":
                first_move = True
            i += 1
            continue

        # 收集当前命令的所有数值参数
        cmd = result_parts[-1] if result_parts else "M"
        n_params = get_param_counts(cmd)
        if n_params == 0:
            i += 1
            continue

        params = []
        for p in range(n_params):
            if i + p < len(tokens) and tokens[i + p][0] == "num":
                params.append(tokens[i + p][1])
            else:
                break

        # 变换每个参数
        transformed = []
        is_abs = cmd.isupper()

        for pi, pv in enumerate(params):
            role = get_xy_indices(cmd, pi)

            if role is not None:
                if is_abs or (not is_abs and not first_move):
                    offset = ox if role == 0 else oy
                    new_val = (pv + offset) * s
                else:
                    # 相对 m 的第一个点：偏移为 0
                    new_val = pv * s
                transformed.append(f"{new_val:.4f}")
            else:
                # 非坐标参数：只缩放（rx, ry 等）
                transformed.append(f"{pv * s:.4f}")

        # 更新当前位置
        if cmd.upper() in ("M", "L", "T") or (
            cmd.lower() in ("m", "l", "t") and len(transformed) >= 2
        ):
            last_x = float(transformed[-2])
            last_y = float(transformed[-1])
            if is_abs or (not is_abs and not first_move):
                cur_x = last_x
                cur_y = last_y
            else:
                cur_x += last_x
                cur_y += last_y
            first_move = False
        elif cmd.upper() == "H":
            val = float(transformed[-1])
            cur_x = val if is_abs else cur_x + val
        elif cmd.upper() == "V":
            val = float(transformed[-1])
            cur_y = val if is_abs else cur_y + val
        elif cmd.upper() in ("C", "S", "Q", "A"):
            if len(transformed) >= 2:
                ex = float(transformed[-2])
                ey = float(transformed[-1])
                if is_abs:
                    cur_x, cur_y = ex, ey
                else:
                    cur_x += ex
                    cur_y += ey

        result_parts.extend(transformed)
        i += len(params)

    return "".join(result_parts)


# ── SVG 元素变换 ─────────────────────────────────────

def transform_svg_body(svg_text: str, ox: float, oy: float, s: float) -> str:
    """变换 SVG body 中所有元素的坐标属性。"""
    # 包装在 <g> 中以支持多个根元素
    wrapped = f"<g>{svg_text}</g>"
    try:
        root = ET.fromstring(wrapped)
    except ET.ParseError:
        # fallback: 逐行解析
        return _transform_fallback(svg_text, ox, oy, s)

    for elem in root.iter():
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag

        # 处理 path 的 d 属性
        if tag == "path":
            d = elem.get("d")
            if d:
                elem.set("d", transform_path_d(d, ox, oy, s))

        # 处理其他形状元素
        for attr in ("cx", "cy", "x", "y", "x1", "y1", "x2", "y2",
                      "width", "height", "rx", "ry", "r"):
            val = elem.get(attr)
            if val is not None:
                nums = re.findall(r"-?(?:\d+\.?\d*|\.\d+)", val)
                if nums:
                    is_x = attr in ("cx", "x", "x1", "x2", "rx", "width", "r")
                    off = ox if is_x else oy
                    new_val = val
                    # 从后往前替换
                    for n in reversed(nums):
                        new_v = (float(n) + off) * s
                        new_val = new_val.replace(n, f"{new_v:.4f}", 1)
                    elem.set(attr, new_val)

        # 处理 points 属性（polygon/polyline）
        points = elem.get("points")
        if points:
            nums = re.findall(r"-?(?:\d+\.?\d*|\.\d+)", points)
            new_nums = []
            for idx, n in enumerate(nums):
                off = ox if idx % 2 == 0 else oy
                new_nums.append(f"{(float(n) + off) * s:.4f}")
            elem.set("points", " ".join(new_nums))

        # 缩放 stroke-width
        sw = elem.get("stroke-width")
        if sw:
            try:
                elem.set("stroke-width", f"{float(sw) * s:.4f}")
            except ValueError:
                pass

    result = ET.tostring(root, encoding="unicode")
    # 去掉包装的 <g> 标签
    if result.startswith("<g>") and result.endswith("</g>"):
        result = result[3:-4]
    return result


def _transform_fallback(svg_text: str, ox: float, oy: float, s: float) -> str:
    """Fallback：用正则直接替换所有数字（不区分 X/Y，统一偏移）。"""
    def replace_num(m):
        v = float(m.group(0))
        return f"{v * s:.4f}"
    # 简单缩放所有数字
    return re.sub(r"-?(?:\d+\.?\d*|\.\d+)", replace_num, svg_text)


# ── Bounding Box ───────────────────────────────────────

def get_bounding_box(svg_text: str) -> tuple[float, float, float, float]:
    """返回 (min_x, min_y, max_x, max_y)"""
    root = ET.fromstring(svg_text)
    nums = []
    for elem in root.iter():
        for attr in ("d", "cx", "cy", "x", "y", "x1", "y1", "x2", "y2",
                      "width", "height", "rx", "ry", "r", "points"):
            val = elem.get(attr, "")
            if val:
                nums.extend([float(x) for x in re.findall(r"-?(?:\d+\.?\d*|\.\d+)", val)])
    if len(nums) < 2:
        return 0, 0, 24, 24
    xs = nums[::2]
    ys = nums[1::2]
    return min(xs), min(ys), max(xs), max(ys)


# ── 模板生成 ──────────────────────────────────────────

NOTES_TEMPLATE = ''' <g id="Notes">
  <rect height="{H}" id="artboard" style="fill:white;opacity:1" width="{W}" x="0" y="0"/>
  <line style="fill:none;stroke:black;opacity:1;stroke-width:0.5;" x1="{ML}" x2="{MR}" y1="292" y2="292"/>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;font-weight:bold;" transform="matrix(1 0 0 1 {ML} 322)">Weight/Scale Variations</text>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;text-anchor:middle;" transform="matrix(1 0 0 1 559.711 322)">Ultralight</text>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;text-anchor:middle;" transform="matrix(1 0 0 1 856.422 322)">Thin</text>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;text-anchor:middle;" transform="matrix(1 0 0 1 1153.13 322)">Light</text>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;text-anchor:middle;" transform="matrix(1 0 0 1 1449.84 322)">Regular</text>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;text-anchor:middle;" transform="matrix(1 0 0 1 1746.56 322)">Medium</text>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;text-anchor:middle;" transform="matrix(1 0 0 1 2043.27 322)">Semibold</text>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;text-anchor:middle;" transform="matrix(1 0 0 1 2339.98 322)">Bold</text>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;text-anchor:middle;" transform="matrix(1 0 0 1 2636.69 322)">Heavy</text>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;text-anchor:middle;" transform="matrix(1 0 0 1 2933.4 322)">Black</text>
  <line style="fill:none;stroke:black;opacity:1;stroke-width:0.5;" x1="{ML}" x2="{MR}" y1="1903" y2="1903"/>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;font-weight:bold;" transform="matrix(1 0 0 1 {ML} 1953)">Design Variations</text>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;" transform="matrix(1 0 0 1 {ML} 1971)">Symbols are supported in up to nine weights and three scales.</text>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;" transform="matrix(1 0 0 1 {ML} 1989)">For optimal layout with text and other symbols, vertically align symbols with the adjacent text.</text>
  <line style="fill:none;stroke:#00AEEF;stroke-width:0.5;opacity:1.0;" x1="776" x2="776" y1="1919" y2="1933"/>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;font-weight:bold;" transform="matrix(1 0 0 1 776 1953)">Margins</text>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;" transform="matrix(1 0 0 1 776 1971)">Leading and trailing margins can be adjusted by modifying margin guidelines.</text>
  <line style="fill:none;stroke:#00AEEF;stroke-width:0.5;opacity:1.0;" x1="792.836" x2="792.836" y1="1919" y2="1933"/>
  <g transform="matrix(0.2 0 0 0.2 1289 1933)">
   <path d="m14.209 13.1348 7.86133 7.86133c4.29688 4.39453 9.32617 4.10156 13.8672-1.02539l60.6934-68.2129-4.88281-4.88281-60.2539 67.6758c-1.80664 1.95312-3.4668 2.44141-5.81055 0.0976562l-5.17578-5.12695c-2.29492-2.29492-1.80664-3.95508 0.195312-5.81055l67.4805-62.1582-4.88281-4.83398-68.0664 62.5977c-4.98047 4.58984-5.32227 9.47266-1.02539 13.8184Zm44.873-97.4609c-2.05078 2.00195-2.24609 4.88281-1.07422 6.78711 1.12305 1.80664 3.4668 3.02734 6.5918 2.24609 5.85938-1.66016 12.5977-2.39258 18.8965 0.927734l-2.68555 7.12891c-1.61133 4.00391-0.732422 6.88477 1.70898 9.42383l10.2539 10.3027c2.34375 2.39258 4.54102 2.44141 7.08008 1.95312l4.44336-0.732422 2.58789 2.53906-0.195312 2.24609c-0.0976562 2.29492 0.537109 4.29688 2.7832 6.49414l3.36914 3.32031c2.29492 2.29492 5.51758 2.49023 7.8125 0.195312l12.9883-13.0371c2.29492-2.34375 2.14844-5.37109-0.195312-7.66602l-3.41797-3.41797c-2.19727-2.19727-4.05273-3.02734-6.34766-2.88086l-2.34375 0.244141-2.44141-2.44141 1.02539-4.6875c0.634766-2.73438-0.244141-4.98047-2.88086-7.61719l-11.2793-11.1816c-12.9395-12.8418-35.5957-11.0352-46.6797-0.146484Z"/>
  </g>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;font-weight:bold;" transform="matrix(1 0 0 1 1289 1953)">Exporting</text>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;" transform="matrix(1 0 0 1 1289 1971)">Symbols should be outlined when exporting.</text>
  <text id="template-version" style="stroke:none;fill:black;font-family:sans-serif;font-size:13;text-anchor:end;" transform="matrix(1 0 0 1 {MR} 1933)">Template v.7.0</text>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;text-anchor:end;" transform="matrix(1 0 0 1 {MR} 1951)">Requires Xcode 26 or greater</text>
  <text id="descriptive-name" style="stroke:none;fill:black;font-family:sans-serif;font-size:13;text-anchor:end;" transform="matrix(1 0 0 1 {MR} 1969)">Generated from {name}</text>
  <text style="stroke:none;fill:black;font-family:sans-serif;font-size:13;text-anchor:end;" transform="matrix(1 0 0 1 {MR} 1987)">Typeset at 100.0 points</text>
 </g>'''

GUIDES_TEMPLATE = ''' <g id="Guides">
  <g id="H-reference" style="fill:#27AAE1;stroke:none;" transform="matrix(1 0 0 1 339 696)">
   <path d="M0.993654 0L3.63775 0L29.3281-67.1323L30.0303-67.1323L30.0303-70.459L28.1226-70.459ZM11.6885-24.4799L46.9815-24.4799L46.2315-26.7285L12.4385-26.7285ZM55.1196 0L57.7637 0L30.6382-70.459L29.4326-70.459L29.4326-67.1323Z"/>
  </g>
  <line id="Baseline-S" style="fill:none;stroke:#27AAE1;opacity:1;stroke-width:0.5;" x1="{ML}" x2="{MR}" y1="696" y2="696"/>
  <line id="Capline-S" style="fill:none;stroke:#27AAE1;opacity:1;stroke-width:0.5;" x1="{ML}" x2="{MR}" y1="625.541" y2="625.541"/>
  <g id="H-reference" style="fill:#27AAE1;stroke:none;" transform="matrix(1 0 0 1 339 1126)">
   <path d="M0.993654 0L3.63775 0L29.3281-67.1323L30.0303-67.1323L30.0303-70.459L28.1226-70.459ZM11.6885-24.4799L46.9815-24.4799L46.2315-26.7285L12.4385-26.7285ZM55.1196 0L57.7637 0L30.6382-70.459L29.4326-70.459L29.4326-67.1323Z"/>
  </g>
  <line id="Baseline-M" style="fill:none;stroke:#27AAE1;opacity:1;stroke-width:0.5;" x1="{ML}" x2="{MR}" y1="1126" y2="1126"/>
  <line id="Capline-M" style="fill:none;stroke:#27AAE1;opacity:1;stroke-width:0.5;" x1="{ML}" x2="{MR}" y1="1055.54" y2="1055.54"/>
  <g id="H-reference" style="fill:#27AAE1;stroke:none;" transform="matrix(1 0 0 1 339 1556)">
   <path d="M0.993654 0L3.63775 0L29.3281-67.1323L30.0303-67.1323L30.0303-70.459L28.1226-70.459ZM11.6885-24.4799L46.9815-24.4799L46.2315-26.7285L12.4385-26.7285ZM55.1196 0L57.7637 0L30.6382-70.459L29.4326-70.459L29.4326-67.1323Z"/>
  </g>
  <line id="Baseline-L" style="fill:none;stroke:#27AAE1;opacity:1;stroke-width:0.5;" x1="{ML}" x2="{MR}" y1="1556" y2="1556"/>
  <line id="Capline-L" style="fill:none;stroke:#27AAE1;opacity:1;stroke-width:0.5;" x1="{ML}" x2="{MR}" y1="1485.54" y2="1485.54"/>
  <line id="right-margin-Black-S" style="fill:none;stroke:#00AEEF;stroke-width:0.5;opacity:1.0;" x1="2981.25" x2="2981.25" y1="600.785" y2="720.121"/>
  <line id="left-margin-Black-S" style="fill:none;stroke:#00AEEF;stroke-width:0.5;opacity:1.0;" x1="2885.55" x2="2885.55" y1="600.785" y2="720.121"/>
  <line id="right-margin-Regular-S" style="fill:none;stroke:#00AEEF;stroke-width:0.5;opacity:1.0;" x1="1489.54" x2="1489.54" y1="600.785" y2="720.121"/>
  <line id="left-margin-Regular-S" style="fill:none;stroke:#00AEEF;stroke-width:0.5;opacity:1.0;" x1="1410.15" x2="1410.15" y1="600.785" y2="720.121"/>
  <line id="right-margin-Ultralight-S" style="fill:none;stroke:#00AEEF;stroke-width:0.5;opacity:1.0;" x1="595.48" x2="595.48" y1="600.785" y2="720.121"/>
  <line id="left-margin-Ultralight-S" style="fill:none;stroke:#00AEEF;stroke-width:0.5;opacity:1.0;" x1="523.942" x2="523.942" y1="600.785" y2="720.121"/>
 </g>'''


def extract_all_paths_d(transformed_body: str) -> list[str]:
    """从变换后的 body 中提取所有 path 的 d 属性值。"""
    return re.findall(r'd="([^"]*)"', transformed_body)


def build_template_svg(name: str, transformed_body: str) -> str:
    ds = extract_all_paths_d(transformed_body)
    combined_d = " ".join(ds) if ds else ""

    variants = ""
    for vid, vx in [("Ultralight-S", VARIANT_X["Ultralight"]),
                     ("Regular-S", VARIANT_X["Regular"]),
                     ("Black-S", VARIANT_X["Black"])]:
        variants += f'  <g id="{vid}" transform="matrix(1 0 0 1 {vx} {BASELINE_Y})">\n'
        variants += f'   <path class="SFSymbolsPreviewWireframe" d="{combined_d}"/>\n'
        variants += "  </g>\n"

    notes = NOTES_TEMPLATE.format(H=CANVAS_H, W=CANVAS_W, ML=MARGIN_LEFT,
                                   MR=MARGIN_RIGHT, name=name)
    guides = GUIDES_TEMPLATE.format(ML=MARGIN_LEFT, MR=MARGIN_RIGHT)

    return f'''<?xml version="1.0" encoding="UTF-8"?>
<!--Generator: Apple Native CoreSVG 341-->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {CANVAS_W} {CANVAS_H}">
 <!--glyph: "{name}", point size: 100.0, font version: "21.1d1e1", template writer version: "138.0.0"-->
 <style>.SFSymbolsPreviewWireframe {{fill:none;opacity:1.0;stroke:black;stroke-width:0.5}}</style>
{notes}
{guides}
 <g id="Symbols">
{variants} </g>
</svg>'''


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    svg_files = sorted(INPUT_DIR.glob("mp.*.svg"))
    print(f"Found {len(svg_files)} SVG files")

    success = fail = 0
    for sf in svg_files:
        name = sf.stem
        try:
            text = sf.read_text()
            bb_min_x, bb_min_y, bb_max_x, bb_max_y = get_bounding_box(text)
            cx = (bb_min_x + bb_max_x) / 2
            max_y = bb_max_y
            ox, oy = -cx, -max_y

            body = text
            # 去掉外层 svg 标签
            body = re.sub(r'<\?xml[^?]*\?>', '', body)
            body = re.sub(r'<svg[^>]*/?>', '', body)
            body = re.sub(r'</svg>', '', body).strip()

            transformed = transform_svg_body(body, ox, oy, SCALE)
            svg_content = build_template_svg(name, transformed)

            out = OUTPUT_DIR / f"{name}.symboltemplate.svg"
            out.write_text(svg_content)
            print(f"  OK   {name}")
            success += 1
        except Exception as e:
            print(f"  FAIL {name}: {e}")
            import traceback
            traceback.print_exc()
            fail += 1

    print(f"\nDone! {success} ok, {fail} failed")


if __name__ == "__main__":
    main()
