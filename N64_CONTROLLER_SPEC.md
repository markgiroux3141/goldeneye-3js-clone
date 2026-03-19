# N64 USB Controller Spec

## Hardware

- **Adapter:** USB N64 controller adapter (VID `2563`, PID `0575`)
- **Device ID:** `AZ-RB-N64P-215`
- **OS presentation:** HID-compliant game controller via DirectInput
- **Pygame name:** `Controller (Dinput)`
- **GUID:** `0300550d632500007505000000000000`

## Capabilities

| Feature | Count |
|---------|-------|
| Axes    | 4 (only 0–1 used) |
| Buttons | 13 |
| Hats    | 1 |

## Analog Stick

| Axis | Function | Range |
|------|----------|-------|
| 0    | Stick X  | -1.0 (left) to +1.0 (right) |
| 1    | Stick Y  | -1.0 (up) to +1.0 (down) |
| 2    | Unused   | — |
| 3    | Unused   | — |

A deadzone of ~0.15 is recommended. Returns to 0.00 on release.

## Button Mapping

| Button ID | N64 Button |
|-----------|------------|
| 0         | C-Left     |
| 1         | B          |
| 2         | A          |
| 3         | C-Down     |
| 4         | L          |
| 5         | R          |
| 6         | Z          |
| 7         | (unused)   |
| 8         | C-Right    |
| 9         | C-Up       |
| 10        | (unused)   |
| 11        | (unused)   |
| 12        | Start      |

## D-Pad

The D-pad maps to **Hat 0** (not buttons).

| Hat Value (x, y) | Direction  |
|-------------------|-----------|
| (0, 1)           | Up         |
| (1, 1)           | Up+Right   |
| (1, 0)           | Right      |
| (1, -1)          | Down+Right |
| (0, -1)          | Down       |
| (-1, -1)         | Down+Left  |
| (-1, 0)          | Left       |
| (-1, 1)          | Up+Left    |
| (0, 0)           | Center     |

## Working Input Reader (n64_input.py)

Complete script — reads all inputs, shows a live visualizer, and logs to `input_log.txt`.
Requires `pygame` (`pip install pygame`).

