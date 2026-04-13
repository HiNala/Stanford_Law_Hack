"""
Generate realistic demo contracts for the ClauseGuard demo account.
Produces both .pdf and .md versions in /samples.

Run inside the backend container:
    python /app/generate_demo_contracts.py
"""
import os, sys, textwrap
from fpdf import FPDF

SAMPLES_DIR = "/samples"
os.makedirs(SAMPLES_DIR, exist_ok=True)

# ── helpers ──────────────────────────────────────────────────────────────────

def safe(text):
    """Strip/replace characters outside latin-1 range so fpdf's core fonts work."""
    replacements = {
        "\u2014": "--", "\u2013": "-", "\u2018": "'", "\u2019": "'",
        "\u201c": '"', "\u201d": '"', "\u2022": "*", "\u00b7": ".",
        "\u2026": "...", "\u00a0": " ",
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text.encode("latin-1", errors="replace").decode("latin-1")

def wrap(text, width=110):
    return textwrap.fill(text.strip(), width)


class ContractPDF(FPDF):
    def __init__(self, title):
        super().__init__()
        self.doc_title = title
        self.set_margins(25, 25, 25)
        self.set_auto_page_break(True, margin=20)

    def header(self):
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 8, self.doc_title, align="R")
        self.ln(4)
        self.set_draw_color(220, 220, 220)
        self.set_line_width(0.3)
        self.line(25, self.get_y(), 185, self.get_y())
        self.ln(4)
        self.set_text_color(0, 0, 0)

    def footer(self):
        self.set_y(-18)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(150, 150, 150)
        self.cell(0, 6, f"CONFIDENTIAL  -  Page {self.page_no()}", align="C")

    def title_block(self, title, subtitle=""):
        w = self.w - self.l_margin - self.r_margin
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(15, 23, 42)
        self.ln(6)
        self.multi_cell(w, 10, safe(title), align="C")
        if subtitle:
            self.ln(2)
            self.set_font("Helvetica", "", 11)
            self.set_text_color(75, 85, 99)
            self.multi_cell(w, 7, safe(subtitle), align="C")
        self.ln(6)
        self.set_draw_color(59, 130, 246)
        self.set_line_width(0.8)
        self.line(25, self.get_y(), 185, self.get_y())
        self.ln(8)
        self.set_text_color(0, 0, 0)

    def parties_block(self, party1, party2, date):
        w = self.w - self.l_margin - self.r_margin
        self.set_font("Helvetica", "", 9)
        self.set_text_color(75, 85, 99)
        self.multi_cell(w, 6, safe(
            f"This Agreement is entered into as of {date}, between:\n\n"
            f"{party1} (\"Company\" or \"Party A\")\nand\n{party2} (\"Vendor\" or \"Party B\")"))
        self.ln(6)
        self.set_draw_color(230, 230, 230)
        self.set_line_width(0.2)
        self.line(25, self.get_y(), 185, self.get_y())
        self.ln(6)
        self.set_text_color(0, 0, 0)

    def section(self, num, heading):
        w = self.w - self.l_margin - self.r_margin
        self.ln(4)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(15, 23, 42)
        self.multi_cell(w, 8, f"{num}. {heading.upper()}")
        self.set_draw_color(200, 200, 210)
        self.set_line_width(0.2)
        self.line(25, self.get_y(), 185, self.get_y())
        self.ln(3)
        self.set_text_color(0, 0, 0)

    def clause(self, num, text):
        w = self.w - self.l_margin - self.r_margin
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(15, 23, 42)
        self.multi_cell(w, 6, safe(f"Section {num}"))
        self.set_font("Helvetica", "", 9.5)
        self.set_text_color(30, 30, 30)
        self.multi_cell(w, 6, safe(text.strip()))
        self.ln(3)

    def sig_block(self, p1name, p2name):
        w = self.w - self.l_margin - self.r_margin
        self.ln(8)
        self.section("SIG", "Signature Page")
        self.set_font("Helvetica", "", 9)
        self.set_text_color(30, 30, 30)
        self.multi_cell(w, 6, "IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.")
        self.ln(6)
        half = (185 - 25) / 2 - 5
        y = self.get_y()
        self.set_x(25)
        self.set_font("Helvetica", "B", 9)
        self.cell(half, 6, p1name)
        self.set_x(120)
        self.cell(half, 6, p2name)
        self.ln(10)
        self.set_font("Helvetica", "", 9)
        self.set_x(25)
        self.cell(half, 6, "Signature: _______________________")
        self.set_x(120)
        self.cell(half, 6, "Signature: _______________________")
        self.ln(8)
        self.set_x(25)
        self.cell(half, 6, "Name:      _______________________")
        self.set_x(120)
        self.cell(half, 6, "Name:      _______________________")
        self.ln(8)
        self.set_x(25)
        self.cell(half, 6, "Title:     _______________________")
        self.set_x(120)
        self.cell(half, 6, "Title:     _______________________")
        self.ln(8)
        self.set_x(25)
        self.cell(half, 6, "Date:      _______________________")
        self.set_x(120)
        self.cell(half, 6, "Date:      _______________________")


# ═══════════════════════════════════════════════════════════════════════════
# CONTRACT 1 — Master Cloud Services Agreement  (CRITICAL risk)
# ═══════════════════════════════════════════════════════════════════════════

