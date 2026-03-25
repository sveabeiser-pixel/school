import os
import re

unified_css = """
  <style>
    .sw-sim-card {
      border: 1px solid var(--wb-line, #e5e7eb);
      border-radius: 14px;
      padding: 14px;
      background: var(--wb-text-bg, #fff);
      box-shadow: var(--wb-shadow, 0 6px 20px rgba(0, 0, 0, .08));
      margin: 14px 0;
    }

    .sw-sim-grid {
      display: grid;
      grid-template-columns: 0.8fr 1.2fr;
      gap: 14px;
      align-items: start;
    }

    @media (max-width: 900px) {
      .sw-sim-grid {
        grid-template-columns: 1fr;
      }
    }

    .sw-sim-controls label {
      display: block;
      font-weight: 900;
      margin: 10px 0 6px;
    }

    .sw-sim-controls input[type="range"],
    .sw-sim-controls select {
      width: 100%;
    }

    .sw-sim-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 13px;
      color: var(--wb-muted, #6b7280);
      white-space: pre-wrap;
      margin-top: 8px;
    }

    .wb-book[data-theme="grau"] .sw-sim-card,
    .wb-book[data-theme="dark"] .sw-sim-card {
      background: rgba(255, 255, 255, 0.18);
    }
  </style>
"""

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    # Determine old prefix for the file
    old_prefix = None
    if "wt-sim-card" in html:
        old_prefix = "wt"
    elif "int-sim-card" in html:
        old_prefix = "int"
    elif "sim-card" in html and "sw-sim-card" not in html[0:1000]:
        old_prefix = "" # sim-card in Interferenz2.html
    elif "sw-sim-card" in html:
        old_prefix = "sw"
        
    print(f"Processing {filepath}: prefix='{old_prefix}'")

    # 1. Update CSS
    # Let's remove any style block that defines the old sim wrapper, and replace with new.
    # We will find the existing <style> block containing the card class and replace the entire <style> block.
    # The files typically have one <style> block for the simulation.
    if old_prefix == "":
        pattern_css = r'<style>\s*\.sim-card\s*\{.*?</style>'
    else:
        pattern_css = fr'<style>\s*\.{old_prefix}-sim-card\s*\{{.*?</style>'
        
    if re.search(pattern_css, html, re.DOTALL):
        html = re.sub(pattern_css, unified_css.strip(), html, flags=re.DOTALL)
    elif '<style>' in html and f'.{old_prefix}-sim-card' in html:
        # manual fallback if it's merged with other styles
        # actually, all these files have discrete <style> blocks for the sim.
        pass

    # 2. Update the HTML structure
    if old_prefix == "":
        html = html.replace('class="sim-card"', 'class="sw-sim-card"')
        html = html.replace('class="sim-grid"', 'class="sw-sim-grid"')
        html = html.replace('class="sim-controls"', 'class="sw-sim-controls"')
        html = html.replace('class="sim-mono"', 'class="sw-sim-mono"')
    elif old_prefix is not None and old_prefix != "sw":
        html = html.replace(f'class="{old_prefix}-sim-card"', 'class="sw-sim-card"')
        html = html.replace(f'class="{old_prefix}-sim-grid"', 'class="sw-sim-grid"')
        html = html.replace(f'class="{old_prefix}-sim-controls"', 'class="sw-sim-controls"')
        html = html.replace(f'class="{old_prefix}-sim-mono"', 'class="sw-sim-mono"')

    # 3. Swap the grid columns (Controls on Left, Canvas on Right)
    # The current order for Einstieg, Interferenz, Interferenz2 is:
    # <div class="sw-sim-grid">
    #   <div> <canvas ...> ... </div>
    #   <div class="sw-sim-controls"> ... </div>
    # </div>
    
    # We want: <div class="sw-sim-grid"> <div class="sw-sim-controls"> ... </div> <div> <canvas ...> ... </div> </div>
    
    def swap_grid_items(m):
        prefix = m.group(1)
        canvas_div = m.group(2)
        controls_div = m.group(3)
        suffix = m.group(4)
        print(f"  Swapped a grid in {os.path.basename(filepath)}")
        return f'{prefix}{controls_div}\n          {canvas_div}{suffix}'

    pattern_grid_swap = r'(<div class="sw-sim-grid">\s*)(<div>\s*<canvas.*?</canvas>\s*<div class="sw-sim-mono"[^>]*></div>\s*</div>)(\s*<div class="sw-sim-controls">.*?</div>\s*)(</div>)'
    
    # Run the swap (we will run it multiple times since there are multiple grids per file)
    html = re.sub(pattern_grid_swap, swap_grid_items, html, flags=re.DOTALL)

    # For stehende-Welle.html, it's different. It doesn't have a grid wrapper at all for many blocks!
    # They look like:
    # <div class="sw-sim-card">
    #   <div>
    #     <canvas ...></canvas>
    #     <div class="sw-sim-mono" ...></div>
    #     <label ...>
    #     <input ...>
    #     ...
    #     <div class="wb-row" ...> buttons </div>
    #   </div>
    # </div>
    
    if "stehende-Welle.html" in filepath:
        # We need to extract the controls.
        # Everything from the first <label> up to the <div class="wb-row"> needs to be inside a .sw-sim-controls div.
        # And wrapped inside a .sw-sim-grid.
        
        def fix_stehende_welle(m):
            prefix = m.group(1) # <div class="sw-sim-card">\s*<div>\s*
            canvas_part = m.group(2) # <canvas ...> ... <div...mono...></div>
            controls_part = m.group(3) # <label ...> ... <div...mono...></div>
            buttons_part = m.group(4) # <div class="wb-row" ... </div>
            suffix = m.group(5) # \s*</div>\s*</div>
            
            print(f"  Fixed stehende_welle grid")
            
            new_structure = f"""<div class="sw-sim-card">
        <div class="sw-sim-grid">
          <div class="sw-sim-controls">
{controls_part}          </div>
          <div>
{canvas_part}{buttons_part}          </div>
        </div>
      </div>"""
            return new_structure

        pattern_sw = r'(<div class=\"sw-sim-card\">\s*<div>\s*)(<canvas[^>]+>.*?</canvas>\s*<div class=\"sw-sim-mono\"[^>]*>.*?</div>\s*)(<label[^>]+>.*?)(<div class=\"wb-row\"[^>]*>.*?</div>\s*)(\s*</div>\s*</div>)'
        html = re.sub(pattern_sw, fix_stehende_welle, html, flags=re.DOTALL)


    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)

files = [
    "c:/Users/sveab/Schule/7 Webpages/school/wellen/wellen-book-Einstieg.html",
    "c:/Users/sveab/Schule/7 Webpages/school/wellen/wellen-book-Interferenz.html",
    "c:/Users/sveab/Schule/7 Webpages/school/wellen/wellen-book-Interferenz2.html",
    "c:/Users/sveab/Schule/7 Webpages/school/wellen/wellen-book-stehende-Welle.html"
]

for f in files:
    update_file(f)

print("Done.")
