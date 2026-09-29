import zlib
import struct
import math
import os

def create_png(width, height, get_pixel):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0 (None)
        for x in range(width):
            r, g, b, a = get_pixel(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    compressed = zlib.compress(bytes(raw_data), 9)
    
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = zlib.crc32(c) & 0xffffffff
        return struct.pack('>I', len(data)) + c + struct.pack('>I', crc)
    
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png.extend(chunk(b'IHDR', ihdr_data))
    # IDAT
    png.extend(chunk(b'IDAT', compressed))
    # IEND
    png.extend(chunk(b'IEND', b''))
    return bytes(png)

def make_onewinq_pixel(x, y, w, h, maskable=False, rounded=True):
    # Normalized coords from 0.0 to 1.0
    nx = x / float(w)
    ny = y / float(h)
    
    # Background: #7C3AED (124, 58, 237)
    bg_r, bg_g, bg_b = 124, 58, 237
    
    # Corner radius check if rounded and not maskable
    if rounded and not maskable:
        corner_r = 0.22  # normalized corner radius
        # Check 4 corners
        dx = 0
        dy = 0
        if nx < corner_r:
            dx = corner_r - nx
        elif nx > 1.0 - corner_r:
            dx = nx - (1.0 - corner_r)
        if ny < corner_r:
            dy = corner_r - ny
        elif ny > 1.0 - corner_r:
            dy = ny - (1.0 - corner_r)
            
        if dx > 0 and dy > 0:
            dist = math.hypot(dx, dy)
            if dist > corner_r:
                # Outside rounded corner -> transparent
                return (0, 0, 0, 0)
            elif dist > corner_r - (1.0 / w):
                # Anti-alias edge
                alpha = int(255 * max(0.0, min(1.0, (corner_r - dist) * w)))
                return (bg_r, bg_g, bg_b, alpha)

    # Elements inside:
    # 1. Circle 1: cx = 12/32 = 0.375, cy = 12/32 = 0.375, r = 4/32 = 0.125
    c1_x, c1_y, c1_r = 0.375, 0.375, 0.125
    d1 = math.hypot(nx - c1_x, ny - c1_y)
    
    # 2. Circle 2: cx = 21/32 = 0.65625, cy = 19/32 = 0.59375, r = 3.5/32 = 0.109375
    c2_x, c2_y, c2_r = 0.65625, 0.59375, 0.109375
    d2 = math.hypot(nx - c2_x, ny - c2_y)
    
    # 3. Connecting curve arc: from (0.375, 0.5) down and right to (0.546875, 0.64)
    # stroke width ~ 2.5/32 = 0.078
    # Curve center: cx=0.546875, cy=0.375, r=0.265625 for arc from angle pi to 3pi/2 approx
    arc_cx, arc_cy, arc_r = 0.546875, 0.375, 0.265625
    arc_dist = math.hypot(nx - arc_cx, ny - arc_cy)
    in_arc = (abs(arc_dist - arc_r) <= 0.04) and (nx <= arc_cx) and (ny >= arc_cy)
    
    # Pixel resolution AA factor
    pix_step = 1.0 / w

    if d1 <= c1_r:
        # Full white
        return (255, 255, 255, 255)
    elif d1 <= c1_r + pix_step:
        factor = (c1_r + pix_step - d1) / pix_step
        r = int(bg_r + (255 - bg_r) * factor)
        g = int(bg_g + (255 - bg_g) * factor)
        b = int(bg_b + (255 - bg_b) * factor)
        return (r, g, b, 255)
        
    if d2 <= c2_r:
        # 85% white circle
        r = int(bg_r + (255 - bg_r) * 0.85)
        g = int(bg_g + (255 - bg_g) * 0.85)
        b = int(bg_b + (255 - bg_b) * 0.85)
        return (r, g, b, 255)
    elif d2 <= c2_r + pix_step:
        factor = ((c2_r + pix_step - d2) / pix_step) * 0.85
        r = int(bg_r + (255 - bg_r) * factor)
        g = int(bg_g + (255 - bg_g) * factor)
        b = int(bg_b + (255 - bg_b) * factor)
        return (r, g, b, 255)
        
    if in_arc:
        return (255, 255, 255, 255)

    return (bg_r, bg_g, bg_b, 255)

out_dir = r"d:\A\OneWinq\client\public"
os.makedirs(out_dir, exist_ok=True)

# Generate 192x192
png192 = create_png(192, 192, lambda x, y, w, h: make_onewinq_pixel(x, y, w, h, maskable=False, rounded=True))
with open(os.path.join(out_dir, "icon-192.png"), "wb") as f:
    f.write(png192)
print("Created icon-192.png")

# Generate 512x512
png512 = create_png(512, 512, lambda x, y, w, h: make_onewinq_pixel(x, y, w, h, maskable=False, rounded=True))
with open(os.path.join(out_dir, "icon-512.png"), "wb") as f:
    f.write(png512)
print("Created icon-512.png")

# Generate 180x180 apple touch icon
png180 = create_png(180, 180, lambda x, y, w, h: make_onewinq_pixel(x, y, w, h, maskable=False, rounded=True))
with open(os.path.join(out_dir, "apple-touch-icon.png"), "wb") as f:
    f.write(png180)
print("Created apple-touch-icon.png")

# Generate maskable 192x192 (full bleed bg)
png_mask192 = create_png(192, 192, lambda x, y, w, h: make_onewinq_pixel(x, y, w, h, maskable=True, rounded=False))
with open(os.path.join(out_dir, "icon-maskable-192.png"), "wb") as f:
    f.write(png_mask192)
print("Created icon-maskable-192.png")

# Generate maskable 512x512 (full bleed bg)
png_mask512 = create_png(512, 512, lambda x, y, w, h: make_onewinq_pixel(x, y, w, h, maskable=True, rounded=False))
with open(os.path.join(out_dir, "icon-maskable-512.png"), "wb") as f:
    f.write(png_mask512)
print("Created icon-maskable-512.png")