C1_TITLE  = "Master Cloud Services Agreement"
C1_SUB    = "AcquiTech Capital LLC  ·  DataVault Corp"
C1_P1     = "AcquiTech Capital LLC, a Delaware limited liability company, 800 Market Street, San Francisco, CA 94102"
C1_P2     = "DataVault Corp, a California corporation, 550 Terry Francois Blvd, San Francisco, CA 94158"
C1_DATE   = "March 1, 2026"
C1_SLUG   = "master-cloud-services-agreement"

C1_CLAUSES = [
    ("1.1", "Scope of Services. DataVault Corp (\"Vendor\") shall provide cloud data storage, processing, and analytics services as described in one or more Statements of Work (\"SOW\") incorporated herein by reference. Vendor may unilaterally modify, discontinue, or substitute any feature of the Services at any time, for any reason, upon thirty (30) days written notice. Company acknowledges that certain legacy modules may be deprecated without replacement and that pricing adjustments following feature changes are solely within Vendor's discretion."),
    ("1.2", "Access Grant. Company hereby grants Vendor a perpetual, irrevocable, royalty-free, worldwide license to use, copy, modify, and create derivative works from all data uploaded to the platform (\"Customer Data\") for the purposes of (i) providing the Services, (ii) improving Vendor's products and algorithms, (iii) training machine learning models, and (iv) any other lawful commercial purpose Vendor deems appropriate. This license survives termination of this Agreement indefinitely."),
    ("1.3", "Sub-processing. Vendor may engage sub-processors in any jurisdiction without prior notice to or consent from Company. Vendor makes no representation regarding the data protection laws of jurisdictions where sub-processors may be located and disclaims all liability arising from sub-processor acts or omissions."),
    ("2.1", "Term and Auto-Renewal. This Agreement commences on the Effective Date and continues for an initial term of three (3) years (\"Initial Term\"). Upon expiration of the Initial Term, this Agreement shall automatically renew for successive one-year periods unless either Party provides written cancellation notice no less than ninety (90) days prior to the end of the then-current term. Failure to provide timely cancellation notice shall obligate Company to pay all fees for the full renewal period even if Company ceases using the Services."),
    ("2.2", "Termination for Convenience. Vendor may terminate this Agreement for any reason upon sixty (60) days written notice. Company may terminate only upon one hundred eighty (180) days written notice and only after payment of all outstanding fees plus an early termination fee equal to the greater of (i) six (6) months of the average monthly fees paid over the prior twelve-month period or (ii) $150,000 USD."),
    ("2.3", "Effect of Termination. Upon termination for any reason, Company shall have fifteen (15) days to export its Customer Data. After such period, Vendor may permanently delete all Customer Data without further notice. Vendor shall have no obligation to maintain Customer Data in a retrievable format during or after the transition period, and Vendor's deletion of Customer Data shall not give rise to any liability."),
    ("3.1", "Fees and Payment. Company shall pay all fees specified in each SOW within fifteen (15) days of invoice date. Late payments shall bear interest at the rate of two percent (2%) per month (twenty-four percent (24%) per annum), compounded monthly. Vendor may suspend Services immediately upon any payment delinquency without cure period or notice. All fees are non-refundable regardless of Service quality or availability."),
    ("3.2", "Price Escalation. Vendor reserves the right to increase fees upon sixty (60) days written notice. If Company objects to any price increase, its sole remedy is to terminate the Agreement subject to the early termination fee set forth in Section 2.2. Continued use of the Services after the notice period constitutes acceptance of the increased fees."),
    ("3.3", "Taxes. Company shall be responsible for all taxes, levies, and duties associated with the Services, including without limitation any sales tax, use tax, VAT, withholding tax, or similar obligation, even if Vendor failed to collect such taxes at the time of invoicing."),
    ("4.1", "Service Level Agreement. Vendor shall use commercially reasonable efforts to achieve ninety-nine percent (99%) uptime on a monthly basis. Vendor's sole obligation for failure to meet the SLA target is to provide a service credit equal to five percent (5%) of fees paid for the affected month. Service credits are Company's exclusive remedy for service disruptions and shall not exceed one month's fees in any twelve-month period."),
    ("4.2", "Scheduled Maintenance. Vendor may conduct scheduled maintenance at any time and without prior notice. Scheduled maintenance windows are excluded from uptime calculations and may not exceed twenty (20) hours per month. Vendor accepts no liability for business losses caused by maintenance-related downtime."),
    ("4.3", "Data Security. Vendor will implement security measures it deems commercially reasonable. Vendor is not required to notify Company of any security incident or data breach unless required by applicable law. In the event of a confirmed breach, Vendor's liability is limited to providing twelve (12) months of credit monitoring services to affected individuals, regardless of the scope or impact of the breach."),
    ("5.1", "Limitation of Liability. IN NO EVENT SHALL VENDOR BE LIABLE TO COMPANY FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, LOSS OF PROFITS, OR BUSINESS INTERRUPTION, EVEN IF VENDOR HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. VENDOR'S TOTAL AGGREGATE LIABILITY FOR ANY AND ALL CLAIMS ARISING UNDER OR RELATING TO THIS AGREEMENT SHALL NOT EXCEED THE LESSER OF (I) THE TOTAL FEES PAID BY COMPANY IN THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE CLAIM OR (II) FIVE THOUSAND DOLLARS ($5,000). THIS LIMITATION APPLIES REGARDLESS OF THE FORM OF ACTION."),
    ("5.2", "Indemnification by Company. Company shall indemnify, defend, and hold harmless Vendor and its officers, directors, employees, and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from or related to: (i) Company's use of the Services; (ii) Company's Customer Data; (iii) any third-party claim that Company's data infringes any third-party right; (iv) Company's violation of applicable law; or (v) Company's breach of this Agreement. This indemnification obligation is unlimited in scope and amount."),
    ("5.3", "Indemnification by Vendor. Vendor shall indemnify Company solely against claims that the Vendor-provided software, as delivered and unmodified by Company, directly infringes a United States patent or registered copyright, subject to a maximum indemnification cap of twenty-five thousand dollars ($25,000). Vendor's indemnification obligation is expressly conditioned upon Company promptly notifying Vendor of any such claim and granting Vendor sole control of the defense."),
    ("6.1", "Intellectual Property Ownership. All inventions, developments, improvements, and work product created or generated by Vendor in connection with the Services, even if created using Company's Confidential Information, Customer Data, or at Company's specific direction, shall be the exclusive property of Vendor. Company receives only the limited, non-exclusive right to access the Services during the term of this Agreement. Company waives any claim to ownership of or compensation for any such work product."),
    ("6.2", "Company Data Rights. Vendor retains all rights in any insights, statistics, benchmarks, or aggregated data derived from Customer Data (\"Derived Data\"). Vendor may commercialize Derived Data without restriction or compensation to Company. Company acknowledges that it has no ownership interest in Derived Data."),
    ("7.1", "Confidentiality. Each party agrees to maintain in confidence the other party's Confidential Information using at least the same degree of care it uses for its own confidential information, but no less than reasonable care. The confidentiality obligation survives termination of this Agreement for a period of two (2) years. Vendor is expressly permitted to disclose Company Confidential Information to its sub-processors, advisors, and potential acquirers without restriction."),
    ("7.2", "Non-Solicitation. During the term of this Agreement and for a period of twenty-four (24) months thereafter, Company shall not directly or indirectly solicit, recruit, hire, or engage any person who is or was an employee or contractor of Vendor, without Vendor's prior written consent. Breach of this provision shall give rise to liquidated damages of one hundred thousand dollars ($100,000) per individual solicited."),
    ("8.1", "Dispute Resolution. Any dispute arising out of or relating to this Agreement shall be resolved by binding arbitration administered by JAMS under its Streamlined Arbitration Rules. Arbitration shall take place in San Francisco, California. COMPANY EXPRESSLY WAIVES ANY RIGHT TO A JURY TRIAL AND ANY RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION. The arbitrator shall have no authority to award punitive damages, and any award shall be final and binding."),
    ("8.2", "Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law principles. The United Nations Convention on Contracts for the International Sale of Goods shall not apply."),
    ("9.1", "Force Majeure. Neither party shall be liable for delays or failures in performance caused by circumstances beyond its reasonable control. Vendor may suspend Services for the duration of a force majeure event without liability; however, Company's payment obligations shall continue unabated during any such suspension."),
    ("9.2", "Entire Agreement; Amendment. This Agreement constitutes the entire agreement between the parties. Vendor may amend this Agreement at any time by posting updated terms on its website. Company's continued use of the Services following any amendment shall constitute acceptance. Company waives the right to receive direct notice of amendments."),
]