```python
"""N64 USB Controller Input Reader

Tested with: USB adapter VID_2563 & PID_0575 (AZ-RB-N64P-215)
Reports as "Controller (Dinput)" — 4 axes, 13 buttons, 1 hat
"""
import pygame
import sys
import time

# Button ID -> N64 label mapping
N64_BUTTONS = {
    0: "C-Left",  1: "B",      2: "A",
    3: "C-Down",  4: "L",      5: "R",
    6: "Z",       8: "C-Right", 9: "C-Up",
    12: "Start",
}

# Axis 0: Stick X (-1.0 = left, +1.0 = right)
# Axis 1: Stick Y (-1.0 = up,   +1.0 = down)
# Hat 0:  D-Pad   (x: -1=left, +1=right, y: -1=down, +1=up)

DEADZONE = 0.15

# pygame needs a display surface to process joystick events on Windows
pygame.init()
screen = pygame.display.set_mode((400, 300))
pygame.display.set_caption("N64 Controller Input")
pygame.joystick.init()

count = pygame.joystick.get_count()
if count == 0:
    print("No joystick/controller found!")
    sys.exit(1)

joystick = pygame.joystick.Joystick(0)
joystick.init()
print(f"Using: {joystick.get_name()}")
print(f"  Axes: {joystick.get_numaxes()}, Buttons: {joystick.get_numbuttons()}, Hats: {joystick.get_numhats()}")

LOG_FILE = "input_log.txt"
logf = open(LOG_FILE, "w")

font = pygame.font.SysFont("consolas", 16)
font_sm = pygame.font.SysFont("consolas", 13)
clock = pygame.time.Clock()
prev_axes = {}
running = True
log_lines = []
start_time = time.time()


def btn_name(btn_id):
    return N64_BUTTONS.get(btn_id, f"Btn{btn_id}")


def add_log(msg):
    t = time.time() - start_time
    stamped = f"[{t:7.2f}s] {msg}"
    log_lines.append(msg)
    if len(log_lines) > 10:
        log_lines.pop(0)
    print(stamped)
    logf.write(stamped + "\n")
    logf.flush()


while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.JOYBUTTONDOWN:
            add_log(f"[PRESSED]  {btn_name(event.button)}")
        elif event.type == pygame.JOYBUTTONUP:
            add_log(f"[RELEASED] {btn_name(event.button)}")
        elif event.type == pygame.JOYAXISMOTION:
            if abs(event.value) > DEADZONE or (event.axis in prev_axes and abs(prev_axes[event.axis]) > DEADZONE):
                axis_label = {0: "Stick X", 1: "Stick Y"}.get(event.axis, f"Axis {event.axis}")
                add_log(f"[AXIS]     {axis_label}: {event.value:+.2f}")
            prev_axes[event.axis] = event.value
        elif event.type == pygame.JOYHATMOTION:
            x, y = event.value
            dirs = []
            if y > 0: dirs.append("Up")
            if y < 0: dirs.append("Down")
            if x < 0: dirs.append("Left")
            if x > 0: dirs.append("Right")
            add_log(f"[D-PAD]    {'+'.join(dirs) if dirs else 'Center'}")

    # --- Draw ---
    screen.fill((20, 20, 40))
    sx = joystick.get_axis(0) if joystick.get_numaxes() > 0 else 0
    sy = joystick.get_axis(1) if joystick.get_numaxes() > 1 else 0

    # Analog stick visualizer
    cx, cy = 60, 70
    pygame.draw.circle(screen, (60, 60, 80), (cx, cy), 40, 2)
    pygame.draw.line(screen, (40, 40, 60), (cx - 40, cy), (cx + 40, cy), 1)
    pygame.draw.line(screen, (40, 40, 60), (cx, cy - 40), (cx, cy + 40), 1)
    pygame.draw.circle(screen, (0, 200, 100), (cx + int(sx * 35), cy + int(sy * 35)), 6)
    screen.blit(font_sm.render(f"X:{sx:+.2f} Y:{sy:+.2f}", True, (180, 180, 180)), (20, 115))

    # D-Pad
    hat = joystick.get_hat(0) if joystick.get_numhats() > 0 else (0, 0)
    dpad_cx, dpad_cy = 60, 160
    screen.blit(font_sm.render("D-Pad", True, (180, 180, 180)), (38, 185))
    for dx, dy, label in [(0, -1, "U"), (0, 1, "D"), (-1, 0, "L"), (1, 0, "R")]:
        active = (hat[0] == dx and dx != 0) or (hat[1] == -dy and dy != 0)
        color = (0, 220, 80) if active else (60, 60, 80)
        pygame.draw.rect(screen, color, (dpad_cx + dx * 16 - 6, dpad_cy + dy * 16 - 6, 12, 12))

    # Buttons with N64 labels
    for bx, by, btn_id, label in [
        (200, 40, 2, "A"), (160, 40, 1, "B"), (240, 80, 12, "Start"),
        (160, 80, 6, "Z"), (140, 120, 4, "L"), (260, 120, 5, "R"),
        (300, 30, 9, "C-Up"), (340, 50, 8, "C-Right"),
        (300, 70, 3, "C-Down"), (260, 50, 0, "C-Left"),
    ]:
        pressed = joystick.get_button(btn_id)
        color = (0, 220, 80) if pressed else (60, 60, 80)
        radius = 8 if label.startswith("C-") else 10
        pygame.draw.circle(screen, color, (bx, by), radius)
        lbl = font_sm.render(label, True, (200, 200, 200))
        screen.blit(lbl, (bx - lbl.get_width() // 2, by + radius + 2))

    # Event log
    for idx, line in enumerate(log_lines):
        screen.blit(font_sm.render(line, True, (200, 220, 255)), (10, 205 + idx * 15))

    pygame.display.flip()
    clock.tick(60)

logf.close()
pygame.quit()
```

## Notes

- Requires `pygame` (`pip install pygame`).
- On Windows, a `pygame.display.set_mode()` call is required before joystick events will fire.
- Buttons 7, 10, 11 do not correspond to any physical N64 button on this adapter.
- The stick Y axis is inverted relative to screen coordinates (negative = up).
- Hat y-axis is also inverted relative to stick: +1 = up for hat, -1 = up for stick.
