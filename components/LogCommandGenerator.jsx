// components/LogCommandGenerator.jsx
import { useState, useEffect, useMemo } from "react";

// ... (constants remain the same) ...
const OS_URLS = {
    AF: "https://elk-spr-afs1-gp-prod1.af-south-1.spribegaming.com",
    EU: "https://elk-spr-euc1-gp-prod1.eu-central-1.spribegaming.com",
    APAC: "https://elk-spr-ape1-gp-prod1.ap-east-1.spribegaming.com",
    SA: "https://elk-spr-sae1-gp-prod1.sa-east-1.spribegaming.com",
    STAGE: "https://kibana-logserver1.spribe.io"
};

const PROD_SERVICES = {
    sc: { label: "Core Service (CS)", id: "spribe-core-service-app" }, 
    et: { label: "Engagement Tools (ET)", id: "engagement-tools-app" },
    os: { label: "Operator Service (OS)", id: "spribe-operator-service-app" }
};

const STAGE_SERVICES = {
    sc: { label: "Core Service (CS)", id: "01c02cb0-0d02-11ec-aac5-c77df750f03d" },
    et: { label: "Engagement Tools (ET)", id: "6765c2f0-7e6e-11f0-a05c-594a91ca6484" },
    ca: { label: "Client Area (CA)", id: "56e07560-66e5-11f0-a05c-594a91ca6484" },
    ga: { label: "Game API (GA)", id: "b402a360-783e-11ec-aac5-c77df750f03d" },
    pga: { label: "Public Game API (Public GA)", id: "f3afa990-78a7-11ec-aac5-c77df750f03d" }
};

const STAGE_VIEW_ID = "75aeaba0-834c-11f0-a05c-594a91ca6484";

const getKyivOffset = (date) => {
    if (isNaN(date.getTime())) return 2; 
    const year = date.getUTCFullYear();
    const march31 = new Date(Date.UTC(year, 2, 31));
    const lastSunMarch = new Date(Date.UTC(year, 2, 31 - march31.getUTCDay(), 1, 0, 0)); 
    const oct31 = new Date(Date.UTC(year, 9, 31));
    const lastSunOct = new Date(Date.UTC(year, 9, 31 - oct31.getUTCDay(), 1, 0, 0));
    return (date >= lastSunMarch && date < lastSunOct) ? 3 : 2;
};

const getInitialTimeState = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const currentHour = now.getHours();
    const currentHourStr = String(currentHour).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, hour: currentHourStr };
};