C1_MD = f"""# {C1_TITLE}

**Parties:** {C1_P1} **AND** {C1_P2}
**Effective Date:** {C1_DATE}
**Risk Classification:** ⚠️ CRITICAL

---

## Risk Summary for Demo

This contract contains several **deal-breaking provisions** that would trigger ClauseGuard's highest risk alerts:

| Clause | Risk | Issue |
|--------|------|-------|
| §1.2 Perpetual Data License | 🔴 Critical | Vendor gets perpetual, irrevocable right to use all Customer Data for any commercial purpose |
| §2.1 Auto-Renewal | 🔴 Critical | 90-day cancellation window with full-period payment obligation |
| §5.1 Liability Cap | 🔴 Critical | Cap is only $5,000 regardless of total contract value |
| §5.2 Uncapped Indemnification | 🔴 Critical | Company indemnifies Vendor with no dollar limit |
| §2.2 Early Termination Fee | 🟠 High | $150,000+ penalty for early exit |
| §4.3 Breach Notification | 🟠 High | No obligation to notify of data breaches |
| §6.1 IP Ownership | 🟠 High | Vendor owns all work product even created from Company data |
| §7.2 Non-Solicitation | 🟡 Medium | 24-month ban with $100K liquidated damages |
| §8.1 Arbitration Waiver | 🟡 Medium | Class action waiver + no punitive damages |

## TrustFoundry Legal Citations Expected
- *California Civil Code § 1668* — unconscionability of limitation of liability clauses
- *Arden v. Silloway (2019)* — perpetual data license enforceability
- *Cal. Bus. & Prof. Code § 22575* — data breach notification obligations
- CCPA / CPRA compliance for sub-processor data sharing

---

{chr(10).join(f"**§{num}** {text[:200]}..." for num, text in C1_CLAUSES[:5])}
"""

# ═══════════════════════════════════════════════════════════════════════════
# CONTRACT 2 — Mutual Non-Disclosure Agreement (HIGH risk)
# ═══════════════════════════════════════════════════════════════════════════

C2_TITLE  = "Mutual Non-Disclosure Agreement"
C2_SUB    = "Meridian Holdings Inc.  ·  AcquiTech Capital LLC"
C2_P1     = "Meridian Holdings Inc., a California corporation, 1100 Brickyard Way, Point Richmond, CA 94801"
C2_P2     = "AcquiTech Capital LLC, a Delaware limited liability company, 800 Market Street, San Francisco, CA 94102"
C2_DATE   = "February 15, 2026"
C2_SLUG   = "mutual-nda-meridian-acquitech"

