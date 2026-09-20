"""Render real application analytics as PNG/GIF, never as fabricated UI screenshots.

Optional build-time packages: matplotlib and Pillow. The web app does not need Python.
Run node scripts/export-analytics.mjs first, then python scripts/render-media.py.
"""
import io
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'media'
DATA = json.loads((OUT / 'analytics.json').read_text(encoding='utf-8'))
FONT = Path('C:/Windows/Fonts/msyh.ttc')
if FONT.exists():
    font_manager.fontManager.addfont(str(FONT))
    plt.rcParams['font.family'] = font_manager.FontProperties(fname=str(FONT)).get_name()
plt.rcParams.update({'axes.spines.top': False, 'axes.spines.right': False,
                     'axes.spines.left': False, 'axes.spines.bottom': False,
                     'axes.labelcolor': '#76856e', 'text.color': '#263d35',
                     'xtick.color': '#83917b', 'ytick.color': '#52684b',
                     'font.size': 10, 'figure.facecolor': '#f6f7f3',
                     'axes.facecolor': '#ffffff'})
COLORS = ['#315f48', '#9581b5', '#d29770']


def canvas(title, subtitle):
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=120)
    fig.subplots_adjust(left=.25, right=.93, bottom=.17, top=.76)
    fig.text(.06, .92, 'VISION TRENDS  /  视界', fontsize=11, color='#7e926c')
    fig.text(.06, .84, title, fontsize=23, weight='bold')
    fig.text(.06, .79, subtitle, fontsize=10, color='#83917b')
    fig.text(.06, .06, '数据：CVF / ECVA 官方公开论文 · 已入库样本，非会议全量 · 由应用统计模块导出', fontsize=9, color='#8b987e')
    return fig, ax


def raster(fig):
    data = io.BytesIO()
    fig.savefig(data, format='png', dpi=120)
    plt.close(fig)
    data.seek(0)
    return Image.open(data).convert('RGB')


def ranking(summary, title):
    fig, ax = canvas(title, f"{summary['total']} 篇样本 · 每篇每词只计一次 · 关键词为词典提取标签")
    topics = summary['top10']
    values = [t['count'] for t in topics]
    ax.barh([t['name'] for t in topics], values, color=['#315f48'] + ['#a9bc88'] * (len(topics) - 1), height=.58)
    ax.invert_yaxis()
    ax.set_xlim(0, max(values, default=1) * 1.17)
    ax.tick_params(axis='both', length=0, labelsize=10)
    ax.set_xlabel('关键词命中论文数', fontsize=10)
    for i, value in enumerate(values):
        ax.text(value + .5, i, str(value), va='center', fontsize=10, color='#5e7651')
    ax.grid(axis='x', alpha=.13)
    ax.set_axisbelow(True)
    return raster(fig)


ranking(DATA['summary'], '看见值得探索的方向 · Top 10').save(OUT / 'top10.png')
annual_frames = []
for item in DATA['annual']:
    frame = ranking(item, f"{item['year']} · 年度研究方向 Top 10")
    frame.save(OUT / f"annual-{item['year']}.png")
    annual_frames.append(frame)
annual_frames[0].save(OUT / 'annual-evolution.gif', save_all=True, append_images=annual_frames[1:], duration=1500, loop=0, optimize=True)

trend = DATA['diffusion']
frames = []
for end_year in trend['years']:
    fig, ax = canvas('Diffusion models · 三会热度走势', f'2022—{end_year} · 热度 = 命中论文数 / 同届已采集样本数 × 100%')
    fig.subplots_adjust(left=.1, right=.92, bottom=.2, top=.7)
    for index, series in enumerate(trend['series']):
        points = [p for p in series['points'] if p['percent'] is not None and p['year'] <= end_year]
        ax.plot([p['year'] for p in points], [p['percent'] for p in points],
                color=COLORS[index], marker='o', markersize=7,
                linewidth=2.5, linestyle='-' if index == 0 else '--', label=series['conference'])
        for p in points:
            ax.annotate(f"{p['count']}/{p['total']}", (p['year'], p['percent']), xytext=(0, 12 + index * 3),
                        textcoords='offset points', ha='center', fontsize=9, color=COLORS[index])
    max_y = max(p['percent'] or 0 for s in trend['series'] for p in s['points'])
    ax.set_ylim(0, max(10, max_y * 1.3))
    ax.set_xlim(2021.85, 2025.15)
    ax.set_xticks(trend['years'])
    ax.set_ylabel('样本占比 / %')
    ax.grid(axis='y', alpha=.15)
    ax.legend(frameon=False, loc='upper left', ncol=3, bbox_to_anchor=(0, 1.16))
    fig.text(.1, .11, '虚线连接已举办且已采集届次；ICCV 偶数年、ECCV 奇数年不补零。标签为命中篇数/样本数。', fontsize=9, color='#829475')
    frame = raster(fig)
    frame.save(OUT / f'trend-{end_year}.png')
    frames.append(frame)
frames[-1].save(OUT / 'trend-comparison.png')
frames[0].save(OUT / 'trend-comparison.gif', save_all=True, append_images=frames[1:], duration=1500, loop=0, optimize=True)

fig, ax = canvas('关键词之间，也有连接', '共现图谱 · 节点为研究方向，连线为同篇论文共同出现')
fig.subplots_adjust(left=.08, right=.94, bottom=.12, top=.73)
import math
nodes = DATA['summary']['graph']['nodes'][:12]
positions = {node['name']: (math.cos(i * 2 * math.pi / len(nodes)), math.sin(i * 2 * math.pi / len(nodes))) for i, node in enumerate(nodes)}
for edge in DATA['summary']['graph']['edges']:
    if edge['source'] in positions and edge['target'] in positions:
        a, b = positions[edge['source']], positions[edge['target']]
        ax.plot([a[0], b[0]], [a[1], b[1]], color='#c7d5b0', alpha=.5, linewidth=min(4, edge['weight'] / 3 + .5), zorder=0)
for i, node in enumerate(nodes):
    x, y = positions[node['name']]
    ax.scatter([x], [y], s=250 + node['count'] * 25, color='#d5e3ba' if i else '#517545', edgecolors='white', linewidths=2, zorder=2)
    ax.text(x, y, str(node['count']), va='center', ha='center', fontsize=10, color='white' if i == 0 else '#5a734b', zorder=3)
    ax.text(x * 1.19, y * 1.21, node['name'], va='center', ha='center', fontsize=9)
ax.set_xlim(-1.65, 1.65)
ax.set_ylim(-1.45, 1.45)
ax.axis('off')
raster(fig).save(OUT / 'keyword-network.png')
print('Rendered 11 PNG analytics images and 2 real-data GIFs; these are not UI screenshots.')
