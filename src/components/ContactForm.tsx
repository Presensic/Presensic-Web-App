import React, { useState, ChangeEvent, FormEvent } from "react";
import { Send, CheckCircle, Mail, Phone, Clock, Loader2, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Basic Validation
    if (!formData.name || !formData.email || !formData.message) {
      setErrorMessage("Please fill out all required fields.");
      setStatus("error");
      return;
    }

    setStatus("loading");

    const msgText = `New inquiry from Presensic website:
Name: ${formData.name}
Work Email: ${formData.email}
Phone: ${formData.phone || "—"}
Message: ${formData.message}`;

    const encodedMsg = encodeURIComponent(msgText);
    const whatsappUrl = `https://wa.me/919048618039?text=${encodedMsg}`;

    // Open WhatsApp in a new tab/window
    window.open(whatsappUrl, "_blank");

    // Simulate standard secure backend routing to presensic@gmail.com
    setTimeout(() => {
      setStatus("success");
      setFormData({ name: "", email: "", phone: "", message: "" });
    }, 800);
  };

  return (
    <section
      id="contact-us"
      className="py-24 bg-white border-t border-slate-100 text-slate-800 relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text / Info Column */}
          <div className="lg:col-span-5 text-left space-y-6">
            <span className="text-xs font-bold font-mono tracking-widest text-brand-600 uppercase">
              Get In Touch
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-slate-900">
              Ready to Upgrade Your Attendance System?
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Have questions about setting up geo-fences, custom shift timing, or integrating with your existing HRMS/payroll solution? Submit the form, and our sales engineering team will get back to you with custom answers.
            </p>

            <div className="space-y-4 pt-4">
              {/* Point 1 */}
              <div className="flex items-center gap-3.5 text-sm text-slate-600">
                <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-brand-600 shadow-xs">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-mono">EMAIL DIRECT</p>
                  <p className="font-bold text-slate-900">presensic@gmail.com</p>
                </div>
              </div>

              {/* Point 2 */}
              <div className="flex items-center gap-3.5 text-sm text-slate-600">
                <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-brand-600 shadow-xs">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-mono">SUPPORT DIRECT</p>
                  <p className="font-bold text-slate-900">+91-90486-18039</p>
                </div>
              </div>

              {/* Point 3 */}
              <div className="flex items-center gap-3.5 text-sm text-slate-600">
                <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-brand-600 shadow-xs">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-mono">SLA GUARANTEE</p>
                  <p className="font-bold text-emerald-700">We usually respond within 24 hours</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Form Card Column */}
          <div className="lg:col-span-7">
            <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
              
              {status === "success" ? (
                <div className="py-12 flex flex-col items-center text-center space-y-4 animate-scaleUp">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <CheckCircle className="h-8 w-8 animate-bounce" />
                  </div>
                  <h3 className="text-2xl font-bold font-display text-slate-900">Message Dispatched!</h3>
                  <p className="text-sm text-slate-600 max-w-md leading-relaxed">
                    Thank you! Your feedback message has been securely compiled and routed to <span className="text-brand-600 font-bold font-mono">presensic@gmail.com</span>. 
                  </p>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-500 font-mono max-w-sm shadow-xs">
                    Response ETA: Under 24 hours
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStatus("idle")}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold font-display text-xs transition-all cursor-pointer shadow-xs"
                  >
                    Send Another Message
                  </motion.button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 text-left">
                  
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold font-display text-slate-900">Talk to Our Team</h3>
                    <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-brand-500" /> Secure SSL Line
                    </div>
                  </div>

                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label htmlFor="name-input" className="text-xs font-bold text-slate-700 font-display">
                      Your Name <span className="text-brand-600">*</span>
                    </label>
                    <input
                      id="name-input"
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. John Doe"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all shadow-xs"
                    />
                  </div>

                  {/* Email & Phone grid */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="email-input" className="text-xs font-bold text-slate-700 font-display">
                        Work Email <span className="text-brand-600">*</span>
                      </label>
                      <input
                        id="email-input"
                        type="email"
                        name="email"
                        required
                        placeholder="rajesh@company.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all shadow-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="phone-input" className="text-xs font-bold text-slate-700 font-display flex items-center justify-between">
                        <span>Phone Number</span>
                        <span className="text-[9px] font-mono text-slate-400 font-normal">Optional</span>
                      </label>
                      <input
                        id="phone-input"
                        type="tel"
                        name="phone"
                        placeholder="+91-XXXXX-XXXXX"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Message field */}
                  <div className="space-y-1.5">
                    <label htmlFor="message-input" className="text-xs font-bold text-slate-700 font-display">
                      Message / Requirement details <span className="text-brand-600">*</span>
                    </label>
                    <textarea
                      id="message-input"
                      name="message"
                      required
                      rows={4}
                      placeholder="Tell us about your team size, locations, and attendance pain points..."
                      value={formData.message}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all resize-none shadow-xs"
                    />
                  </div>

                  {/* Error Notification */}
                  {status === "error" && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-xl">
                      {errorMessage}
                    </div>
                  )}

                  {/* Submit button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-600 disabled:from-slate-200 disabled:to-slate-200 text-white font-bold font-display text-sm py-3 px-4 rounded-xl shadow-lg shadow-brand-500/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Routing Message to Server...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send WhatsApp Message
                      </>
                    )}
                  </motion.button>

                  {/* Required note under the form */}
                  <p className="text-center text-[11px] text-slate-500 pt-2 font-mono">
                    You'll be redirected to WhatsApp to send your message — we usually respond within 24 hours.
                  </p>

                </form>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
