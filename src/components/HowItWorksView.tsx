import React, { useState } from 'react';
import { useGrievance } from '../context/GrievanceContext.tsx';

export const HowItWorksView: React.FC = () => {
  const { setActiveTab } = useGrievance();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does the Civic AI automatically classify and route my grievance?',
      a: 'The system uses advanced Natural Language Processing to parse the semantic text of your report. It cross-references municipal operational taxonomy, hazardous electrical terms, road degradation parameters, water distribution issues, and election conduct violations. Within 1.8 seconds, it scores routing confidence and inserts the ticket into the specific jurisdictional engineer queue without manual clerk intervention.',
    },
    {
      q: 'Can I report election violations and model code breaches anonymously?',
      a: 'Yes. For grievances routed to the Election Officer, you can check "Whistleblower Anonymous Mode". Your identity, mobile number, and contact details are cryptographic-hashed and hidden from field squads. You receive an isolated tracking key to monitor actions taken by the Returning Officer and Flying Squads (FST).',
    },
    {
      q: 'What happens if a department breaches its guaranteed SLA resolution target?',
      a: 'If a grievance is not resolved or verified within the committed SLA window (e.g. 24h for Electricity, 48h for Road Maintenance, 6h for Election Officer), our automated monitoring engine escalates the case to Tier-2: Zonal Municipal Commissioner. The citizen also possesses a one-click "Request SLA Escalation" button on their tracking timeline.',
    },
    {
      q: 'How is physical on-ground verification validated?',
      a: 'Before an issue can transition to "Resolved", the assigned field squad must upload geo-tagged post-repair photographs with timestamp coordinates matching within 50 meters of the initial complaint locus. The citizen then signs off or submits satisfaction feedback.',
    },
    {
      q: 'What is the role of Booth Level Officers (BLOs) in the Election Department?',
      a: 'For voter roll additions, EPIC card corrections (Form 8), and polling booth adjustments, the Election Department assigns a localized BLO who performs physical door-to-door verification within 72 hours before roll certification.',
    },
  ];

  return (
    <div className="w-full py-8 px-4 sm:px-6 md:px-8 max-w-[1200px] mx-auto flex flex-col gap-10">
      {/* Title */}
      <div className="flex flex-col gap-2 text-center max-w-3xl mx-auto">
        <span className="text-[11px] font-bold text-[#4059aa] uppercase tracking-wider">
          Citizen Charter & Operational Standards
        </span>
        <h1 className="text-[28px] sm:text-[36px] font-bold text-[#131b2e] tracking-tight">
          How the Grievance Redressal Protocol Operates
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#434655] leading-relaxed">
          Designed to eliminate administrative delays through artificial intelligence, geo-tagged mobile engineering
          squads, and transparent public accountability.
        </p>
      </div>

      {/* 4 Process Flow Steps */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-2">
            <span className="w-8 h-8 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center font-bold text-[14px]">
              1
            </span>
            <h3 className="font-semibold text-[16px] text-[#131b2e] mt-1">Multi-Channel Intake</h3>
            <p className="text-[13px] text-[#434655] leading-relaxed">
              Report via web form, WhatsApp gateway relay, or toll-free voice hotline with photos and GPS tags.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#0037b0] uppercase mt-4">Average: 30 Seconds</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-2">
            <span className="w-8 h-8 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center font-bold text-[14px]">
              2
            </span>
            <h3 className="font-semibold text-[16px] text-[#131b2e] mt-1">AI Triage & Routing</h3>
            <p className="text-[13px] text-[#434655] leading-relaxed">
              Natural Language Model identifies department, priority level, and assigns official tracking ID instantly.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#0037b0] uppercase mt-4">Average: 1.8 Seconds</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-2">
            <span className="w-8 h-8 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center font-bold text-[14px]">
              3
            </span>
            <h3 className="font-semibold text-[16px] text-[#131b2e] mt-1">Field Squad Action</h3>
            <p className="text-[13px] text-[#434655] leading-relaxed">
              Assigned Nodal Officer dispatches emergency repair units or flying squad for on-site execution.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#0037b0] uppercase mt-4">Within SLA Window</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-2">
            <span className="w-8 h-8 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center font-bold text-[14px]">
              4
            </span>
            <h3 className="font-semibold text-[16px] text-[#131b2e] mt-1">Citizen Sign-Off</h3>
            <p className="text-[13px] text-[#434655] leading-relaxed">
              Photo verification uploaded, SMS closure notification dispatched, and citizen rates service quality.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#0037b0] uppercase mt-4">Public Scorecard</span>
        </div>
      </div>

      {/* SLA Matrix Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#e2e8f0] flex flex-col gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#4059aa] uppercase tracking-wider">
            Mandatory Service Level Standards
          </span>
          <h2 className="text-[20px] font-bold text-[#131b2e]">Citizen Charter SLA Matrix</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#f2f3ff] text-[#131b2e] font-semibold border-b border-[#dae2fd]">
              <tr>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Primary Jurisdiction</th>
                <th className="py-3 px-4">Guaranteed SLA</th>
                <th className="py-3 px-4">First Escalation Point</th>
                <th className="py-3 px-4">Final Sign-Off Authority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0] text-[#434655]">
              <tr className="hover:bg-[#faf8ff]">
                <td className="py-3 px-4 font-semibold text-[#131b2e]">Electricity / Streetlight</td>
                <td className="py-3 px-4">Dark poles, dangling wires, transformer sparks</td>
                <td className="py-3 px-4 font-bold text-[#0037b0]">24 Hours</td>
                <td className="py-3 px-4">Executive Engineer (Electrical)</td>
                <td className="py-3 px-4">Chief Electrical Inspector</td>
              </tr>
              <tr className="hover:bg-[#faf8ff]">
                <td className="py-3 px-4 font-semibold text-[#131b2e]">Road Maintenance</td>
                <td className="py-3 px-4">Potholes, broken sidewalks, trench caving</td>
                <td className="py-3 px-4 font-bold text-[#0037b0]">48 Hours</td>
                <td className="py-3 px-4">Superintending Engineer (PWD)</td>
                <td className="py-3 px-4">Municipal Engineer-in-Chief</td>
              </tr>
              <tr className="hover:bg-[#faf8ff]">
                <td className="py-3 px-4 font-semibold text-[#131b2e]">Water Department</td>
                <td className="py-3 px-4">Supply cutoff, contaminated muddy water, burst mains</td>
                <td className="py-3 px-4 font-bold text-[#0037b0]">12 Hours</td>
                <td className="py-3 px-4">Chief Water Distribution Officer</td>
                <td className="py-3 px-4">Water Board Commissioner</td>
              </tr>
              <tr className="hover:bg-[#faf8ff]">
                <td className="py-3 px-4 font-semibold text-[#131b2e]">Election Department</td>
                <td className="py-3 px-4">Voter ID registration, name missing in roll, EPIC correction</td>
                <td className="py-3 px-4 font-bold text-[#0037b0]">72 Hours</td>
                <td className="py-3 px-4">Assistant Electoral Registration Officer</td>
                <td className="py-3 px-4">District Election Officer</td>
              </tr>
              <tr className="hover:bg-[#faf8ff]">
                <td className="py-3 px-4 font-semibold text-[#131b2e]">Election Officer</td>
                <td className="py-3 px-4">Model code violations, bribery, hate speech, booth intimidation</td>
                <td className="py-3 px-4 font-bold text-red-600">6 Hours (Fast-Track)</td>
                <td className="py-3 px-4">Returning Officer & Flying Squad</td>
                <td className="py-3 px-4">District Magistrate & Observers</td>
              </tr>
              <tr className="hover:bg-[#faf8ff]">
                <td className="py-3 px-4 font-semibold text-[#131b2e]">General Admin</td>
                <td className="py-3 px-4">Sanitation dumps, noise pollution, encroachment</td>
                <td className="py-3 px-4 font-bold text-[#0037b0]">24 Hours</td>
                <td className="py-3 px-4">Ward Sanitation Inspector</td>
                <td className="py-3 px-4">Additional Commissioner</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Escalation Hierarchy Graphic */}
      <div className="bg-[#eaedff] p-6 rounded-xl border border-[#dae2fd] flex flex-col gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#4059aa] uppercase tracking-wider">
            Accountability Protocol
          </span>
          <h3 className="text-[18px] font-bold text-[#131b2e]">3-Tier Grievance Escalation Ladder</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#dae2fd]">
            <span className="text-[11px] font-bold text-[#0037b0] uppercase">Tier 1: Nodal Officer</span>
            <h4 className="font-semibold text-[15px] text-[#131b2e] mt-1">Ward Field Engineer</h4>
            <p className="text-[12px] text-[#434655] mt-1">
              Initial receipt, on-site assessment, work order issuance, and ground execution within regular SLA window.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#dae2fd]">
            <span className="text-[11px] font-bold text-amber-600 uppercase">Tier 2: Escalation</span>
            <h4 className="font-semibold text-[15px] text-[#131b2e] mt-1">Zonal Commissioner</h4>
            <p className="text-[12px] text-[#434655] mt-1">
              Triggered automatically if SLA is breached or upon citizen manual escalation. Direct supervisory intervention.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#dae2fd]">
            <span className="text-[11px] font-bold text-red-600 uppercase">Tier 3: Ombudsman</span>
            <h4 className="font-semibold text-[15px] text-[#131b2e] mt-1">District Magistrate Cell</h4>
            <p className="text-[12px] text-[#434655] mt-1">
              Final appellate review for recurring civic failures, disciplinary summons, and election observer notices.
            </p>
          </div>
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-[#e2e8f0] flex flex-col gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#4059aa] uppercase tracking-wider">
            Public Knowledge Base
          </span>
          <h2 className="text-[20px] font-bold text-[#131b2e]">Frequently Asked Questions</h2>
        </div>

        <div className="divide-y divide-[#e2e8f0]">
          {faqs.map((faq, idx) => (
            <div key={idx} className="py-4">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between text-left gap-4 font-semibold text-[15px] text-[#131b2e] hover:text-[#0037b0] transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <span className="material-symbols-outlined text-[20px] text-[#747686]">
                  {openFaq === idx ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {openFaq === idx && (
                <p className="text-[14px] text-[#434655] mt-2 leading-relaxed animate-in fade-in duration-150">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="p-8 bg-[#f2f3ff] rounded-2xl border border-[#dae2fd] text-center flex flex-col items-center gap-3">
        <h3 className="text-[22px] font-bold text-[#131b2e]">Ready to Report an Issue in Your Ward?</h3>
        <p className="text-[14px] text-[#434655] max-w-xl">
          Takes under 60 seconds. Upload photos and receive real-time SMS progress updates until resolution.
        </p>
        <button
          type="button"
          onClick={() => {
            setActiveTab('submit-complaint');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="h-11 px-6 bg-[#1d4ed8] text-white text-[14px] font-semibold rounded-lg hover:bg-[#0037b0] transition-colors shadow-sm cursor-pointer mt-2"
        >
          Submit a Complaint Now
        </button>
      </div>
    </div>
  );
};
