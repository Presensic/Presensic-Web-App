const fs = require('fs');

let content = fs.readFileSync('src/components/EmployerDashboard.tsx', 'utf-8');

content = content.replace(
  '<div className="max-w-[1600px] mx-auto flex items-center justify-between">', 
  '<div className="max-w-[1600px] mx-auto flex flex-row items-center justify-between gap-3 sm:gap-6">'
);

content = content.replace(
  '<div className="flex items-center gap-3">', 
  '<div className="flex items-center gap-2 sm:gap-3 shrink-0">'
);

content = content.replace(
  '<div className="text-left">', 
  '<div className="text-left hidden md:block">'
);

content = content.replace(
  '<h1 className="text-md font-bold font-display tracking-tight text-slate-900 leading-tight">', 
  '<h1 className="text-sm sm:text-md font-bold font-display tracking-tight text-slate-900 leading-tight whitespace-nowrap">'
);

content = content.replace(
  '<p className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider mt-0.5">', 
  '<p className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider mt-0.5 whitespace-nowrap">'
);

content = content.replace(
  '<div className="flex items-center gap-4">', 
  '<div className="flex items-center justify-end gap-2 sm:gap-4 flex-1 min-w-0">'
);

content = content.replace(
  'className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-xs border ${', 
  'className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-xs border whitespace-nowrap shrink-0 max-w-[140px] sm:max-w-none ${'
);

content = content.replace(
  '<span>🕐 Trial: {billingDetails.daysLeft} Days Left</span>', 
  '<span className="truncate">🕐 Trial: {billingDetails.daysLeft}d</span>'
);

content = content.replace(
  '<span>✅ {billingPlan} — Renews in {billingDetails.daysLeft} Days</span>', 
  '<span className="truncate hidden sm:inline">✅ {billingPlan} — Renews in {billingDetails.daysLeft} Days</span><span className="truncate sm:hidden">✅ {billingPlan}</span>'
);

content = content.replace(
  '<span>⚠️ {billingStatus === "trial" ? "Trial" : "Subscription"} Expired — Renew Now</span>', 
  '<span className="truncate hidden sm:inline">⚠️ {billingStatus === "trial" ? "Trial" : "Subscription"} Expired — Renew Now</span><span className="truncate sm:hidden">⚠️ Expired</span>'
);

content = content.replace(
  'className={`p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all cursor-pointer ${', 
  'className={`p-1.5 sm:p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all cursor-pointer shrink-0 ${'
);

content = content.replace(
  'className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-xs font-bold font-display cursor-pointer transition-all active:scale-95 shadow-xs"', 
  'className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold font-display cursor-pointer transition-all active:scale-95 shadow-xs shrink-0 whitespace-nowrap"'
);

content = content.replace(
  '<LogOut className="h-3.5 w-3.5 text-white" /> Portal Log Out', 
  '<LogOut className="h-3.5 w-3.5 text-white shrink-0" /> <span className="hidden sm:inline">Portal </span>Log Out'
);

fs.writeFileSync('src/components/EmployerDashboard.tsx', content);
