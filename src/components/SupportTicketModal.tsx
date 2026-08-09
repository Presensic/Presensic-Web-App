import React, { useState } from "react";
import { motion } from "motion/react";
import { X, Send, AlertTriangle, ShieldCheck, Ticket, Calendar, Clock, Building, User } from "lucide-react";

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: {
    companyName: string;
    raisedBy: string; // e.g. "Employer Name" or "Employee Name (ID: EMP-001)"
  };
  setTickets: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function SupportTicketModal({
  isOpen,
  onClose,
  context,
  setTickets
}: SupportTicketModalProps) {
  const [category, setCategory] = useState("Technical Issue");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket = {
      id: ticketId,
      companyName: context.companyName || "N/A",
      raisedBy: context.raisedBy || "Unknown",
      category,
      subject,
      description,
      priority,
      status: "Open",
      submittedTime: new Date().toISOString(),
      replies: []
    };

    setTickets((prev) => [newTicket, ...prev]);
    setSubmittedId(ticketId);
  };

  const handleResetAndClose = () => {
    setCategory("Technical Issue");
    setSubject("");
    setDescription("");
    setPriority("Medium");
    setSubmittedId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto" id="support-ticket-modal-root">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleResetAndClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all w-full max-w-lg border border-slate-100 p-6 flex flex-col gap-5 z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-display text-slate-900 tracking-wide">
                  Raise a Support Ticket
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Report an issue or request dynamic assistance</p>
              </div>
            </div>
            <button
              onClick={handleResetAndClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {!submittedId ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Auto-attached Context Panel */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2 text-[10px] text-slate-500 font-medium">
                <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1">Auto-Attached System Context</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate"><strong>Company:</strong> {context.companyName || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate"><strong>User:</strong> {context.raisedBy || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span><strong>Date:</strong> {new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span><strong>Time:</strong> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issue Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="GPS/Location Problem">GPS/Location Problem</option>
                    <option value="Face Verification Issue">Face Verification Issue</option>
                    <option value="Payment/Billing">Payment/Billing</option>
                    <option value="Account Access">Account Access</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                <input
                  required
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Summarize the issue in a short sentence"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your issue in detail. Include any steps to reproduce if applicable."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-800 resize-none"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Send className="h-4 w-4" /> Submit Ticket
              </motion.button>
            </form>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 font-display">Ticket Submitted Successfully!</h4>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Our core support team has received your ticket and auto-attached your organization details. We will respond shortly.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 inline-block font-mono text-[11px] font-bold text-slate-700">
                Ticket ID: <span className="text-blue-600">{submittedId}</span>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleResetAndClose}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close Window
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
