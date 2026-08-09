import fs from 'fs';

let content = fs.readFileSync('src/components/EmployerDashboard.tsx', 'utf-8');

const oldHeaderStr = `<header className="bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-md font-bold font-display tracking-tight text-slate-900 leading-tight">
                Presensic
              </h1>
              <p className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider mt-0.5">
                QUANTUM BIOLABS · EMPLOYER PORTAL
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Subscription / Trial Status Badge */}
            <div
              onClick={() => setIsRenewalModalOpen(true)}
              className={\`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-xs border \${
                billingStatus === "trial" && !isGated
                  ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                  : billingStatus === "active" && !isGated
                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200 animate-pulse font-bold"
              }\`}
              title="View plans & subscription details"
            >
              {billingStatus === "trial" && !isGated && (
                <>
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <span>🕐 Trial: {billingDetails.daysLeft} Days Left</span>
                </>
              )}
              {billingStatus === "active" && !isGated && (
                <>
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span>✅ {billingPlan} — Renews in {billingDetails.daysLeft} Days</span>
                </>
              )}
              {isGated && (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  <span>⚠️ {billingStatus === "trial" ? "Trial" : "Subscription"} Expired — Renew Now</span>
                </>
              )}
            </div>

            <button
              onClick={handleRefreshFeed}
              className={\`p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all cursor-pointer \${
                isRefreshing ? "animate-spin text-blue-600" : ""
              } \${isGated ? "opacity-50 cursor-not-allowed" : ""}\`}
              disabled={isGated}
              title={isGated ? "Renew your plan to continue using this feature" : "Sync Databases"}
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={onLogOut}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-xs font-bold font-display cursor-pointer transition-all active:scale-95 shadow-xs"
            >
              <LogOut className="h-3.5 w-3.5 text-white" /> Portal Log Out
            </button>
          </div>
        </div>
      </header>`;

const newHeaderStr = `<header className="bg-white border-b border-slate-200/80 px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex flex-row items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs shrink-0">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="text-left hidden md:block">
              <h1 className="text-sm sm:text-md font-bold font-display tracking-tight text-slate-900 leading-tight whitespace-nowrap">
                Presensic
              </h1>
              <p className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider mt-0.5 whitespace-nowrap">
                QUANTUM BIOLABS · EMPLOYER PORTAL
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 sm:gap-4 flex-1 min-w-0">
            {/* Subscription / Trial Status Badge */}
            <div
              onClick={() => setIsRenewalModalOpen(true)}
              className={\`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-xs border whitespace-nowrap truncate shrink-0 max-w-[200px] sm:max-w-none \${
                billingStatus === "trial" && !isGated
                  ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                  : billingStatus === "active" && !isGated
                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200 animate-pulse font-bold"
              }\`}
              title="View plans & subscription details"
            >
              {billingStatus === "trial" && !isGated && (
                <>
                  <Clock className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">🕐 Trial: {billingDetails.daysLeft} Days</span>
                </>
              )}
              {billingStatus === "active" && !isGated && (
                <>
                  <CheckCircle className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">✅ {billingPlan} — Renews in {billingDetails.daysLeft}d</span>
                </>
              )}
              {isGated && (
                <>
                  <AlertTriangle className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-rose-600 shrink-0" />
                  <span className="truncate">⚠️ {billingStatus === "trial" ? "Trial" : "Subscription"} Expired</span>
                </>
              )}
            </div>

            <button
              onClick={handleRefreshFeed}
              className={\`p-1.5 sm:p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all cursor-pointer shrink-0 \${
                isRefreshing ? "animate-spin text-blue-600" : ""
              } \${isGated ? "opacity-50 cursor-not-allowed" : ""}\`}
              disabled={isGated}
              title={isGated ? "Renew your plan to continue using this feature" : "Sync Databases"}
            >
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            <button
              onClick={onLogOut}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold font-display cursor-pointer transition-all active:scale-95 shadow-xs shrink-0 whitespace-nowrap"
            >
              <LogOut className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-white shrink-0" /> <span className="hidden sm:inline">Portal</span> Log Out
            </button>
          </div>
        </div>
      </header>`;

const modified = content.replace(oldHeaderStr, newHeaderStr);
if (modified === content) {
    console.error("String replace did not work!");
    process.exit(1);
}

fs.writeFileSync('src/components/EmployerDashboard.tsx', modified);
console.log("Success");