const LogCommandGenerator = ({ payload, host, region }) => {
    const [copiedId, setCopiedId] = useState(null);

    const isSgDigital = payload?.nogsgameid || payload?.accountid || payload?.nogsoperatorid || payload?.sessionid || payload?.ogsgameid;

    let rawOperator = payload?.operator || payload?.nogsoperatorid || "OPERATOR_NOT_FOUND";
    if (isSgDigital && rawOperator !== "OPERATOR_NOT_FOUND" && !String(rawOperator).startsWith('sgdigital_')) {
        rawOperator = `sgdigital_${rawOperator}`;
    }
    const operator = rawOperator;

    const token = payload?.sessionid || payload?.token || payload?.player_token || payload?.session_token || "TOKEN_NOT_FOUND";

    let rawUser = payload?.accountid || payload?.user || payload?.op_player_id;
    if (!rawUser && isSgDigital && token !== "TOKEN_NOT_FOUND") {
        rawUser = token; 
    }
    const user = rawUser || "USER_NOT_FOUND";
    
    
    const [searchTerm, setSearchTerm] = useState(token);
    const [searchType, setSearchType] = useState("token"); 
    const [editedCommands, setEditedCommands] = useState({});

    const [activeTab, setActiveTab] = useState("sf"); 
    const [osService, setOsService] = useState("sc"); 
    const [timeZoneMode, setTimeZoneMode] = useState("KYIV"); 

    const initialTime = getInitialTimeState();
    const [startDate, setStartDate] = useState(initialTime.date);
    const [endDate, setEndDate] = useState(initialTime.date);
    const [fromHour, setFromHour] = useState(initialTime.hour);
    const [fromMinute, setFromMinute] = useState('00');
    const [fromSecond, setFromSecond] = useState('00');
    const [fromMs, setFromMs] = useState('000');
    const [toHour, setToHour] = useState(initialTime.hour);
    const [toMinute, setToMinute] = useState('59');
    const [toSecond, setToSecond] = useState('59');
    const [toMs, setToMs] = useState('999');

    useEffect(() => {
        if (searchType === 'token') setSearchTerm(token);
        else if (searchType === 'user') setSearchTerm(user);
        else if (searchType === 'operator') setSearchTerm(operator);
        setEditedCommands({});
    }, [payload, searchType, token, user, operator]);

    const detectedRegion = useMemo(() => {
        if (region && region !== "UNKNOWN") {
            if (region === "STAGE EU") return "STAGE";
            return region;
        }
        if (!host) return "EU";
        const h = host.toLowerCase();
        if (h.includes("staging") || h.includes("spribe.dev") || h.includes("kibana")) return "STAGE";
        if (h.includes("apac") || h.includes("ap-east-1")) return "APAC";
        if (h.includes("af-south-1")) return "AF";
        if (h.includes("sa-east-1")) return "SA";
        return "EU";
    }, [host, region]);

    const currentServicesList = detectedRegion === "STAGE" ? STAGE_SERVICES : PROD_SERVICES;

    useEffect(() => {
        if (!currentServicesList[osService]) {
            setOsService("sc");
        }
    }, [detectedRegion, currentServicesList, osService]);

    const calculateUtcTime = () => {
        if (!startDate || !endDate) return null;
        const [startYYYY, startMM, startDD] = startDate.split('-').map(Number);
        const [endYYYY, endMM, endDD] = endDate.split('-').map(Number);
        const startBase = new Date(Date.UTC(startYYYY, startMM - 1, startDD, +fromHour, +fromMinute, +fromSecond, +fromMs));
        const endBase = new Date(Date.UTC(endYYYY, endMM - 1, endDD, +toHour, +toMinute, +toSecond, +toMs));
        if (timeZoneMode === "KYIV") {
            const offsetStart = getKyivOffset(startBase);
            const offsetEnd = getKyivOffset(endBase);
            startBase.setUTCHours(startBase.getUTCHours() - offsetStart);
            endBase.setUTCHours(endBase.getUTCHours() - offsetEnd);
        }
        return { start: startBase, end: endBase };
    };

    const generateOpenSearchLink = () => {
        const isStage = detectedRegion === "STAGE";
        const baseUrl = OS_URLS[detectedRegion];
        const times = calculateUtcTime();
        if (!times) return "#";
        const { start, end } = times;
        const fromIso = start.toISOString();
        const toIso = end.toISOString();
        const globalState = `_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'${fromIso}',to:'${toIso}'))`;
        const queryTerm = `message:"${searchTerm}"`;
        const encodedQuery = encodeURIComponent(queryTerm);
        const queryState = `_q=(filters:!(),query:(language:kuery,query:'${encodedQuery}'))`;
        const indexPatternId = currentServicesList[osService]?.id || currentServicesList["sc"].id;
        const appState = `_a=(discover:(columns:!(_source),isDirty:!f,sort:!()),metadata:(indexPattern:'${indexPatternId}',view:discover))`;
        const path = isStage ? `/app/data-explorer/discover/#/view/${STAGE_VIEW_ID}?` : "/_dashboards/app/data-explorer/discover#?";
        return `${baseUrl}${path}${appState}&${globalState}&${queryState}`;
    };

    const getCommandTemplates = (filename) => {
        const times = calculateUtcTime();
        if (!times) return [];
        const { start, end } = times;
        const startTimeStr = start.toISOString().replace('T', ' ').replace('Z', '');
        const endTimeStr = end.toISOString().replace('T', ' ').replace('Z', '');
        const fileDate = start.toISOString().split('T')[0];
        const startH = String(start.getUTCHours()).padStart(2, '0');
        const endH = String(end.getUTCHours()).padStart(2, '0');
        const isSameDay = start.toISOString().split('T')[0] === end.toISOString().split('T')[0];
        let fileTarget;
        if (isSameDay) {
            let fileHourPart = "";
            if (startH === endH) fileHourPart = startH;
            else if (parseInt(endH) === parseInt(startH) + 1 && end.getUTCMinutes() === 0) fileHourPart = startH;
            else fileHourPart = `{${startH},${endH}}`;
            fileTarget = `${filename}.${fileDate}-${fileHourPart}.gz`;
        } else {
            fileTarget = `${filename}.${fileDate}-*.gz (Warning: Multi-day range)`;
        }
        return [
            { label: "Current Log (Live)", desc: `Search in active file`, cmd: `grep "${searchTerm}" ${filename}` },
            { label: "Exact Range (AWK)", desc: `UTC: from ${startTimeStr} to ${endTimeStr}`, cmd: `zcat ${fileTarget} | awk '$0 >= "${startTimeStr}" && $0 <= "${endTimeStr}"' | grep "${searchTerm}"` },
            { label: "Specific Hour (Archive)", desc: `File for ${fileDate} ${startH}:00 UTC`, cmd: `zgrep "${searchTerm}" ${filename}.${fileDate}-${startH}.gz` },
            { label: "All Daily Archives", desc: `All files for ${fileDate} (UTC)`, cmd: `zgrep "${searchTerm}" ${filename}.${fileDate}-*` }
        ];
    };

    const handleCopy = (text, uniqueId) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(uniqueId);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const handleMsChange = (setter, value) => {
        const numericValue = value.replace(/\D/g, '').slice(0, 3);
        setter(numericValue);
    };

    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
    const seconds = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    if (!payload) return null;

    return (
        <div className="mt-6 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-fade-in-up">
            <div className="bg-gray-800 px-6 py-4 flex flex-col xl:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 min-w-max">📜 Generator / Logs</h3>
                <div className="flex bg-gray-700 rounded-lg p-1 text-xs">
                    <button onClick={() => setActiveTab("sf")} className={`px-4 py-1.5 rounded-md transition-all font-medium ${activeTab === "sf" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>Game Server</button>
                    <button onClick={() => setActiveTab("app")} className={`px-4 py-1.5 rounded-md transition-all font-medium ${activeTab === "app" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>App Logs</button>
                    <button onClick={() => setActiveTab("os")} className={`flex items-center gap-1 px-4 py-1.5 rounded-md transition-all font-medium ${activeTab === "os" ? "bg-teal-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>OpenSearch
                    </button>
                </div>
                <div className="flex bg-gray-700 rounded-lg p-1 text-xs">
                    {["token", "user", "operator"].map(type => (
                        <button key={type} onClick={() => setSearchType(type)} className={`px-3 py-1.5 rounded-md transition-all ${searchType === type ? "bg-gray-500 text-white shadow" : "text-gray-400 hover:text-white"}`}>{type}</button>
                    ))}
                </div>
            </div>

            {activeTab === "os" && (
                <div className="bg-teal-50 px-4 py-3 border-b border-teal-100 flex flex-col sm:flex-row justify-between items-center gap-4 animate-fade-in">
                    <div className="flex items-center gap-2 text-sm text-teal-800">
                        <span className="font-bold">Service ({detectedRegion}):</span>
                        <select value={osService} onChange={(e) => setOsService(e.target.value)} className="px-2 py-1 border border-teal-200 rounded text-teal-900 focus:ring-2 focus:ring-teal-500 text-xs font-semibold">
                            {Object.entries(currentServicesList).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-teal-800">
                        <span className="font-bold">Time Mode:</span>
                        <div className="flex bg-teal-200 rounded p-0.5">
                            <button onClick={() => setTimeZoneMode("KYIV")} className={`px-3 py-0.5 rounded text-xs font-bold transition-all ${timeZoneMode === "KYIV" ? "bg-white text-teal-800 shadow" : "text-teal-600 hover:text-teal-800"}`}>Kyiv</button>
                            <button onClick={() => setTimeZoneMode("UTC")} className={`px-3 py-0.5 rounded text-xs font-bold transition-all ${timeZoneMode === "UTC" ? "bg-white text-teal-800 shadow" : "text-teal-600 hover:text-teal-800"}`}>UTC</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex flex-col xl:flex-row flex-wrap items-center gap-4 text-sm justify-center xl:justify-start">
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                    <span className="font-bold text-gray-500 text-xs">From:</span>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-1 py-1 border border-gray-300 rounded text-gray-700 h-7 text-xs focus:ring-1 focus:ring-[#2e2691] focus:outline-none"/>
                    <div className="flex gap-0.5 items-center">
                        <select value={fromHour} onChange={(e) => setFromHour(e.target.value)} className="time-select rounded-l-md">{hours.map(h => <option key={h} value={h}>{h}</option>)}</select>
                        <span className="text-gray-400">:</span>
                        <select value={fromMinute} onChange={(e) => setFromMinute(e.target.value)} className="time-select">{minutes.map(m => <option key={m} value={m}>{m}</option>)}</select>
                        <span className="text-gray-400">:</span>
                        <select value={fromSecond} onChange={(e) => setFromSecond(e.target.value)} className="time-select">{seconds.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        <input type="text" value={fromMs} onChange={(e) => handleMsChange(setFromMs, e.target.value)} placeholder="000" className="w-8 px-1 border border-gray-300 rounded-r-md text-center text-xs h-7 focus:ring-1 focus:ring-[#2e2691] focus:outline-none"/>
                    </div>
                </div>
                <span className="text-gray-400 hidden xl:block">→</span>
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                    <span className="font-bold text-gray-500 text-xs">To:</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-1 py-1 border border-gray-300 rounded text-gray-700 h-7 text-xs focus:ring-1 focus:ring-[#2e2691] focus:outline-none"/>
                    <div className="flex gap-0.5 items-center">
                        <select value={toHour} onChange={(e) => setToHour(e.target.value)} className="time-select rounded-l-md">{hours.map(h => <option key={h} value={h}>{h}</option>)}</select>
                        <span className="text-gray-400">:</span>
                        <select value={toMinute} onChange={(e) => setToMinute(e.target.value)} className="time-select">{minutes.map(m => <option key={m} value={m}>{m}</option>)}</select>
                        <span className="text-gray-400">:</span>
                        <select value={toSecond} onChange={(e) => setToSecond(e.target.value)} className="time-select">{seconds.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        <input type="text" value={toMs} onChange={(e) => handleMsChange(setToMs, e.target.value)} placeholder="999" className="w-8 px-1 border border-gray-300 rounded-r-md text-center text-xs h-7 focus:ring-1 focus:ring-[#2e2691] focus:outline-none"/>
                    </div>
                </div>
                {activeTab !== "os" && (
                    <div className="flex bg-gray-300 rounded p-0.5 ml-auto">
                        <button onClick={() => setTimeZoneMode("KYIV")} className={`px-2 py-0.5 rounded text-[10px] font-bold ${timeZoneMode === "KYIV" ? "bg-white text-blue-900" : "text-gray-600"}`}>KYIV</button>
                        <button onClick={() => setTimeZoneMode("UTC")} className={`px-2 py-0.5 rounded text-[10px] font-bold ${timeZoneMode === "UTC" ? "bg-white text-blue-900" : "text-gray-600"}`}>UTC</button>
                    </div>
                )}
                <style jsx>{`.time-select {@apply px-0.5 py-1 border border-gray-300 text-gray-700 h-7 text-xs appearance-none text-center min-w-[2.2rem] focus:ring-1 focus:ring-[#2e2691] focus:outline-none bg-white;}`}</style>
            </div>

            <div className="p-6 space-y-6">
                {activeTab === "os" && (
                    <div className="animate-fade-in space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3 shadow-sm">
                            <span className="text-xl">🔒</span>
                            <div className="text-xs text-yellow-800 leading-snug"><strong className="font-bold">Attention:</strong> You must log in to OpenSearch before searching. <br/> The login link can be found above in the <strong>&quot;Operator Configuration&quot;</strong> block.</div>
                        </div>
                        <div className="bg-teal-50 border border-teal-200 rounded-xl p-8 text-center shadow-sm flex flex-col items-center">
                            <div className="text-sm text-teal-700 mb-6">
                                <div className="mb-2">Search query for <strong className="text-teal-900">{currentServicesList[osService]?.label}</strong>:</div>
                                <code className="bg-white border border-teal-200 px-3 py-1.5 rounded text-teal-800 font-mono text-xs shadow-sm">message:&quot;{searchTerm}&quot;</code>
                            </div>
                            <a href={generateOpenSearchLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-teal-600 text-white font-bold rounded-lg shadow-lg hover:bg-teal-700 hover:shadow-xl transition-all transform hover:-translate-y-0.5 no-underline w-full sm:w-auto">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg><span>Open in Discover</span>
                            </a>
                            <div className="mt-4 text-xs text-gray-400 max-w-lg">Mode: <strong>{timeZoneMode}</strong>.<br/>{timeZoneMode === "KYIV" ? "Time passed as is (OpenSearch will display it correctly)." : "Time passed as UTC (OpenSearch will display it in your local time)."}</div>
                        </div>
                    </div>
                )}
                {activeTab !== "os" && (
                    <div className="space-y-4 animate-fade-in">
                        {getCommandTemplates(activeTab === 'sf' ? 'smartfox.log' : 'app.log').map((tpl, idx) => {
                            const uniqueId = `${activeTab}-${idx}`;
                            const currentValue = editedCommands[uniqueId] !== undefined ? editedCommands[uniqueId] : tpl.cmd;
                            return (
                                <div key={uniqueId} className="flex flex-col space-y-1">
                                    <div className="flex justify-between items-end px-1"><span className="text-xs font-bold text-gray-600">{tpl.label}</span><span className="text-[10px] text-gray-400 italic">{tpl.desc}</span></div>
                                    <div className="relative group">
                                        <input type="text" value={currentValue} onChange={(e) => setEditedCommands({...editedCommands, [uniqueId]: e.target.value})} className="w-full bg-gray-900 text-green-400 font-mono text-xs p-3 rounded-lg border border-gray-700 focus:outline-none focus:border-green-500 pr-10" spellCheck="false"/>
                                        <button onClick={() => handleCopy(currentValue, uniqueId)} className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded shadow-sm">{copiedId === uniqueId ? <span className="text-green-400">✔</span> : <span>📋</span>}</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogCommandGenerator;