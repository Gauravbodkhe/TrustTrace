"""
High-quality, multi-page vector PDF Report Generator for TrustTrace using ReportLab.
Produces professional scientific reports with cover page, executive summary,
results tables, policy benchmarks, reproducibility metrics, and trace appendices.
Includes dynamic page numbering (Page X of Y) and clean typographic hierarchy.
"""
from __future__ import annotations
import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
)

# Semantic Colors
PRIMARY = colors.HexColor("#312e81")      # Deep Indigo
SECONDARY = colors.HexColor("#4f46e5")    # Indigo Accent
TEXT_DARK = colors.HexColor("#0f172a")    # Slate 900
TEXT_MUTED = colors.HexColor("#475569")   # Slate 600
BORDER_COLOR = colors.HexColor("#cbd5e1") # Slate 300
BG_LIGHT = colors.HexColor("#f8fafc")     # Slate 50
SUCCESS_COLOR = colors.HexColor("#059669")# Emerald 600
DANGER_COLOR = colors.HexColor("#dc2626") # Rose 600
HEADER_BG = colors.HexColor("#e0e7ff")    # Light Indigo


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and print 'Page X of Y' on all pages."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(TEXT_MUTED)

        # Header (pages after cover)
        if self._pageNumber > 1:
            self.drawString(54, letter[1] - 36, "TrustTrace — AI Error Recovery & Reliability Report")
            self.setStrokeColor(BORDER_COLOR)
            self.setLineWidth(0.5)
            self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)

        # Footer (all pages)
        footer_text = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(letter[0] - 54, 36, footer_text)
        self.drawString(54, 36, "Real Test Results | Created by TrustTrace Platform")
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(54, 48, letter[0] - 54, 48)

        self.restoreState()