C2_CLAUSES = [
    ("1.1", "Definition of Confidential Information. \"Confidential Information\" means any information disclosed by one party (\"Disclosing Party\") to the other party (\"Receiving Party\"), either directly or indirectly, in writing, orally or by inspection of tangible objects, including without limitation all business plans, financial projections, customer lists, personnel files, trade secrets, inventions, source code, product roadmaps, pricing information, and any other information designated as confidential. The parties agree that this definition is intentionally broad and that any information relating to the Disclosing Party's business shall be presumed Confidential Information absent an express written statement to the contrary."),
    ("1.2", "Exclusions. The obligations of confidentiality shall not apply to information that: (i) is or becomes publicly known through no wrongful act or omission of the Receiving Party; (ii) was rightfully known to the Receiving Party prior to disclosure; (iii) is independently developed by Receiving Party without use of Confidential Information; or (iv) is required to be disclosed by law or court order, provided that Receiving Party gives Disclosing Party reasonable advance written notice."),
    ("2.1", "Non-Disclosure Obligation. Each Receiving Party agrees to hold all Confidential Information in strict confidence, to use it solely for evaluating a potential transaction between the parties (the \"Permitted Purpose\"), and to disclose it only to employees, officers, and advisors who (a) have a need to know for the Permitted Purpose, and (b) are bound by confidentiality obligations at least as protective as those set forth herein."),
    ("2.2", "Non-Use Restriction. Receiving Party shall not use any Confidential Information for any purpose other than the Permitted Purpose. In particular, Receiving Party shall not use Confidential Information to compete with Disclosing Party, to poach customers or employees of Disclosing Party, or to develop products or services that compete with those of Disclosing Party."),
    ("3.1", "Non-Compete Clause. In consideration of access to Confidential Information, each Receiving Party agrees that for a period of thirty-six (36) months following the date of this Agreement (or the date of any disclosure, whichever is later), it shall not directly or indirectly engage in, own, manage, control, participate in, consult with, render services for, or in any manner engage in any business that competes with the business of the Disclosing Party in any geographic market where the Disclosing Party currently operates or has expressed intent to operate, including the entire continental United States, Canada, the United Kingdom, and the European Economic Area."),
    ("3.2", "Non-Solicitation of Employees. Each party agrees that during the term of this Agreement and for a period of twenty-four (24) months following its termination, it will not, directly or indirectly, solicit, induce, recruit, or encourage any employee of the other party to leave their employment, nor hire or engage any such employee as an employee, contractor, or consultant. This restriction applies to all current employees and any former employee who left within the prior twelve (12) months. Breach of this provision entitles the non-breaching party to liquidated damages of two hundred fifty thousand dollars ($250,000) per individual solicited or hired."),
    ("3.3", "Non-Solicitation of Customers. Each party agrees that during the term of this Agreement and for twenty-four (24) months thereafter, it will not solicit, contact, or attempt to do business with any customer or prospective customer of the other party whose identity or contact information was learned through access to Confidential Information under this Agreement."),
    ("4.1", "Intellectual Property Assignment. All analyses, reports, summaries, compilations, notes, and derivative works created by Receiving Party based on or incorporating Disclosing Party's Confidential Information shall automatically be deemed the property of the Disclosing Party upon creation and shall be promptly assigned and delivered to Disclosing Party upon request. Receiving Party waives all moral rights and rights of attribution with respect to such materials."),
    ("4.2", "Return or Destruction of Information. Upon the earlier of (i) completion of the due diligence process, (ii) termination of negotiations, or (iii) written request by Disclosing Party, Receiving Party shall promptly return or certifiably destroy all Confidential Information and all copies thereof, including materials stored in electronic form. Notwithstanding the foregoing, Receiving Party may retain one archival copy solely for legal compliance purposes, provided such copy remains subject to perpetual confidentiality obligations."),
    ("5.1", "Term. This Agreement shall commence on the Effective Date and shall remain in effect for a period of five (5) years. The confidentiality and non-compete obligations of Section 3 shall survive termination of this Agreement for the periods specified therein, notwithstanding any statement to the contrary in this Agreement or any other agreement between the parties."),
    ("5.2", "Injunctive Relief. Each party acknowledges that any breach of the confidentiality or non-compete provisions of this Agreement would cause irreparable harm for which monetary damages would be an inadequate remedy, and accordingly each party consents to the entry of injunctive relief, specific performance, and any other equitable remedy without the need to post bond or prove actual damages."),
    ("6.1", "No License. Nothing in this Agreement grants the Receiving Party any right, title, license, or interest in or to any Confidential Information, except the limited right to use the Confidential Information for the Permitted Purpose. Any goodwill generated in connection with the Permitted Purpose shall inure to the benefit of the Disclosing Party."),
    ("6.2", "No Warranty. All Confidential Information is provided \"as is\" without warranty of any kind. Disclosing Party makes no representation regarding the accuracy, completeness, or fitness for purpose of any Confidential Information, and shall not be liable for any damages arising from Receiving Party's reliance on Confidential Information."),
    ("7.1", "Standstill Provision. For a period of eighteen (18) months from the date of this Agreement, neither party shall acquire, or offer or propose to acquire, any securities, assets, or business of the other party except through the transaction contemplated by the Permitted Purpose, without the prior written consent of the other party's board of directors. Any violation of this provision shall entitle the non-breaching party to immediate injunctive relief and damages without limitation."),
    ("8.1", "Governing Law and Venue. This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions. Any action arising from or relating to this Agreement shall be brought exclusively in the state or federal courts located in San Francisco County, California, and each party irrevocably submits to the personal jurisdiction of such courts."),
    ("8.2", "Entire Agreement. This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior and contemporaneous negotiations, representations, and agreements. Any amendment must be in writing and signed by authorized representatives of both parties."),
    ("8.3", "Severability. If any provision of this Agreement is found to be unenforceable, such provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force and effect. The parties acknowledge that the non-compete provisions in Section 3.1 are intended to be enforced to the fullest extent permitted by applicable law."),
]

