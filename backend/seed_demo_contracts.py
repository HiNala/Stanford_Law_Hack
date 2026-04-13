"""
Seed the demo account with 4 high-quality M&A contracts as TXT files.
Deletes any existing contracts first for a clean slate.
Run: docker exec clauseguard-backend python /app/seed_demo_contracts.py
"""
import requests, time, sys

BASE = "http://localhost:8000"
EMAIL = "demo@clauseguard.ai"
PASSWORD = "demo1234"

# ── Contract text content ───────────────────────────────────────────────────

CONTRACTS = [

# ══════════════════════════════════════════════════════════════════
# 1. MASTER CLOUD SERVICES AGREEMENT  (CRITICAL risk)
# ══════════════════════════════════════════════════════════════════
("master-cloud-services-agreement.txt", """\
MASTER CLOUD SERVICES AGREEMENT

This Master Cloud Services Agreement ("Agreement") is entered into as of March 1, 2026, between:

AcquiTech Capital LLC, a Delaware limited liability company ("Company")
AND
DataVault Corp, a California corporation ("Vendor")

RECITALS

WHEREAS, the parties wish to set forth the terms governing Vendor's provision of cloud data services to Company. NOW, THEREFORE, in consideration of the mutual covenants herein, the parties agree as follows:

ARTICLE 1. SERVICES

Section 1.1 Scope of Services.
DataVault Corp ("Vendor") shall provide cloud data storage, processing, and analytics services as described in one or more Statements of Work ("SOW") incorporated herein by reference. Vendor may unilaterally modify, discontinue, or substitute any feature of the Services at any time, for any reason, upon thirty (30) days written notice. Company acknowledges that certain legacy modules may be deprecated without replacement and that pricing adjustments following feature changes are solely within Vendor's discretion.

Section 1.2 Perpetual Data License.
Company hereby grants Vendor a perpetual, irrevocable, royalty-free, worldwide license to use, copy, modify, and create derivative works from all data uploaded to the platform ("Customer Data") for the purposes of (i) providing the Services, (ii) improving Vendor's products and algorithms, (iii) training machine learning models, and (iv) any other lawful commercial purpose Vendor deems appropriate. This license survives termination of this Agreement indefinitely.

Section 1.3 Sub-processing.
Vendor may engage sub-processors in any jurisdiction without prior notice to or consent from Company. Vendor makes no representation regarding the data protection laws of jurisdictions where sub-processors may be located and disclaims all liability arising from sub-processor acts or omissions.

ARTICLE 2. TERM AND TERMINATION

Section 2.1 Term and Auto-Renewal.
This Agreement commences on the Effective Date and continues for an initial term of three (3) years. Upon expiration, this Agreement shall automatically renew for successive one-year periods unless either Party provides written cancellation notice no less than ninety (90) days prior to the end of the then-current term. Failure to provide timely cancellation notice shall obligate Company to pay all fees for the full renewal period even if Company ceases using the Services.

Section 2.2 Termination for Convenience.
Vendor may terminate this Agreement for any reason upon sixty (60) days written notice. Company may terminate only upon one hundred eighty (180) days written notice and only after payment of all outstanding fees plus an early termination fee equal to the greater of (i) six (6) months of the average monthly fees paid over the prior twelve-month period or (ii) $150,000 USD.

Section 2.3 Effect of Termination.
Upon termination for any reason, Company shall have fifteen (15) days to export its Customer Data. After such period, Vendor may permanently delete all Customer Data without further notice. Vendor shall have no obligation to maintain Customer Data in a retrievable format during or after the transition period.

ARTICLE 3. FEES AND PAYMENT

Section 3.1 Fees and Payment.
Company shall pay all fees specified in each SOW within fifteen (15) days of invoice date. Late payments shall bear interest at two percent (2%) per month (twenty-four percent (24%) per annum), compounded monthly. Vendor may suspend Services immediately upon any payment delinquency without cure period or notice. All fees are non-refundable regardless of Service quality or availability.

Section 3.2 Price Escalation.
Vendor reserves the right to increase fees upon sixty (60) days written notice. If Company objects to any price increase, its sole remedy is to terminate the Agreement subject to the early termination fee set forth in Section 2.2. Continued use of the Services after the notice period constitutes acceptance of the increased fees.

Section 3.3 Taxes.
Company shall be responsible for all taxes, levies, and duties associated with the Services, including any sales tax, use tax, VAT, or withholding tax, even if Vendor failed to collect such taxes at the time of invoicing.

ARTICLE 4. SERVICE LEVELS

Section 4.1 Service Level Agreement.
Vendor shall use commercially reasonable efforts to achieve ninety-nine percent (99%) uptime on a monthly basis. Vendor's sole obligation for failure to meet the SLA target is to provide a service credit equal to five percent (5%) of fees paid for the affected month. Service credits are Company's exclusive remedy for service disruptions and shall not exceed one month's fees in any twelve-month period.

Section 4.2 Scheduled Maintenance.
Vendor may conduct scheduled maintenance at any time and without prior notice. Scheduled maintenance windows are excluded from uptime calculations and may not exceed twenty (20) hours per month. Vendor accepts no liability for business losses caused by maintenance-related downtime.

Section 4.3 Data Security and Breach Notification.
Vendor will implement security measures it deems commercially reasonable. Vendor is not required to notify Company of any security incident or data breach unless required by applicable law. In the event of a confirmed breach, Vendor's liability is limited to providing twelve (12) months of credit monitoring services to affected individuals, regardless of the scope or impact of the breach.

ARTICLE 5. LIABILITY AND INDEMNIFICATION

Section 5.1 Limitation of Liability.
IN NO EVENT SHALL VENDOR BE LIABLE TO COMPANY FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, LOSS OF PROFITS, OR BUSINESS INTERRUPTION, EVEN IF VENDOR HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. VENDOR'S TOTAL AGGREGATE LIABILITY FOR ANY AND ALL CLAIMS ARISING UNDER OR RELATING TO THIS AGREEMENT SHALL NOT EXCEED THE LESSER OF (I) THE TOTAL FEES PAID BY COMPANY IN THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE CLAIM OR (II) FIVE THOUSAND DOLLARS ($5,000). THIS LIMITATION APPLIES REGARDLESS OF THE FORM OF ACTION.

Section 5.2 Indemnification by Company.
Company shall indemnify, defend, and hold harmless Vendor and its officers, directors, employees, and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from or related to: (i) Company's use of the Services; (ii) Company's Customer Data; (iii) any third-party claim that Company's data infringes any third-party right; (iv) Company's violation of applicable law; or (v) Company's breach of this Agreement. This indemnification obligation is unlimited in scope and amount.

Section 5.3 Indemnification by Vendor.
Vendor shall indemnify Company solely against claims that the Vendor-provided software directly infringes a United States patent or registered copyright, subject to a maximum indemnification cap of twenty-five thousand dollars ($25,000). Vendor's indemnification obligation is conditioned upon Company promptly notifying Vendor of any such claim and granting Vendor sole control of the defense.

ARTICLE 6. INTELLECTUAL PROPERTY

Section 6.1 Intellectual Property Ownership.
All inventions, developments, improvements, and work product created by Vendor in connection with the Services, even if created using Company's Confidential Information or Customer Data, shall be the exclusive property of Vendor. Company receives only the limited, non-exclusive right to access the Services during the term of this Agreement. Company waives any claim to ownership of or compensation for any such work product.

Section 6.2 Derived Data Rights.
Vendor retains all rights in any insights, statistics, benchmarks, or aggregated data derived from Customer Data ("Derived Data"). Vendor may commercialize Derived Data without restriction or compensation to Company. Company acknowledges that it has no ownership interest in Derived Data.

ARTICLE 7. CONFIDENTIALITY

Section 7.1 Confidentiality Obligations.
Each party agrees to maintain in confidence the other party's Confidential Information using at least the same degree of care it uses for its own confidential information. The confidentiality obligation survives termination for two (2) years. Vendor is expressly permitted to disclose Company Confidential Information to its sub-processors, advisors, and potential acquirers without restriction.

Section 7.2 Non-Solicitation.
During the term and for twenty-four (24) months thereafter, Company shall not directly or indirectly solicit, recruit, hire, or engage any person who is or was an employee or contractor of Vendor, without Vendor's prior written consent. Breach of this provision shall give rise to liquidated damages of one hundred thousand dollars ($100,000) per individual solicited.

ARTICLE 8. DISPUTE RESOLUTION

Section 8.1 Binding Arbitration and Class Action Waiver.
Any dispute arising out of or relating to this Agreement shall be resolved by binding arbitration administered by JAMS under its Streamlined Arbitration Rules. Arbitration shall take place in San Francisco, California. COMPANY EXPRESSLY WAIVES ANY RIGHT TO A JURY TRIAL AND ANY RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION. The arbitrator shall have no authority to award punitive damages, and any award shall be final and binding.

Section 8.2 Governing Law.
This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law principles.

Section 8.3 Force Majeure.
Neither party shall be liable for delays caused by circumstances beyond its reasonable control. Vendor may suspend Services for the duration of a force majeure event without liability; however, Company's payment obligations shall continue unabated during any such suspension.

Section 8.4 Entire Agreement; Unilateral Amendment.
Vendor may amend this Agreement at any time by posting updated terms on its website. Company's continued use of the Services following any amendment shall constitute acceptance. Company waives the right to receive direct notice of amendments.

[SIGNATURE PAGE FOLLOWS]

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

AcquiTech Capital LLC                    DataVault Corp
Signature: ____________________          Signature: ____________________
Name: _________________________          Name: _________________________
Title: _________________________          Title: _________________________
"""),

# ══════════════════════════════════════════════════════════════════
# 2. MUTUAL NON-DISCLOSURE AGREEMENT  (HIGH risk)
# ══════════════════════════════════════════════════════════════════
("mutual-nda-meridian-acquitech.txt", """\
MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of February 15, 2026, between:

Meridian Holdings Inc., a California corporation ("Disclosing Party / Receiving Party")
AND
AcquiTech Capital LLC, a Delaware limited liability company ("Disclosing Party / Receiving Party")

RECITALS

The parties desire to explore a potential business transaction and wish to protect their respective confidential information. NOW, THEREFORE, in consideration of the mutual covenants herein, the parties agree as follows:

ARTICLE 1. DEFINITIONS

Section 1.1 Confidential Information.
"Confidential Information" means any information disclosed by one party ("Disclosing Party") to the other party ("Receiving Party"), either directly or indirectly, in writing, orally or by inspection of tangible objects, including without limitation all business plans, financial projections, customer lists, personnel files, trade secrets, inventions, source code, product roadmaps, and pricing information. The parties agree that this definition is intentionally broad and that any information relating to the Disclosing Party's business shall be presumed Confidential Information absent an express written statement to the contrary.

Section 1.2 Exclusions from Confidential Information.
The obligations of confidentiality shall not apply to information that: (i) is or becomes publicly known through no wrongful act of the Receiving Party; (ii) was rightfully known to the Receiving Party prior to disclosure; (iii) is independently developed by Receiving Party without use of Confidential Information; or (iv) is required to be disclosed by law or court order, provided that Receiving Party gives Disclosing Party reasonable advance written notice.

ARTICLE 2. CONFIDENTIALITY OBLIGATIONS

Section 2.1 Non-Disclosure Obligation.
Each Receiving Party agrees to hold all Confidential Information in strict confidence, to use it solely for evaluating a potential transaction between the parties (the "Permitted Purpose"), and to disclose it only to employees, officers, and advisors who (a) have a need to know for the Permitted Purpose, and (b) are bound by confidentiality obligations at least as protective as those set forth herein.

Section 2.2 Non-Use Restriction.
Receiving Party shall not use any Confidential Information for any purpose other than the Permitted Purpose. In particular, Receiving Party shall not use Confidential Information to compete with Disclosing Party, to poach customers or employees, or to develop products or services that compete with those of Disclosing Party.

ARTICLE 3. RESTRICTIVE COVENANTS

Section 3.1 Non-Compete Clause.
In consideration of access to Confidential Information, each Receiving Party agrees that for a period of thirty-six (36) months following the date of this Agreement, it shall not directly or indirectly engage in, own, manage, operate, or control any entity that competes with the business of the Disclosing Party in any geographic market where the Disclosing Party currently operates or has expressed intent to operate, including the entire continental United States, Canada, the United Kingdom, and the European Economic Area.

Section 3.2 Non-Solicitation of Employees.
Each party agrees that during the term of this Agreement and for a period of twenty-four (24) months following its termination, it will not, directly or indirectly, solicit, induce, recruit, or encourage any employee of the other party to leave their employment, nor hire or engage any such employee as an employee, contractor, or consultant. This restriction applies to all current employees and any former employee who left within the prior twelve (12) months. Breach of this provision entitles the non-breaching party to liquidated damages of two hundred fifty thousand dollars ($250,000) per individual solicited or hired.

Section 3.3 Non-Solicitation of Customers.
Each party agrees that during the term and for twenty-four (24) months thereafter, it will not solicit, contact, or attempt to do business with any customer or prospective customer of the other party whose identity was learned through access to Confidential Information under this Agreement.

ARTICLE 4. INTELLECTUAL PROPERTY

Section 4.1 Intellectual Property Assignment.
All analyses, reports, summaries, compilations, notes, and derivative works created by Receiving Party based on or incorporating Disclosing Party's Confidential Information shall automatically be deemed the property of the Disclosing Party upon creation and shall be promptly assigned and delivered to Disclosing Party upon request. Receiving Party waives all moral rights and rights of attribution with respect to such materials.

Section 4.2 Return or Destruction of Information.
Upon the earlier of (i) completion of the due diligence process or (ii) written request by Disclosing Party, Receiving Party shall promptly return or certifiably destroy all Confidential Information and all copies thereof, including materials stored in electronic form. Receiving Party may retain one archival copy solely for legal compliance purposes, subject to perpetual confidentiality obligations.

ARTICLE 5. TERM AND REMEDIES

Section 5.1 Term and Survival.
This Agreement shall commence on the Effective Date and shall remain in effect for a period of five (5) years. The confidentiality and non-compete obligations shall survive termination for the periods specified therein.

Section 5.2 Injunctive Relief.
Each party acknowledges that any breach of the confidentiality or non-compete provisions would cause irreparable harm for which monetary damages would be an inadequate remedy, and accordingly each party consents to the entry of injunctive relief without the need to post bond or prove actual damages.

ARTICLE 6. GENERAL PROVISIONS

Section 6.1 No License.
Nothing in this Agreement grants the Receiving Party any right, title, license, or interest in or to any Confidential Information, except the limited right to use the Confidential Information for the Permitted Purpose.

Section 6.2 Standstill Provision.
For a period of eighteen (18) months from the date of this Agreement, neither party shall acquire, or offer to acquire, any securities, assets, or business of the other party except through the transaction contemplated by the Permitted Purpose, without the prior written consent of the other party's board of directors.

Section 6.3 Governing Law and Venue.
This Agreement shall be governed by and construed in accordance with the laws of the State of California. Any action arising from or relating to this Agreement shall be brought exclusively in the state or federal courts located in San Francisco County, California.

Section 6.4 Entire Agreement.
This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof. Any amendment must be in writing and signed by authorized representatives of both parties.

Section 6.5 Severability.
The parties acknowledge that the non-compete provisions in Section 3.1 are intended to be enforced to the fullest extent permitted by applicable law.

[SIGNATURE PAGE FOLLOWS]

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

Meridian Holdings Inc.                   AcquiTech Capital LLC
Signature: ____________________          Signature: ____________________
Name: _________________________          Name: _________________________
Title: _________________________          Title: _________________________
"""),

# ══════════════════════════════════════════════════════════════════
# 3. EXECUTIVE EMPLOYMENT AGREEMENT  (HIGH risk)
# ══════════════════════════════════════════════════════════════════
("executive-employment-agreement-sarah-chen.txt", """\
EXECUTIVE EMPLOYMENT AGREEMENT

This Executive Employment Agreement ("Agreement") is entered into as of January 10, 2026, between:

Meridian Holdings Inc., a California corporation ("Company")
AND
Dr. Sarah Chen ("Executive")

RECITALS

The Company desires to employ Executive as Vice President of Engineering and Executive desires to accept such employment on the terms and conditions set forth herein.

ARTICLE 1. EMPLOYMENT

Section 1.1 Position and Duties.
Executive is employed as Vice President of Engineering. Executive shall report directly to the Chief Executive Officer and shall perform such duties as are customary for the position and as may be assigned by the CEO from time to time. Executive agrees to devote her full business time, attention, and energy to the Company's business and shall not engage in any other business activities without prior written approval of the Board of Directors.

Section 1.2 At-Will Employment.
Executive's employment is at-will, meaning either Executive or the Company may terminate the employment relationship at any time, with or without cause, and with or without notice. The at-will nature of this employment relationship cannot be modified except by a written agreement signed by the Chief Executive Officer and approved by the Board of Directors.

ARTICLE 2. COMPENSATION

Section 2.1 Base Salary.
Executive shall receive a base salary of three hundred twenty-five thousand dollars ($325,000) per year, payable in accordance with the Company's regular payroll schedule, subject to withholding and payroll taxes. Base salary shall be reviewed annually but may not be increased without Board approval.

Section 2.2 Performance Bonus.
Executive shall be eligible for an annual performance bonus of up to fifty percent (50%) of base salary, subject to achievement of performance objectives established by the CEO in his sole and non-reviewable discretion. The Company reserves the right to modify, reduce, or eliminate the bonus program at any time without notice or compensation to Executive.

Section 2.3 Equity Compensation.
Executive shall receive stock options to purchase one hundred fifty thousand (150,000) shares of Common Stock at the fair market value on the date of grant, subject to a four-year vesting schedule with a one-year cliff. All equity awards are subject to the Company's Equity Incentive Plan and may be modified, reduced, or rescinded by the Board of Directors in its sole discretion.

ARTICLE 3. RESTRICTIVE COVENANTS AND IP

Section 3.1 Confidentiality.
Executive agrees to hold in strictest confidence all Proprietary Information of the Company, including without limitation technical data, trade secrets, research and development, financial information, strategic plans, customer lists, and employee information. Executive shall not disclose or use any Proprietary Information during or after employment. The confidentiality obligation is perpetual and survives termination for any reason.

Section 3.2 Invention Assignment.
Executive hereby assigns and agrees to assign to the Company all inventions, developments, discoveries, improvements, and trade secrets that Executive makes, conceives, reduces to practice, or learns during the period of employment ("Inventions"), whether or not made during regular working hours, whether or not made at Company premises, and whether or not related to the Company's current or prospective business. Executive agrees that this assignment extends to any Invention made during the six (6) months following termination of employment that relates to any work conducted while employed. Executive waives any right to compensation for assigned Inventions beyond the compensation provided herein.

Section 3.3 Non-Compete Agreement.
During employment and for a period of one hundred eighty (180) days following termination for any reason, Executive shall not directly or indirectly: (i) engage in, own, manage, operate, or control any entity that competes with the Company's business in the data infrastructure and enterprise software markets anywhere in the United States; (ii) serve as an employee, officer, director, consultant, or advisor to any such competing entity; or (iii) solicit or accept business from any customer of the Company with whom Executive had material contact during the final twenty-four (24) months of employment.

Section 3.4 Non-Solicitation of Employees.
For a period of twenty-four (24) months following termination of employment for any reason, Executive shall not, directly or indirectly, solicit, recruit, induce, or hire any employee of the Company or encourage any employee to leave the Company. This restriction applies to all individuals employed by the Company as of Executive's termination date or during the twelve (12) months preceding it.

ARTICLE 4. TERMINATION AND SEVERANCE

Section 4.1 Severance on Termination Without Cause.
If the Company terminates Executive's employment without Cause, Executive shall receive, subject to execution and non-revocation of a general release of claims: (i) continuation of base salary for a period of ninety (90) days; and (ii) COBRA health coverage reimbursement for ninety (90) days. No other severance, bonus, equity acceleration, or benefits shall be provided. Executive expressly waives any right to accelerated equity vesting upon termination without cause.

Section 4.2 Termination for Cause.
The Company may terminate Executive's employment for Cause at any time without notice or severance. "Cause" means: (i) commission of a felony; (ii) material breach of this Agreement; (iii) willful misconduct; (iv) failure to perform material duties after written warning; or (v) any conduct that the Board determines, in its sole discretion, to be detrimental to the Company. The determination of Cause shall be made solely by the Board and shall be final and binding on Executive.

Section 4.3 No Change of Control Protection.
In the event of a Change of Control, Executive shall receive no accelerated vesting of equity awards and no enhanced severance. If Executive's role is eliminated or materially diminished following a Change of Control, Executive's sole remedy shall be to resign and receive the severance provided under Section 4.1. "Change of Control" means any acquisition of more than fifty percent (50%) of the Company's voting securities or a sale of all or substantially all of the Company's assets.

ARTICLE 5. DISPUTE RESOLUTION

Section 5.1 Binding Arbitration and Class Action Waiver.
Any dispute arising out of or related to this Agreement or Executive's employment shall be resolved by binding arbitration before a single JAMS arbitrator in San Francisco, California. EXECUTIVE WAIVES ANY AND ALL RIGHTS TO A JURY TRIAL AND ANY RIGHT TO BRING OR PARTICIPATE IN ANY CLASS ACTION OR COLLECTIVE PROCEEDING. The arbitration shall be confidential. The cost of the arbitrator shall be borne equally by the parties. The arbitrator may award individual remedies only and may not award punitive damages.

Section 5.2 Outside Activities.
Executive shall not engage in any outside employment, consulting, or board service without prior written consent of the CEO. The Company reserves the right to withhold or revoke such consent at any time.

ARTICLE 6. GENERAL PROVISIONS

Section 6.1 Governing Law.
This Agreement shall be governed by the laws of the State of California. The parties agree that the non-compete and invention assignment provisions are intended to be enforced to the maximum extent permitted by California law.

Section 6.2 Entire Agreement.
This Agreement supersedes all prior representations, warranties, and agreements relating to Executive's employment. Any modification requires written agreement signed by the CEO.

[SIGNATURE PAGE FOLLOWS]

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

Meridian Holdings Inc.                   Dr. Sarah Chen
Signature: ____________________          Signature: ____________________
Name: _________________________          Name: Dr. Sarah Chen
Title: Chief Executive Officer            Date: ____________________
"""),

# ══════════════════════════════════════════════════════════════════
# 4. VENDOR MASTER SERVICES AGREEMENT  (MEDIUM risk)
# ══════════════════════════════════════════════════════════════════
("vendor-msa-cloudinfra.txt", """\
VENDOR MASTER SERVICES AGREEMENT

This Vendor Master Services Agreement ("Agreement") is entered into as of December 1, 2025, between:

Meridian Holdings Inc., a California corporation ("Company")
AND
CloudInfra Solutions LLC, a Delaware limited liability company ("Vendor")

RECITALS

The parties desire to establish terms and conditions under which Vendor will provide infrastructure management and cloud services to Company.

ARTICLE 1. SERVICES

Section 1.1 Scope of Services.
CloudInfra Solutions LLC ("Vendor") shall provide infrastructure management, DevOps consulting, and cloud migration services to Meridian Holdings Inc. ("Company") as described in Statements of Work executed from time to time. Vendor shall perform the Services in a professional and workmanlike manner consistent with industry standards.

Section 1.2 Personnel.
Vendor shall assign qualified personnel to perform the Services. Company may request replacement of any Vendor personnel it finds unsatisfactory, and Vendor shall accommodate such requests within fifteen (15) business days where reasonably practicable.

Section 1.3 Independent Contractor.
Vendor is an independent contractor and not an employee, agent, or partner of Company. Vendor shall be solely responsible for its employees' compensation, benefits, and applicable withholding taxes.

ARTICLE 2. TERM AND TERMINATION

Section 2.1 Term and Termination.
This Agreement commences on the Effective Date and continues for two (2) years unless earlier terminated. Either party may terminate this Agreement upon sixty (60) days written notice. Either party may terminate immediately upon the other party's material breach that remains uncured for thirty (30) days following written notice.

Section 2.2 Transition Assistance.
Upon expiration or termination, Vendor shall provide up to sixty (60) days of transition assistance at Vendor's standard hourly rates to facilitate an orderly transfer of services. Vendor shall not withhold transition assistance as leverage in any payment dispute.

ARTICLE 3. FEES AND PAYMENT

Section 3.1 Fees and Payment Terms.
Company shall pay Vendor at the rates specified in each SOW within thirty (30) days of invoice date. Invoices not disputed in good faith within fifteen (15) days of receipt shall be deemed accepted. Late payments bear interest at one percent (1%) per month, and Vendor may suspend Services after thirty (30) days of delinquency.

Section 3.2 Expense Reimbursement.
Company shall reimburse pre-approved travel and out-of-pocket expenses within forty-five (45) days of submission with supporting receipts. Expenses exceeding ten thousand dollars ($10,000) per month require advance written approval from Company's VP Finance.

Section 3.3 Fee Adjustments.
Vendor may increase hourly rates upon ninety (90) days written notice, limited to a maximum increase of five percent (5%) per year tied to the Consumer Price Index. Company may reject any rate increase by terminating the applicable SOW within thirty (30) days of notice.

ARTICLE 4. SERVICE LEVELS AND SECURITY

Section 4.1 Service Level Agreement.
For managed infrastructure services, Vendor shall maintain a monthly uptime target of 99.5% for production systems. Service credits for downtime below target shall be calculated at five percent (5%) of monthly fees per one-half percent (0.5%) below target, up to a maximum monthly credit of twenty percent (20%) of fees. Credits are Company's sole remedy for SLA failures.

Section 4.2 Incident Response.
Vendor shall respond to critical incidents within one (1) hour of notification and restore service within four (4) hours for production outages. Vendor shall provide a root cause analysis within five (5) business days of any critical incident.

Section 4.3 Data Access and Security.
To perform the Services, Vendor shall have access to Company's production infrastructure and systems. Vendor personnel with system access shall undergo background checks and execute individual confidentiality agreements. Vendor shall not access, store, copy, or transmit Company data except as strictly necessary to perform the Services.

Section 4.4 Security Standards.
Vendor shall maintain an information security program consistent with SOC 2 Type II requirements. Vendor shall provide Company with its most recent SOC 2 audit report upon request and shall promptly notify Company of any security incident affecting Company data within forty-eight (48) hours of discovery.

Section 4.5 Data Retention and Destruction.
Upon termination, Vendor shall securely destroy all Company data in its possession within thirty (30) days and provide written certification of destruction. Vendor shall not retain any Company data for its own purposes beyond the term of this Agreement.

ARTICLE 5. INTELLECTUAL PROPERTY

Section 5.1 Ownership of Work Product.
Work product specifically created for Company under a SOW and fully paid for by Company shall be owned by Company. Pre-existing tools, frameworks, and methodologies used by Vendor ("Vendor Background IP") remain Vendor's property, subject to a non-exclusive license for Company's internal use with the deliverables.

Section 5.2 License to Background IP.
Vendor grants Company a perpetual, non-exclusive, royalty-free license to use Vendor Background IP incorporated into deliverables, solely for Company's internal business operations. This license survives termination of the Agreement and may not be sublicensed without Vendor's consent.

ARTICLE 6. LIABILITY AND INDEMNIFICATION

Section 6.1 Limitation of Liability.
Neither party shall be liable for consequential, indirect, or punitive damages. Vendor's total aggregate liability shall not exceed the total fees paid by Company in the twelve (12) months preceding the claim. This limitation does not apply to: (i) breaches of confidentiality; (ii) infringement of intellectual property; or (iii) gross negligence or willful misconduct.

Section 6.2 Indemnification.
Each party shall indemnify the other against third-party claims arising from its own gross negligence or willful misconduct. Vendor shall additionally indemnify Company against claims that Vendor's deliverables infringe third-party intellectual property rights.

ARTICLE 7. CONFIDENTIALITY AND NON-SOLICITATION

Section 7.1 Confidentiality.
Each party shall maintain the confidentiality of the other's proprietary information using reasonable protective measures for three (3) years following termination.

Section 7.2 Non-Solicitation.
During the term and for twelve (12) months thereafter, Company shall not solicit or hire Vendor's employees who were directly involved in performing the Services. Vendor accepts the same obligation with respect to Company's employees. This section shall not restrict general recruitment advertising.

ARTICLE 8. INSURANCE AND GENERAL PROVISIONS

Section 8.1 Insurance.
Vendor shall maintain commercial general liability insurance of at least two million dollars ($2,000,000) per occurrence, professional errors and omissions insurance of at least one million dollars ($1,000,000), and cybersecurity insurance of at least two million dollars ($2,000,000) throughout the term of this Agreement.

Section 8.2 Change of Control Notification.
Each party shall provide written notice to the other within ten (10) business days of any Change of Control event. "Change of Control" means (i) acquisition of more than 50% of voting securities, (ii) merger or consolidation, or (iii) sale of all or substantially all assets. Either party may terminate this Agreement within sixty (60) days of such notice if the Change of Control results in a direct competitor of the terminating party acquiring control of the other party.

Section 8.3 Governing Law.
This Agreement shall be governed by the laws of the State of Delaware. The parties consent to exclusive jurisdiction of the courts of New Castle County, Delaware for any disputes arising hereunder.

Section 8.4 Entire Agreement.
This Agreement, together with all executed SOWs, constitutes the entire agreement between the parties with respect to the subject matter. Amendments require written execution by authorized representatives of both parties.

[SIGNATURE PAGE FOLLOWS]

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

Meridian Holdings Inc.                   CloudInfra Solutions LLC
Signature: ____________________          Signature: ____________________
Name: _________________________          Name: _________________________
Title: _________________________          Title: _________________________
"""),
]

