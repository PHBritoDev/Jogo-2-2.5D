"""Create side-by-side review sheets from actual game screenshots on the runner."""
import base64
import io
import pathlib
import sys
import zipfile

from PIL import Image, ImageDraw

folder = pathlib.Path(sys.argv[1])
frames = sorted(folder.glob("*.jpg"))
baseline = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None


def draw_cell(sheet, frame, col, row, label):
    frame.thumbnail((476, 258))
    x, y = col * 480, row * 282
    sheet.paste(frame.convert("RGB"), (x + (480 - frame.width) // 2, y))
    ImageDraw.Draw(sheet).text((x + 6, y + 261), label, fill="white")


def save_sheet(sheet, name):
    filename = folder / (name + ".jpg")
    sheet.save(filename, quality=80)
    encoded = base64.b64encode(filename.read_bytes()).decode("ascii")
    for index in range(0, len(encoded), 4096):
        print("SAKURA_DATA", name, index, encoded[index:index + 4096])


for start in range(0, len(frames), 4):
    sheet = Image.new("RGB", (960, 564), "#182025")
    for cell, filename in enumerate(frames[start:start+4]):
        with Image.open(filename) as frame:
            draw_cell(sheet, frame, cell % 2, cell // 2, filename.stem)
    save_sheet(sheet, f"prancha-{start // 4}")

if frames and baseline and baseline.is_file():
    with zipfile.ZipFile(baseline) as archive:
        files = {pathlib.PurePosixPath(n).name: n for n in archive.namelist()}
        expected = "99ccbfede7a6e76396758c7eecdd14a7cfc0f906"
        if archive.read(files["commit.txt"]).decode().strip() != expected:
            raise ValueError("SHA inesperado na galeria da transferência")
        for name in ["03-bosque", "05-templo", "11-cidadela", "12-nave"]:
            jpg = name + ".jpg"
            if jpg not in files or not (folder / jpg).is_file():
                continue
            sheet = Image.new("RGB", (960, 282), "#182025")
            with Image.open(io.BytesIO(archive.read(files[jpg]))) as old:
                draw_cell(sheet, old, 0, 0, "#665 | " + name)
            with Image.open(folder / jpg) as new:
                draw_cell(sheet, new, 1, 0, "Mod 355 | " + name)
            save_sheet(sheet, "comparacao-" + name)