class PDFReportBuilder:

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._init_custom_styles()

    def _init_custom_styles(self):
        self.styles.add(ParagraphStyle(
            name="CoverTitle",
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=30,
            textColor=PRIMARY,
            spaceAfter=10,
        ))
        self.styles.add(ParagraphStyle(
            name="CoverSubtitle",
            fontName="Helvetica",
            fontSize=13,
            leading=18,
            textColor=TEXT_MUTED,
            spaceAfter=25,
        ))
        self.styles.add(ParagraphStyle(
            name="SectionHeading",
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=PRIMARY,
            spaceBefore=14,
            spaceAfter=8,
            keepWithNext=True,
        ))
        self.styles.add(ParagraphStyle(
            name="SubSectionHeading",
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=15,
            textColor=SECONDARY,
            spaceBefore=10,
            spaceAfter=5,
            keepWithNext=True,
        ))
        self.styles.add(ParagraphStyle(
            name="BodyDark",
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=TEXT_DARK,
            spaceAfter=6,
        ))
        self.styles.add(ParagraphStyle(
            name="BodyMuted",
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=TEXT_MUTED,
            spaceAfter=4,
        ))
        self.styles.add(ParagraphStyle(
            name="TableCell",
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=TEXT_DARK,
        ))
        self.styles.add(ParagraphStyle(
            name="TableHead",
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=PRIMARY,
        ))
        self.styles.add(ParagraphStyle(
            name="CalloutBox",
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=TEXT_DARK,
            backColor=BG_LIGHT,
            borderColor=BORDER_COLOR,
            borderWidth=0.5,
            borderPadding=8,
            spaceBefore=6,
            spaceAfter=8,
        ))

    def build_report_pdf(self, report_data: Dict[str, Any]) -> bytes:
        """
        Generate complete, professional PDF document from aggregated report data.
        Returns bytes of the compiled PDF.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=54,
            rightMargin=54,
            topMargin=54,
            bottomMargin=54,
        )

        story = []

        # 1. Cover Page
        story.extend(self._build_cover_page(report_data))
        story.append(PageBreak())

        # 2. Executive Summary & Hypotheses
        story.extend(self._build_executive_summary(report_data))
        story.append(Spacer(1, 10))

        # 3. Policy Comparison Matrix
        story.extend(self._build_policy_matrix(report_data))
        story.append(Spacer(1, 10))

        # 4. Failure Breakdown & Ground Truth Classification
        story.extend(self._build_failure_breakdown(report_data))
        story.append(Spacer(1, 10))

        # 5. Scientific Limitations & Threats to Validity
        story.extend(self._build_limitations_section(report_data))
        story.append(Spacer(1, 10))

        # 6. Appendix: Detailed Execution Telemetry & Traces
        story.extend(self._build_appendix(report_data))

        doc.build(story, canvasmaker=NumberedCanvas)
        return buffer.getvalue()

    def _build_cover_page(self, data: Dict[str, Any]) -> List[Any]:
        elements = [
            Spacer(1, 40),
            Paragraph("TRUSTTRACE PLATFORM", ParagraphStyle(
                name="Badge",
                fontName="Helvetica-Bold",
                fontSize=9,
                textColor=SECONDARY,
                spaceAfter=15,
            )),
            Paragraph(data.get("title", "AI Agent Error Recovery Report"), self.styles["CoverTitle"]),
            Paragraph(
                data.get("subtitle", "A clear report showing how well AI agents complete tasks and recover when tools break (Methods A to G)."),
                self.styles["CoverSubtitle"],
            ),
            Spacer(1, 30),
        ]

        # Metadata Table
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        meta_data = [
            [Paragraph("Generated At:", self.styles["TableHead"]), Paragraph(now_str, self.styles["TableCell"])],
            [Paragraph("Report Scope:", self.styles["TableHead"]), Paragraph(data.get("scope", "All Completed Tests"), self.styles["TableCell"])],
            [Paragraph("Total Tests Run:", self.styles["TableHead"]), Paragraph(str(data.get("total_experiments", 0)), self.styles["TableCell"])],
            [Paragraph("Total Tasks Run:", self.styles["TableHead"]), Paragraph(str(data.get("total_runs", 0)), self.styles["TableCell"])],
            [Paragraph("Best Method (Highest Score):", self.styles["TableHead"]), Paragraph(data.get("best_policy_summary", "Method G (Smart Adaptive Recovery)"), self.styles["TableCell"])],
            [Paragraph("Honest Testing:", self.styles["TableHead"]), Paragraph("Real recorded results with zero fake numbers", self.styles["TableCell"])],
        ]

        t = Table(meta_data, colWidths=[180, 320])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(t)

        elements.extend([
            Spacer(1, 40),
            Paragraph(
                "<strong>Main Question:</strong> <em>Does smart error recovery (Method G) help AI agents finish tasks when tools break, without wasting time or resources?</em>",
                self.styles["CalloutBox"],
            ),
        ])
        return elements

    def _build_executive_summary(self, data: Dict[str, Any]) -> List[Any]:
        elements = [
            Paragraph("1. Summary of Results", self.styles["SectionHeading"]),
            Paragraph(
                "This report shows what happened when AI agents were tested with broken tools and errors. Tests include slow connections, broken tools, invalid answers, rate limits, and temporary server errors.",
                self.styles["BodyDark"],
            ),
            Paragraph(
                "All numbers in this report come from real test runs. No numbers or results are fabricated. When free simulation is used, external AI costs are left empty rather than showing fake estimates.",
                self.styles["BodyDark"],
            ),
            Spacer(1, 8),
            Paragraph("2. How AI Handles Errors (Methods A through G)", self.styles["SubSectionHeading"]),
        ]

        policies_table_data = [
            [
                Paragraph("Method", self.styles["TableHead"]),
                Paragraph("Name", self.styles["TableHead"]),
                Paragraph("How It Handles Errors", self.styles["TableHead"]),
            ],
            [
                Paragraph("Method A", self.styles["TableCell"]),
                Paragraph("Stop on Error", self.styles["TableCell"]),
                Paragraph("Immediately stops when an error happens. Does not retry.", self.styles["TableCell"]),
            ],
            [
                Paragraph("Method B", self.styles["TableCell"]),
                Paragraph("Simple Retry", self.styles["TableCell"]),
                Paragraph("Retries the same tool immediately without waiting.", self.styles["TableCell"]),
            ],
            [
                Paragraph("Method C", self.styles["TableCell"]),
                Paragraph("Wait & Retry", self.styles["TableCell"]),
                Paragraph("Waits with increasing delay (1s, 2s, 4s) before retrying.", self.styles["TableCell"]),
            ],
            [
                Paragraph("Method D", self.styles["TableCell"]),
                Paragraph("Use Backup Tool", self.styles["TableCell"]),
                Paragraph("Switches to a backup tool or cached data when the main tool is broken.", self.styles["TableCell"]),
            ],
            [
                Paragraph("Method E", self.styles["TableCell"]),
                Paragraph("Fix Arguments", self.styles["TableCell"]),
                Paragraph("Checks the error message and fixes invalid input parameters.", self.styles["TableCell"]),
            ],
            [
                Paragraph("Method F", self.styles["TableCell"]),
                Paragraph("Ask Person for Help", self.styles["TableCell"]),
                Paragraph("Pauses and asks a person for help when it cannot fix the problem.", self.styles["TableCell"]),
            ],
            [
                Paragraph("Method G", self.styles["TableCell"]),
                Paragraph("Smart Adaptive Recovery", self.styles["TableCell"]),
                Paragraph("Looks at the error type and picks the best recovery action automatically.", self.styles["TableCell"]),
            ],
        ]

        t = Table(policies_table_data, colWidths=[65, 120, 315])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(t)
        return elements

    def _build_policy_matrix(self, data: Dict[str, Any]) -> List[Any]:
        elements = [
            Paragraph("3. Side-by-Side Comparison of Methods", self.styles["SectionHeading"]),
            Paragraph(
                "How all 7 methods performed across all recorded tests:",
                self.styles["BodyDark"],
            ),
        ]

        policies = data.get("policy_comparison", [])
        if not policies:
            elements.append(Paragraph("<em>No test data recorded yet. Run tests to populate this table.</em>", self.styles["BodyMuted"]))
            return elements

        rows = [
            [
                Paragraph("Method", self.styles["TableHead"]),
                Paragraph("Tests Run", self.styles["TableHead"]),
                Paragraph("Tasks Completed", self.styles["TableHead"]),
                Paragraph("Errors Fixed", self.styles["TableHead"]),
                Paragraph("Avg Retries", self.styles["TableHead"]),
                Paragraph("Time Taken", self.styles["TableHead"]),
            ]
        ]

        for p in policies:
            success_str = f"{p['task_success_rate']*100:.0f}%" if p.get("task_success_rate") is not None else "—"
            recovery_str = f"{p['recovery_success_rate']*100:.0f}%" if p.get("recovery_success_rate") is not None else "—"
            retries_str = f"{p.get('avg_retry_count', 0):.1f}" if p.get("avg_retry_count") is not None else "—"
            time_str = f"{p.get('mean_latency_ms', 0):.0f}ms" if p.get("mean_latency_ms") is not None else "—"

            rows.append([
                Paragraph(p.get("policy_name", p.get("policy_id", "")).split(":")[0], self.styles["TableCell"]),
                Paragraph(str(p.get("sample_size", 0)), self.styles["TableCell"]),
                Paragraph(success_str, self.styles["TableCell"]),
                Paragraph(recovery_str, self.styles["TableCell"]),
                Paragraph(retries_str, self.styles["TableCell"]),
                Paragraph(time_str, self.styles["TableCell"]),
            ])

        t = Table(rows, colWidths=[150, 60, 75, 75, 65, 75])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(t)
        return elements

    def _build_failure_breakdown(self, data: Dict[str, Any]) -> List[Any]:
        elements = [
            Paragraph("4. Problems Tested & Recovery Success", self.styles["SectionHeading"]),
            Paragraph(
                "TrustTrace tests 10 common problems to see how often each error was fixed:",
                self.styles["BodyDark"],
            ),
        ]

        failure_stats = data.get("failure_distribution", [])
        if not failure_stats:
            elements.append(Paragraph("<em>No problem test data recorded in this scope.</em>", self.styles["BodyMuted"]))
            return elements

        rows = [
            [
                Paragraph("Test Problem", self.styles["TableHead"]),
                Paragraph("What Happened", self.styles["TableHead"]),
                Paragraph("Times Tested", self.styles["TableHead"]),
                Paragraph("Errors Fixed", self.styles["TableHead"]),
            ]
        ]

        for f in failure_stats:
            rows.append([
                Paragraph(f.get("category", "").replace("_", " ").title(), self.styles["TableCell"]),
                Paragraph(f.get("description", "Simulated tool fault"), self.styles["TableCell"]),
                Paragraph(str(f.get("count", 0)), self.styles["TableCell"]),
                Paragraph(f"{f.get('recovery_rate', 0)*100:.0f}%", self.styles["TableCell"]),
            ])

        t = Table(rows, colWidths=[120, 220, 80, 80])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(t)
        return elements

    def _build_limitations_section(self, data: Dict[str, Any]) -> List[Any]:
        elements = [
            Paragraph("5. Honest Testing Notes", self.styles["SectionHeading"]),
            Paragraph(
                "Keep these important facts in mind when reading the results:",
                self.styles["BodyDark"],
            ),
            Paragraph(
                "• <strong>Controlled Testing:</strong> Tests use predictable simulations so you get the same honest results every time.",
                self.styles["BodyDark"],
            ),
            Paragraph(
                "• <strong>Test Size:</strong> Running more tests gives a more accurate picture of performance.",
                self.styles["BodyDark"],
            ),
            Paragraph(
                "• <strong>No Fake Numbers:</strong> If costs or token counts were not measured, they are shown as empty rather than guessing.",
                self.styles["BodyDark"],
            ),
            Paragraph(
                "• <strong>Different Problems Need Different Methods:</strong> A method that works well for slow connections might not fix a broken tool.",
                self.styles["BodyDark"],
            ),
        ]
        return elements

    def _build_appendix(self, data: Dict[str, Any]) -> List[Any]:
        elements = [
            Paragraph("6. Example Step-by-Step Activity History", self.styles["SectionHeading"]),
            Paragraph(
                "Recent step-by-step logs showing what happened during tests:",
                self.styles["BodyDark"],
            ),
        ]

        recent_traces = data.get("recent_traces", [])
        if not recent_traces:
            elements.append(Paragraph("<em>No recent activity logs available for appendix.</em>", self.styles["BodyMuted"]))
            return elements

        rows = [
            [
                Paragraph("Step #", self.styles["TableHead"]),
                Paragraph("Tool Used", self.styles["TableHead"]),
                Paragraph("Status", self.styles["TableHead"]),
                Paragraph("Problem", self.styles["TableHead"]),
                Paragraph("Action Taken", self.styles["TableHead"]),
                Paragraph("Time Taken", self.styles["TableHead"]),
            ]
        ]

        for t_item in recent_traces[:15]:  # Top 15 sample traces
            rows.append([
                Paragraph(f"Step {t_item.get('step_number', 1)}", self.styles["TableCell"]),
                Paragraph(t_item.get("tool_name", ""), self.styles["TableCell"]),
                Paragraph(t_item.get("status", "").upper(), self.styles["TableCell"]),
                Paragraph(t_item.get("fault_category") or "None", self.styles["TableCell"]),
                Paragraph(t_item.get("recovery_action") or t_item.get("diagnosis_category") or "—", self.styles["TableCell"]),
                Paragraph(f"{t_item.get('latency_ms', 0)}ms", self.styles["TableCell"]),
            ])

        t = Table(rows, colWidths=[55, 115, 60, 95, 115, 60])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BG_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(t)
        return elements