C2_MD = f"""# {C2_TITLE}

**Parties:** Meridian Holdings Inc. **AND** AcquiTech Capital LLC
**Effective Date:** {C2_DATE}
**Risk Classification:** 🟠 HIGH

---

## Risk Summary for Demo

This NDA contains several **high-risk provisions** that a prudent acquirer's counsel would flag immediately:

| Clause | Risk | Issue |
|--------|------|-------|
| §3.1 Non-Compete | 🔴 Critical | 36-month non-compete covering entire US/Canada/EU is likely unenforceable in California |
| §3.2 Non-Solicitation | 🟠 High | $250,000 liquidated damages per employee; potentially excessive |
| §4.1 IP Assignment | 🟠 High | All derivative works automatically assigned to Disclosing Party |
| §7.1 Standstill | 🟠 High | 18-month restriction on acquiring any securities of the other party |
| §3.3 Customer Non-Solicitation | 🟡 Medium | 24-month restriction beyond typical NDA scope |
| §1.1 Broad CI Definition | 🟡 Medium | Presumes all info confidential without marking requirement |

## TrustFoundry Legal Citations Expected
- *Edwards v. Arthur Andersen LLP (2008) 44 Cal.4th 937* — California non-compete unenforceability
- *Cal. Bus. & Prof. Code § 16600* — prohibition on non-compete agreements
- *Dowell v. Biosense Webster (2009)* — NDA non-compete scope limitations
- *Silguero v. Creteguard, Inc. (2010)* — employee non-solicitation under § 16600

---
"""

# ═══════════════════════════════════════════════════════════════════════════
# CONTRACT 3 — Executive Employment Agreement (HIGH risk)
# ═══════════════════════════════════════════════════════════════════════════

C3_TITLE  = "Executive Employment Agreement"
C3_SUB    = "Meridian Holdings Inc.  ·  Dr. Sarah Chen, VP Engineering"
C3_P1     = "Meridian Holdings Inc., a California corporation, 1100 Brickyard Way, Point Richmond, CA 94801"
C3_P2     = "Dr. Sarah Chen (\"Executive\"), residing at [address on file with HR]"
C3_DATE   = "January 10, 2026"
C3_SLUG   = "executive-employment-agreement-sarah-chen"

