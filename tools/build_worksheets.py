"""Build the LaTeX worksheets and browser question images for a series."""
import argparse
from pathlib import Path
import re
import shutil
import subprocess
from tempfile import TemporaryDirectory

from PIL import Image, ImageChops
import pymupdf


ROOT = Path(__file__).resolve().parents[1]
SERIES = {
    "zhang": (2027, 8, "2027年张宇考研数学预测8套卷"),
    "lilin": (2027, 6, "2027年李林考研数学冲刺预测6套卷"),
    "chaoyue": (2025, 10, "2025年合工大超越数学一模拟卷"),
}
QUESTION_NUMBERS = {"Choice": range(1, 11), "Fill": range(11, 17), "Long": range(17, 23)}


def compile_pdf(source, scratch, volume, title, kind, crops=False):
    job = kind.lower() + ("-crops" if crops else "")
    definitions = (
        rf"\def\VolumeNumber{{{volume}}}\def\SeriesTitle{{{title}}}"
        rf"\def\WorksheetKind{{{kind}}}"
        r"\def\WorksheetCommon{../../zhang/worksheet-common.tex}"
        + (r"\def\QuestionCrops{}" if crops else "")
        + r"\input{../../zhang/worksheet-series.tex}"
    )
    cmd = [
        "xelatex", "-interaction=nonstopmode", "-halt-on-error",
        f"-jobname={job}", f"-output-directory={scratch.as_posix()}", definitions,
    ]
    for _ in range(1 if crops else 2):
        result = subprocess.run(cmd, cwd=source, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        if result.returncode:
            raise RuntimeError(result.stdout.decode("utf-8", errors="replace"))
    log = (scratch / f"{job}.log").read_text(encoding="utf-8", errors="replace")
    if "Missing character:" in log:
        raise ValueError(f"Missing glyphs in {source.name} {job}: " + str(re.findall(r"Missing character:.*", log)))
    for line in re.findall(r"Overfull \\[hv]box.*", log):
        print(f"{source.name}/{job}: {line}")
    return scratch / f"{job}.pdf"


def render_questions(pdf, numbers, destination):
    with pymupdf.open(pdf) as doc:
        if len(doc) != len(numbers):
            raise ValueError(f"{pdf.name}: expected {len(numbers)} pages, got {len(doc)}")
        for page, number in zip(doc, numbers):
            width = 468
            left = (page.rect.width - width) / 2
            bounds = pymupdf.Rect(left, 0, left + width, page.rect.height)
            pixmap = page.get_pixmap(dpi=300, clip=bounds, colorspace=pymupdf.csRGB)
            image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
            ink = ImageChops.invert(image.convert("L")).point(lambda value: 255 if value > 20 else 0).getbbox()
            if not ink or not re.search(rf"(?<!\d){number}\s*[.．]", page.get_text()):
                raise ValueError(f"{pdf.name}: expected question {number}")
            if ink[0] < 2 or ink[2] > image.width - 2:
                print(f"{pdf.name} Q{number}: ink near horizontal crop boundary")
            margin = 10
            image.crop((0, max(0, ink[1] - margin), image.width, ink[3] + margin)).save(
                destination / f"q{number:02}.png", optimize=True
            )


def build(series, volume):
    year, total, title = SERIES[series]
    source = ROOT / "tex" / series / f"{volume:02}"
    destination = ROOT / "assets" / f"{series}-{year}-{total:02}-{volume:02}"
    kinds = ("Choice", "Fill") if series == "chaoyue" else tuple(QUESTION_NUMBERS)
    with TemporaryDirectory(prefix=f"{series}-{volume:02}-") as temp:
        scratch = Path(temp)
        outputs = []
        for kind in kinds:
            numbers = QUESTION_NUMBERS[kind]
            crops = compile_pdf(source, scratch, volume, title, kind, crops=True)
            render_questions(crops, numbers, scratch)
            if kind != "Choice":
                pdf = compile_pdf(source, scratch, volume, title, kind)
                with pymupdf.open(pdf) as doc:
                    for page in doc:
                        if abs(page.rect.width - 595.28) > 1 or abs(page.rect.height - 841.89) > 1:
                            raise ValueError(f"{pdf.name}: non-A4 page")
                        if "共" not in page.get_text() or "共0页" in page.get_text():
                            raise ValueError(f"{pdf.name}: invalid footer")
                outputs.append(pdf)
        destination.mkdir(parents=True, exist_ok=True)
        for file in [*scratch.glob("q*.png"), *outputs]:
            shutil.copyfile(file, destination / file.name)
    print(f"{series} {volume:02}: {sum(len(QUESTION_NUMBERS[kind]) for kind in kinds)} questions, "
          + ", ".join(file.name for file in outputs))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("series", choices=SERIES)
    parser.add_argument("volumes", nargs="+", type=int)
    args = parser.parse_args()
    for volume in args.volumes:
        build(args.series, volume)