# ── Upload logic ──────────────────────────────────────────────────────────────

def main():
    print("\n🔐 Logging in as demo@clauseguard.ai...")
    r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    r.raise_for_status()
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Delete all existing contracts
    existing = requests.get(f"{BASE}/api/contracts/?page=1&page_size=50", headers=headers).json()
    for c in existing.get("items", []):
        requests.delete(f"{BASE}/api/contracts/{c['id']}", headers=headers)
        print(f"  Deleted: {c['original_filename']}")

    print(f"\n📤 Uploading {len(CONTRACTS)} contracts...")
    ids = []
    for fname, content in CONTRACTS:
        resp = requests.post(
            f"{BASE}/api/contracts/upload",
            headers=headers,
            files={"file": (fname, content.encode("utf-8"), "text/plain")},
        )
        d = resp.json()
        cid = d.get("id", "???")
        ids.append(cid)
        print(f"  {fname:<55} -> {cid}  [{d.get('status','')}]")

    print("\n⏳ Waiting 90s for analysis pipeline to complete...")
    time.sleep(90)

    print("\n📊 Final status:")
    for cid in ids:
        try:
            c = requests.get(f"{BASE}/api/contracts/{cid}", headers=headers).json()
            clauses = requests.get(f"{BASE}/api/clauses/{cid}", headers=headers).json()
            n = clauses.get("total", 0)
            grounded = sum(1 for cl in clauses.get("clauses", [])
                          if cl.get("metadata_", {}) and cl["metadata_"].get("legal_grounding"))
            print(f"  [{c.get('status','?').upper():<10}] {c.get('risk_level','?'):<8} "
                  f"{round((c.get('overall_risk_score') or 0)*100)}%  "
                  f"clauses={n}  grounded={grounded}  {c.get('original_filename','')}")
        except Exception as e:
            print(f"  {cid}: {e}")

    print("\n✅ Demo account ready!")

if __name__ == "__main__":
    main()