C3_CLAUSES = [
    ("1.1", "Position and Duties. Executive is employed as Vice President of Engineering. Executive shall report directly to the Chief Executive Officer and shall perform such duties as are customary for the position and as may be assigned by the CEO from time to time. Executive agrees to devote her full business time, attention, and energy to the Company's business and shall not engage in any other business activities without prior written approval of the Board of Directors."),
    ("1.2", "At-Will Employment. Executive's employment is at-will, meaning either Executive or the Company may terminate the employment relationship at any time, with or without cause, and with or without notice. The at-will nature of this employment relationship cannot be modified except by a written agreement signed by the Chief Executive Officer and approved by the Board of Directors."),
    ("2.1", "Base Salary. Executive shall receive a base salary of three hundred twenty-five thousand dollars ($325,000) per year, payable in accordance with the Company's regular payroll schedule, subject to withholding and payroll taxes. Base salary shall be reviewed annually but may not be increased without Board approval."),
    ("2.2", "Performance Bonus. Executive shall be eligible for an annual performance bonus of up to fifty percent (50%) of base salary, subject to achievement of performance objectives established by the CEO in his sole and non-reviewable discretion. The Company reserves the right to modify, reduce, or eliminate the bonus program at any time without notice or compensation to Executive."),
    ("2.3", "Equity Compensation. Executive shall receive stock options to purchase one hundred fifty thousand (150,000) shares of Common Stock at the fair market value on the date of grant, subject to a four-year vesting schedule with a one-year cliff (25% vesting after 12 months; remaining shares vesting ratably over the following 36 months). All equity awards are subject to the Company's Equity Incentive Plan and may be modified, reduced, or rescinded by the Board of Directors in its sole discretion."),
    ("3.1", "Confidentiality. Executive agrees to hold in strictest confidence all Proprietary Information of the Company, including without limitation technical data, trade secrets, research and development activities, financial information, strategic plans, customer lists, and employee information. Executive shall not disclose or use any Proprietary Information during or after employment, except as expressly authorized in writing by the CEO. The confidentiality obligation is perpetual and survives termination of employment for any reason."),
    ("3.2", "Invention Assignment. Executive hereby assigns and agrees to assign to the Company all inventions, developments, discoveries, improvements, and trade secrets that Executive makes, conceives, reduces to practice, or learns during the period of employment (\"Inventions\"), whether or not made during regular working hours, whether or not made at Company premises, and whether or not related to the Company's current or prospective business. Executive agrees that this assignment extends to any Invention made during the six (6) months following termination of employment that relates to any work or research conducted while employed. Executive waives any right to compensation for assigned Inventions beyond the compensation provided herein."),
    ("3.3", "Non-Compete Agreement. During employment and for a period of one hundred eighty (180) days following termination for any reason, Executive shall not directly or indirectly: (i) engage in, own, manage, operate, or control any entity that competes with the Company's business in the data infrastructure and enterprise software markets anywhere in the United States; (ii) serve as an employee, officer, director, consultant, or advisor to any such competing entity; or (iii) solicit or accept business from any customer or prospective customer of the Company with whom Executive had material contact during the final twenty-four (24) months of employment."),
    ("3.4", "Non-Solicitation of Employees. For a period of twenty-four (24) months following termination of employment for any reason, Executive shall not, directly or indirectly, solicit, recruit, induce, or hire any employee of the Company or encourage any employee to leave the Company. This restriction applies to all individuals employed by the Company as of Executive's termination date or during the twelve (12) months preceding it."),
    ("4.1", "Severance — Termination Without Cause. If the Company terminates Executive's employment without Cause (as defined herein), Executive shall receive, subject to execution and non-revocation of a general release of claims, (i) continuation of base salary for a period of ninety (90) days; and (ii) COBRA health coverage reimbursement for ninety (90) days. No other severance, bonus, equity acceleration, or benefits shall be provided. Executive expressly waives any right to accelerated equity vesting upon termination without cause."),
    ("4.2", "Termination for Cause. The Company may terminate Executive's employment for Cause at any time without notice or severance. \"Cause\" means: (i) commission of a felony; (ii) material breach of this Agreement; (iii) willful misconduct; (iv) failure to perform material duties after written warning; (v) violation of Company policy; or (vi) any conduct that the Board determines, in its reasonable discretion, to be detrimental to the Company. The determination of Cause shall be made solely by the Board, and such determination shall be final and binding on Executive."),
    ("4.3", "Change of Control. In the event of a Change of Control (as defined below), Executive shall receive no accelerated vesting of equity awards and no enhanced severance. If Executive's role is eliminated or materially diminished following a Change of Control, Executive's sole remedy shall be to resign and receive the severance provided under Section 4.1. \"Change of Control\" means any acquisition of more than fifty percent (50%) of the Company's voting securities or a sale of all or substantially all of the Company's assets."),
    ("5.1", "Dispute Resolution and Arbitration. Any dispute arising out of or related to this Agreement or Executive's employment shall be resolved by binding arbitration before a single JAMS arbitrator in San Francisco, California. EXECUTIVE WAIVES ANY AND ALL RIGHTS TO A JURY TRIAL AND ANY RIGHT TO BRING OR PARTICIPATE IN ANY CLASS ACTION OR COLLECTIVE PROCEEDING. The arbitration shall be confidential. The cost of the arbitrator shall be borne equally by the parties, except that Executive may seek an advance of costs if they demonstrate financial hardship. The arbitrator may award individual remedies only and may not award punitive damages."),
    ("5.2", "Outside Activities. Executive shall not engage in any outside employment, consulting, or board service without prior written consent of the CEO. The Company reserves the right to withhold or revoke such consent at any time. Any compensation received from permitted outside activities shall be disclosed to the Company and, if related to the Company's business area, may be subject to the invention assignment provisions of Section 3.2."),
    ("6.1", "Governing Law. This Agreement shall be governed by the laws of the State of California. The parties agree that the non-compete and invention assignment provisions are intended to be enforced to the maximum extent permitted by California law, which the parties acknowledge may be more restrictive than the law of other jurisdictions."),
    ("6.2", "Entire Agreement. This Agreement supersedes all prior representations, warranties, and agreements relating to Executive's employment. Executive represents that she has not been induced by any representation not set forth herein. Any modification requires written agreement signed by the CEO."),
]

C3_MD = f"""# {C3_TITLE}

**Employee:** Dr. Sarah Chen — VP Engineering
**Employer:** Meridian Holdings Inc.
**Effective Date:** {C3_DATE}
**Risk Classification:** 🟠 HIGH

---

## Risk Summary for Demo

This employment agreement is notable during the M&A review for several issues:

| Clause | Risk | Issue |
|--------|------|-------|
| §3.2 Invention Assignment | 🔴 Critical | Captures inventions for 6 months post-employment, including off-hours work |
| §3.3 Non-Compete | 🔴 Critical | 180-day US-wide non-compete likely void under CA Bus. & Prof. Code § 16600 |
| §4.3 No Change-of-Control Protection | 🟠 High | Executive gets zero accelerated vesting upon acquisition |
| §4.1 Thin Severance | 🟠 High | Only 90-day continuation; no equity acceleration on termination without cause |
| §5.1 Arbitration Waiver | 🟡 Medium | Class action waiver + equal cost-sharing even for Executive |
| §3.4 Non-Solicitation | 🟡 Medium | 24-month ban on recruiting any Company employee |

## TrustFoundry Legal Citations Expected
- *Edwards v. Arthur Andersen LLP, 44 Cal.4th 937 (2008)* — non-compete void under § 16600
- *Altavion, Inc. v. Konica Minolta Systems Lab (2014)* — trade secret / IP assignment scope
- *Iskanian v. CLS Transportation LA (2014)* — class action waiver in employment arbitration
- California Labor Code § 2870 — limits on assignment of inventions made on own time

---
"""

# ═══════════════════════════════════════════════════════════════════════════
# CONTRACT 4 — Vendor Master Services Agreement (MEDIUM risk)
# ═══════════════════════════════════════════════════════════════════════════

