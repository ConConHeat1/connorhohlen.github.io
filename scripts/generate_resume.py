#!/usr/bin/env python3
"""Generate Connor Hohlen's privacy-safe public résumé."""

from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "connor-hohlen-resume.pdf"

PAGE_WIDTH, PAGE_HEIGHT = LETTER
MARGIN_X = 42
CONTENT_WIDTH = PAGE_WIDTH - (MARGIN_X * 2)

INK = HexColor("#13222C")
MUTED = HexColor("#51636E")
ACCENT = HexColor("#007B86")
RULE = HexColor("#CBD7DC")
PAPER = HexColor("#FFFFFF")


def wrap_text(text: str, font: str, size: float, max_width: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if stringWidth(candidate, font, size) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(
    page: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    *,
    font: str = "Helvetica",
    size: float = 8.4,
    leading: float = 11,
    color=INK,
) -> float:
    page.setFont(font, size)
    page.setFillColor(color)
    for line in wrap_text(text, font, size, width):
        page.drawString(x, y, line)
        y -= leading
    return y


def draw_bullet(page: canvas.Canvas, text: str, x: float, y: float, width: float) -> float:
    page.setFillColor(ACCENT)
    page.circle(x + 2.2, y + 2.5, 1.55, stroke=0, fill=1)
    return draw_wrapped(page, text, x + 10, y, width - 10, size=8.2, leading=10.4) - 1


def section_title(page: canvas.Canvas, title: str, y: float) -> float:
    page.setFillColor(ACCENT)
    page.setFont("Helvetica-Bold", 9.3)
    page.drawString(MARGIN_X, y, title.upper())
    title_width = stringWidth(title.upper(), "Helvetica-Bold", 9.3)
    page.setStrokeColor(RULE)
    page.setLineWidth(0.7)
    page.line(MARGIN_X + title_width + 10, y + 2.5, PAGE_WIDTH - MARGIN_X, y + 2.5)
    return y - 16


def entry_heading(
    page: canvas.Canvas,
    title: str,
    subtitle: str,
    date: str,
    y: float,
) -> float:
    page.setFillColor(INK)
    page.setFont("Helvetica-Bold", 9.5)
    page.drawString(MARGIN_X, y, title)
    page.setFont("Helvetica", 8.2)
    page.setFillColor(MUTED)
    page.drawRightString(PAGE_WIDTH - MARGIN_X, y, date)
    page.setFont("Helvetica-Oblique", 8.2)
    page.drawString(MARGIN_X, y - 11, subtitle)
    return y - 25


def generate_resume() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    page = canvas.Canvas(str(OUTPUT), pagesize=LETTER)
    page.setTitle("Connor Hohlen Resume")
    page.setAuthor("Connor Hohlen")
    page.setSubject("Computer Engineering student resume")

    page.setFillColor(PAPER)
    page.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)

    page.setFillColor(INK)
    page.setFont("Helvetica-Bold", 25)
    page.drawString(MARGIN_X, PAGE_HEIGHT - 50, "CONNOR HOHLEN")
    page.setFillColor(ACCENT)
    page.setFont("Helvetica-Bold", 10.5)
    page.drawString(MARGIN_X, PAGE_HEIGHT - 68, "COMPUTER ENGINEERING STUDENT")

    page.setFont("Helvetica", 8.2)
    page.setFillColor(MUTED)
    contact_line = "Lincoln, NE  |  connorhohlen@gmail.com  |  connorhohlen.com"
    page.drawRightString(PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 48, contact_line)
    links_line = "linkedin.com/in/connor-hohlen  |  github.com/ConConHeat1"
    page.drawRightString(PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 62, links_line)
    page.linkURL("mailto:connorhohlen@gmail.com", (367, PAGE_HEIGHT - 55, 472, PAGE_HEIGHT - 43))
    page.linkURL("https://connorhohlen.com", (480, PAGE_HEIGHT - 55, 570, PAGE_HEIGHT - 43))
    page.linkURL("https://www.linkedin.com/in/connor-hohlen/", (354, PAGE_HEIGHT - 69, 469, PAGE_HEIGHT - 57))
    page.linkURL("https://github.com/ConConHeat1", (486, PAGE_HEIGHT - 69, 570, PAGE_HEIGHT - 57))

    page.setStrokeColor(ACCENT)
    page.setLineWidth(2)
    page.line(MARGIN_X, PAGE_HEIGHT - 79, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 79)

    y = PAGE_HEIGHT - 101
    y = section_title(page, "Profile", y)
    profile = (
        "Computer Engineering student at the University of Nebraska-Lincoln graduating in May 2027. "
        "Builds software, embedded hardware, mobile products, electronics, and automation through "
        "hands-on development, testing, and troubleshooting."
    )
    y = draw_wrapped(page, profile, MARGIN_X, y, CONTENT_WIDTH, size=8.5, leading=11) - 6

    y = section_title(page, "Education", y)
    y = entry_heading(
        page,
        "University of Nebraska-Lincoln",
        "Bachelor of Science in Computer Engineering",
        "Expected May 2027",
        y,
    )
    y -= 2

    y = section_title(page, "Experience", y)
    y = entry_heading(page, "Amur Equipment Finance", "IT Intern", "May 2024 - August 2024", y)
    y = draw_bullet(page, "Resolved hardware and software support issues through the internal ticketing workflow.", MARGIN_X, y, CONTENT_WIDTH)
    y = draw_bullet(page, "Configured and prepared laptops and workstations for employees.", MARGIN_X, y, CONTENT_WIDTH)
    y = draw_bullet(page, "Built internal Python and spreadsheet automation while supporting day-to-day technical workflows.", MARGIN_X, y, CONTENT_WIDTH)
    y -= 3

    y = entry_heading(page, "Menards", "Plumbing Sales Associate", "October 2020 - Present (with breaks)", y)
    y = draw_bullet(page, "Help customers identify products and practical solutions for plumbing-related projects.", MARGIN_X, y, CONTENT_WIDTH)
    y = draw_bullet(page, "Maintain organized inventory and displays while balancing customer needs with daily operations.", MARGIN_X, y, CONTENT_WIDTH)
    y = draw_bullet(page, "Help train new associates and communicate technical product information clearly.", MARGIN_X, y, CONTENT_WIDTH)
    y -= 3

    y = section_title(page, "Selected Projects", y)
    y = entry_heading(page, "Flexin", "Product design and full-stack mobile development", "In development", y)
    y = draw_bullet(page, "Developing an iOS-focused social training tracker with Flutter, Dart, Firebase Authentication, Firestore, Storage, and Cloud Functions.", MARGIN_X, y, CONTENT_WIDTH)
    y = draw_bullet(page, "Built media Check-Ins, social feeds, workout and health workflows, privacy controls, moderation, notifications, and supporting product infrastructure.", MARGIN_X, y, CONTENT_WIDTH)
    y -= 2

    y = entry_heading(page, "Custom FPV Drone", "Builder and systems integrator", "Completed personal build", y)
    y = draw_bullet(page, "Selected compatible components; soldered and wired the flight system; configured Betaflight, SBUS controls, and failsafe behavior.", MARGIN_X, y, CONTENT_WIDTH)
    y = draw_bullet(page, "Diagnosed electrical, communication, and configuration issues through staged bench and outdoor flight testing.", MARGIN_X, y, CONTENT_WIDTH)
    y -= 2

    y = entry_heading(page, "Engineering Portfolio", "Designer and developer", "Live and ongoing", y)
    y = draw_bullet(page, "Built a responsive, accessible static website with three themes, project case studies, SEO metadata, privacy review, and GitHub Pages deployment.", MARGIN_X, y, CONTENT_WIDTH)
    y -= 3

    y = section_title(page, "Technical Skills", y)
    skills = [
        ("Programming", "Python, Dart, Java, JavaScript, C#, HTML, CSS, SQL"),
        ("Mobile and cloud", "Flutter, Firebase Authentication, Firestore, Cloud Storage, Cloud Functions, iOS, TestFlight"),
        ("Hardware and tools", "Electronics, soldering, systems integration, Betaflight, Git, GitHub, Xcode, Fusion 360, Excel"),
    ]
    for label, values in skills:
        page.setFillColor(INK)
        page.setFont("Helvetica-Bold", 8.2)
        page.drawString(MARGIN_X, y, f"{label}:")
        label_width = stringWidth(f"{label}:", "Helvetica-Bold", 8.2)
        y = draw_wrapped(page, values, MARGIN_X + label_width + 5, y, CONTENT_WIDTH - label_width - 5, size=8.2, leading=10.2)
        y -= 1.5

    page.setStrokeColor(RULE)
    page.setLineWidth(0.6)
    page.line(MARGIN_X, 30, PAGE_WIDTH - MARGIN_X, 30)
    page.setFont("Helvetica", 7.3)
    page.setFillColor(MUTED)
    page.drawString(MARGIN_X, 18, "Seeking entry-level engineering opportunities beginning May or June 2027.")
    page.drawRightString(PAGE_WIDTH - MARGIN_X, 18, "connorhohlen.com")

    page.showPage()
    page.save()
    print(OUTPUT)


if __name__ == "__main__":
    generate_resume()