C4_TITLE  = "Vendor Master Services Agreement"
C4_SUB    = "Meridian Holdings Inc.  ·  CloudInfra Solutions LLC"
C4_P1     = "Meridian Holdings Inc., a California corporation, 1100 Brickyard Way, Point Richmond, CA 94801"
C4_P2     = "CloudInfra Solutions LLC, a Delaware limited liability company, 3000 Sand Hill Road, Menlo Park, CA 94025"
C4_DATE   = "December 1, 2025"
C4_SLUG   = "vendor-msa-cloudinfra"

C4_CLAUSES = [
    ("1.1", "Services. CloudInfra Solutions LLC (\"Vendor\") shall provide infrastructure management, DevOps consulting, and cloud migration services to Meridian Holdings Inc. (\"Company\") as described in Statements of Work executed from time to time. Vendor shall perform the Services in a professional and workmanlike manner consistent with industry standards."),
    ("1.2", "Personnel. Vendor shall assign qualified personnel to perform the Services. Company may request replacement of any Vendor personnel it finds unsatisfactory, and Vendor shall accommodate such requests within fifteen (15) business days where reasonably practicable."),
    ("1.3", "Independent Contractor. Vendor is an independent contractor and not an employee, agent, or partner of Company. Vendor shall be solely responsible for its employees' compensation, benefits, and applicable withholding taxes."),
    ("2.1", "Term. This Agreement commences on the Effective Date and continues for two (2) years unless earlier terminated. Either party may terminate this Agreement upon sixty (60) days written notice. Either party may terminate immediately upon the other party's material breach that remains uncured for thirty (30) days following written notice."),
    ("2.2", "Transition Assistance. Upon expiration or termination, Vendor shall provide up to sixty (60) days of transition assistance at Vendor's standard hourly rates to facilitate an orderly transfer of services. Vendor shall not withhold transition assistance as leverage in any payment dispute."),
    ("3.1", "Fees. Company shall pay Vendor at the rates specified in each SOW within thirty (30) days of invoice date. Invoices not disputed in good faith within fifteen (15) days of receipt shall be deemed accepted. Late payments bear interest at one percent (1%) per month, and Vendor may suspend Services after thirty (30) days of delinquency."),
    ("3.2", "Expenses. Company shall reimburse pre-approved travel and out-of-pocket expenses within forty-five (45) days of submission with supporting receipts. Expenses exceeding ten thousand dollars ($10,000) per month require advance written approval from Company's VP Finance."),
    ("3.3", "Fee Adjustments. Vendor may increase hourly rates upon ninety (90) days written notice, limited to a maximum increase of five percent (5%) per year tied to the Consumer Price Index. Company may reject any rate increase by terminating the applicable SOW within thirty (30) days of notice."),
    ("4.1", "Service Levels. For managed infrastructure services, Vendor shall maintain a monthly uptime target of 99.5% for production systems. Service credits for downtime below target shall be calculated at five percent (5%) of monthly fees per one-half percent (0.5%) below target, up to a maximum monthly credit of twenty percent (20%) of fees. Credits are Company's sole remedy for SLA failures."),
    ("4.2", "Incident Response. Vendor shall respond to critical incidents within one (1) hour of notification and restore service within four (4) hours for production outages. Vendor shall provide a root cause analysis within five (5) business days of any critical incident."),
    ("5.1", "Data Access. To perform the Services, Vendor shall have access to Company's production infrastructure and systems. Vendor personnel with system access shall undergo background checks and execute individual confidentiality agreements. Vendor shall not access, store, copy, or transmit Company data except as strictly necessary to perform the Services."),
    ("5.2", "Security Standards. Vendor shall maintain an information security program consistent with SOC 2 Type II requirements. Vendor shall provide Company with its most recent SOC 2 audit report upon request and shall promptly notify Company of any security incident affecting Company data within forty-eight (48) hours of discovery."),
    ("5.3", "Data Retention. Upon termination, Vendor shall securely destroy all Company data in its possession within thirty (30) days and provide written certification of destruction. Vendor shall not retain any Company data for its own purposes beyond the term of this Agreement."),
    ("6.1", "Limitation of Liability. Neither party shall be liable for consequential, indirect, or punitive damages. Vendor's total aggregate liability shall not exceed the total fees paid by Company in the twelve (12) months preceding the claim. This limitation does not apply to: (i) breaches of confidentiality; (ii) infringement of intellectual property; or (iii) gross negligence or willful misconduct."),
    ("6.2", "Indemnification. Each party shall indemnify the other against third-party claims arising from its own gross negligence or willful misconduct. Vendor shall additionally indemnify Company against claims that Vendor's deliverables infringe third-party intellectual property rights, provided that Company promptly notifies Vendor of such claims and cooperates in the defense."),
    ("7.1", "Intellectual Property. Work product specifically created for Company under a SOW and fully paid for by Company shall be owned by Company. Pre-existing tools, frameworks, and methodologies used by Vendor (\"Vendor Background IP\") remain Vendor's property, subject to a non-exclusive license for Company's internal use with the deliverables. Company shall own all data and configurations specific to its environment."),
    ("7.2", "License to Background IP. Vendor grants Company a perpetual, non-exclusive, royalty-free license to use Vendor Background IP incorporated into deliverables, solely for Company's internal business operations. This license survives termination of the Agreement and may not be sublicensed without Vendor's consent."),
    ("8.1", "Confidentiality. Each party shall maintain the confidentiality of the other's proprietary information using reasonable protective measures. The obligation continues for three (3) years following termination. Each party may disclose information to professional advisors under similar confidentiality obligations."),
    ("8.2", "Non-Solicitation. During the term and for twelve (12) months thereafter, Company shall not solicit or hire Vendor's employees who were directly involved in performing the Services. Vendor accepts the same obligation with respect to Company's employees. This section shall not restrict general recruitment advertising."),
    ("9.1", "Insurance. Vendor shall maintain commercial general liability insurance of at least two million dollars ($2,000,000) per occurrence, professional errors and omissions insurance of at least one million dollars ($1,000,000), and cybersecurity insurance of at least two million dollars ($2,000,000) throughout the term of this Agreement."),
    ("9.2", "Governing Law. This Agreement shall be governed by the laws of the State of Delaware. The parties consent to exclusive jurisdiction of the courts of New Castle County, Delaware for any disputes arising hereunder."),
    ("9.3", "Entire Agreement. This Agreement, together with all executed SOWs, constitutes the entire agreement between the parties with respect to the subject matter. Amendments require written execution by authorized representatives of both parties."),
]

C4_MD = f"""# {C4_TITLE}

**Parties:** Meridian Holdings Inc. **AND** CloudInfra Solutions LLC
**Effective Date:** {C4_DATE}
**Risk Classification:** 🟡 MEDIUM

---

## Risk Summary for Demo

This vendor agreement is generally reasonable but contains several provisions that warrant attention in an M&A context:

| Clause | Risk | Issue |
|--------|------|-------|
| §5.1 Broad Data Access | 🟠 High | Vendor has access to production infrastructure — change of control notification needed |
| §6.1 Liability Cap | 🟡 Medium | Cap based on 12-month fees is reasonable but excludes data breaches |
| §4.1 SLA Credits Capped | 🟡 Medium | Max 20% monthly credit may be insufficient for extended outages |
| §8.2 Non-Solicitation | 🟢 Low | 12-month mutual non-solicitation is industry standard |
| §7.1 IP Ownership | 🟢 Low | Company owns custom work product; clear Vendor IP carve-out |

## TrustFoundry Legal Citations Expected
- *Thrifty-Tel, Inc. v. Bezenek (1996)* — vendor data access liability
- Delaware UCC § 2-719 — limitation of remedies enforceability
- *Pac. Gas & Elec. v. Bear Stearns (1990)* — tortious interference in vendor relationships
- SOC 2 Type II as industry-standard security requirement

---
"""

# ═══════════════════════════════════════════════════════════════════════════
# PDF generation helper
# ═══════════════════════════════════════════════════════════════════════════

def make_pdf(title, sub, p1, p2, date, clauses, slug, sections_label="Services"):
    pdf = ContractPDF(title)
    pdf.add_page()
    pdf.title_block(title, sub)
    pdf.parties_block(p1, p2, date)

    # Recitals
    pdf.section("RECITALS", "Background")
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(30, 30, 30)
    w_body = pdf.w - pdf.l_margin - pdf.r_margin
    pdf.multi_cell(w_body, 6, safe(
        "WHEREAS, the parties wish to enter into this Agreement to set forth the terms and conditions "
        "governing their relationship; NOW, THEREFORE, in consideration of the mutual covenants "
        "and agreements hereinafter set forth and for other good and valuable consideration, the "
        "receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:"
    ))
    pdf.ln(4)

    # Main clauses — group by section number prefix
    current_section = None
    section_names = {
        "1": sections_label, "2": "Term and Termination", "3": "Compensation and Fees",
        "4": "Service Levels and Security", "5": "Intellectual Property",
        "6": "Liability and Indemnification", "7": "IP and Data Rights",
        "8": "General Provisions", "9": "Miscellaneous",
        "SIG": "Signatures",
    }
    for num, text in clauses:
        prefix = num.split(".")[0]
        if prefix != current_section:
            current_section = prefix
            label = section_names.get(prefix, prefix)
            pdf.section(prefix, label)
        pdf.clause(num, text)

    pdf.sig_block(p1.split(",")[0], p2.split(",")[0])

    out = os.path.join(SAMPLES_DIR, f"{slug}.pdf")
    pdf.output(out)
    print(f"  ✓ PDF: {out}")
    return out


def make_md(content, slug):
    out = os.path.join(SAMPLES_DIR, f"{slug}.md")
    with open(out, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  ✓ MD:  {out}")
    return out


# ═══════════════════════════════════════════════════════════════════════════
# Generate all contracts
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n🔨 Generating ClauseGuard demo contracts...\n")

    make_pdf(C1_TITLE, C1_SUB, C1_P1, C1_P2, C1_DATE, C1_CLAUSES, C1_SLUG, "Cloud Services")
    make_md(C1_MD, C1_SLUG)

    make_pdf(C2_TITLE, C2_SUB, C2_P1, C2_P2, C2_DATE, C2_CLAUSES, C2_SLUG, "Non-Disclosure Obligations")
    make_md(C2_MD, C2_SLUG)

    make_pdf(C3_TITLE, C3_SUB, C3_P1, C3_P2, C3_DATE, C3_CLAUSES, C3_SLUG, "Employment Terms")
    make_md(C3_MD, C3_SLUG)

    make_pdf(C4_TITLE, C4_SUB, C4_P1, C4_P2, C4_DATE, C4_CLAUSES, C4_SLUG, "Services")
    make_md(C4_MD, C4_SLUG)

    print("\n✅ All 4 contracts generated in", SAMPLES_DIR)
    print("\nContracts ready for demo:")
    for slug in [C1_SLUG, C2_SLUG, C3_SLUG, C4_SLUG]:
        print(f"  • {slug}.pdf  +  {slug}.md")
