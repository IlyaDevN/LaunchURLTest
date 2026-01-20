// components/SignatureGenerator.jsx
import { useState, useEffect } from "react";

// === КОНСТАНТЫ ДЛЯ РЕЖИМА CALLBACK (Game Provider) ===
const PROVIDER_ENDPOINTS = [
    { value: "/auth", label: "/auth" },
    { value: "/info", label: "/info" },
    { value: "/withdraw", label: "/withdraw" },
    { value: "/deposit", label: "/deposit" },
    { value: "/rollback", label: "/rollback" },
    { value: "", label: "Base URL only" }
];

// === КОНСТАНТЫ ДЛЯ РЕЖИМА FREEBET API ===
const FREEBET_ENDPOINTS = [
    { value: "/freebets", label: "/freebets" },
    { value: "/freebets/list", label: "/freebets/list" },
    { value: "/freebets/create", label: "/freebets/create" },
    { value: "/freebets/cancel", label: "/freebets/cancel" }
];

// === ПОРЯДОК РЕГИОНОВ ===
const FREEBET_REGIONS = [
    { name: "EU", url: "https://secure-ga.spribegaming.com/api/v4/" },
    { name: "AF", url: "https://af-south-1-secure-ga.spribegaming.com/api/v4/" },
    { name: "APAC", url: "https://secure-ga.apac.spribegaming.com/api/v4/" },
    { name: "SA", url: "https://sa-east-1-secure-ga.spribegaming.com/api/v4/" },
    { name: "HR", url: "https://secure-ga-hr1.spribegaming.com/api/v4/" },
    { name: "Stage", url: "https://secure-ga.staging.spribe.io/v4/" }
];

// --- ВСПОМОГАТЕЛЬНАЯ КНОПКА КОПИРОВАНИЯ ---
const CopyButton = ({ text, label = "" }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button 
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm text-xs font-bold uppercase tracking-wide text-gray-500 min-w-[80px] justify-center"
            title="Copy to clipboard"
        >
            {copied ? (
                <>
                    <span className="text-green-600">✓ Copied</span>
                </>
            ) : (
                <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    {label && <span>{label}</span>}
                </>
            )}
        </button>
    );
};

const SignatureGenerator = () => {
    // UI State
    const [mode, setMode] = useState("provider"); // 'provider' | 'freebet'

    // Inputs
    const [baseUrl, setBaseUrl] = useState(""); 
    const [selectedEndpoint, setSelectedEndpoint] = useState(PROVIDER_ENDPOINTS[0].value);
    
    // Для режима Freebet храним выбранный регион отдельно
    const [freebetRegion, setFreebetRegion] = useState(FREEBET_REGIONS[0].url);

    const [body, setBody] = useState("");
    const [clientSecret, setClientSecret] = useState("");
    const [timestamp, setTimestamp] = useState(""); 
    const [operatorSignature, setOperatorSignature] = useState("");

    // Outputs
    const [calculatedSignatures, setCalculatedSignatures] = useState([]);
    const [matchFound, setMatchFound] = useState(null);

    // Сброс и настройка при переключении режима
    useEffect(() => {
        setCalculatedSignatures([]);
        setMatchFound(null);
        
        if (mode === "provider") {
            setBaseUrl(""); 
            setSelectedEndpoint(PROVIDER_ENDPOINTS[0].value);
        } else {
            setBaseUrl(FREEBET_REGIONS[0].url);
            setFreebetRegion(FREEBET_REGIONS[0].url);
            setSelectedEndpoint(FREEBET_ENDPOINTS[0].value);
        }
    }, [mode]);

    const handleRegionChange = (e) => {
        const newUrl = e.target.value;
        setFreebetRegion(newUrl);
        setBaseUrl(newUrl);
    };

    // === ФУНКЦИЯ ДЛЯ МИНИФИКАЦИИ JSON ===
    const handleMinifyJson = () => {
        if (!body.trim()) return;

        try {
            // 1. Пробуем распарсить стандартный JSON
            const obj = JSON.parse(body);
            setBody(JSON.stringify(obj));
        } catch (e) {
            // 2. Если ошибка, возможно это "висячая запятая" (trailing comma)
            try {
                const fixedBody = body.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
                const obj = JSON.parse(fixedBody);
                setBody(JSON.stringify(obj));
            } catch (e2) {
                alert("Invalid JSON format. Please check syntax.");
            }
        }
    };

    // Helpers
    const hmacSha256 = async (key, message) => {
        const enc = new TextEncoder();
        const algorithm = { name: "HMAC", hash: "SHA-256" };
        
        try {
            const keyBuf = enc.encode(key);
            const messageBuf = enc.encode(message);
            
            const cryptoKey = await window.crypto.subtle.importKey("raw", keyBuf, algorithm, false, ["sign"]);
            const signature = await window.crypto.subtle.sign(algorithm.name, cryptoKey, messageBuf);
            
            return Array.from(new Uint8Array(signature))
                .map(b => b.toString(16).padStart(2, "0"))
                .join("");
        } catch (e) {
            return "Error calculating hash";
        }
    };

    // Main calculation logic
    useEffect(() => {
        const calculateAll = async () => {
            // === 1. ОЧИСТКА ВХОДНЫХ ДАННЫХ (TRIM) ===
            const cleanBaseUrl = baseUrl.trim();
            const cleanClientSecret = clientSecret.trim();
            const cleanTimestamp = timestamp.trim();
            const cleanBody = body.trim(); // Может быть пустой строкой

            // Strict check: Body теперь опционален
            if (!cleanBaseUrl || !cleanClientSecret || !cleanTimestamp) {
                setCalculatedSignatures([]);
                return;
            }

            let urlObj;
            let fullUrlString;
            try {
                const baseNoSlash = cleanBaseUrl.replace(/\/$/, "");
                fullUrlString = baseNoSlash + selectedEndpoint;
                urlObj = new URL(fullUrlString);
            } catch (e) {
                return;
            }

            const scenarios = [];
            const queryPart = urlObj.search; 
            
            // 1. Полный URL
            scenarios.push({
                id: "full_url",
                label: "⚠️ Full URL (Incorrect)",
                desc: "Mistake: Using the entire URL including https://",
                pathUsed: fullUrlString, 
                isCorrect: false
            });

            // 2. Генерация вариантов путей
            const pathSegments = urlObj.pathname.split('/').filter(s => s); 

            for (let i = 0; i < pathSegments.length; i++) {
                const currentSegments = pathSegments.slice(i);
                const partialPath = currentSegments.join('/'); 
                
                const isOriginalPath = i === 0;

                // Вариант А: С ведущим слэшем (/)
                const pathWithSlash = '/' + partialPath + queryPart;
                scenarios.push({
                    id: `slash_${i}`,
                    label: isOriginalPath ? "✅ Correct Path" : `⚠️ Partial Path (/${partialPath})`,
                    desc: isOriginalPath ? "Standard URI format" : "Mistake: Path is incomplete",
                    pathUsed: pathWithSlash,
                    isCorrect: isOriginalPath
                });

                // Вариант Б: Без ведущего слэша
                const pathNoSlash = partialPath + queryPart;
                scenarios.push({
                    id: `no_slash_${i}`,
                    label: `⚠️ No Slash (${partialPath})`,
                    desc: isOriginalPath ? "Mistake: Missing leading slash" : "Mistake: Partial path & missing slash",
                    pathUsed: pathNoSlash,
                    isCorrect: false
                });
            }

            const results = await Promise.all(scenarios.map(async (scenario) => {
                // ИСПОЛЬЗУЕМ ОЧИЩЕННЫЕ ЗНАЧЕНИЯ ПРИ РАСЧЕТЕ ПОДПИСИ
                // Если cleanBody пустой, он просто не добавит символов в конец
                const stringToSign = `${cleanTimestamp}${scenario.pathUsed}${cleanBody}`;
                const sig = await hmacSha256(cleanClientSecret, stringToSign);
                return {
                    ...scenario,
                    stringToSign,
                    signature: sig
                };
            }));

            const uniqueResults = results.filter((v, i, a) => 
                v.pathUsed && 
                a.findIndex(t => t.signature === v.signature) === i
            );
            setCalculatedSignatures(uniqueResults);
        };

        calculateAll();
    }, [baseUrl, selectedEndpoint, body, clientSecret, timestamp]);

    // Comparison logic
    useEffect(() => {
        if (!operatorSignature || calculatedSignatures.length === 0) {
            setMatchFound(null);
            return;
        }

        // TRIM для подписи оператора при сравнении
        const cleanOpSig = operatorSignature.trim().toLowerCase();
        const match = calculatedSignatures.find(s => s.signature.toLowerCase() === cleanOpSig);
        
        setMatchFound(match || { id: "unknown", label: "❌ No Match", desc: "Signature doesn't match any known pattern." });
    }, [operatorSignature, calculatedSignatures]);

    const handleTimestampNow = () => {
        setTimestamp(Math.floor(Date.now() / 1000).toString());
    };

    const correctResult = calculatedSignatures.find(s => s.isCorrect);
    const incorrectResults = calculatedSignatures.filter(s => !s.isCorrect);

    return (
        <div className="max-w-7xl mx-auto pb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
                API Signature Calculator
            </h1>

            {/* MODE SWITCHER */}
            <div className="flex justify-center mb-8">
                <div className="bg-white p-1 rounded-lg border border-gray-300 shadow-sm flex">
                    <button
                        onClick={() => setMode("provider")}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
                            mode === "provider" 
                                ? "bg-[#2e2691] text-white shadow" 
                                : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        Callback (Game Provider)
                    </button>
                    <button
                        onClick={() => setMode("freebet")}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
                            mode === "freebet" 
                                ? "bg-[#2e2691] text-white shadow" 
                                : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        Freebet API
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* LEFT COLUMN: INPUTS */}
                <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200 space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h2 className="text-xl font-bold text-gray-800">Input Parameters</h2>
                        <span className="text-xs font-bold uppercase text-[#2e2691] bg-indigo-50 px-2 py-1 rounded">
                            {mode === "provider" ? "Callback Mode" : "Freebet Mode"}
                        </span>
                    </div>
                    
                    {/* URL SECTION */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            {mode === "provider" ? "Callback URL" : "Freebet API Region"} <span className="text-red-500">*</span>
                        </label>
                        
                        <div className="flex gap-2">
                            {mode === "provider" ? (
                                <div className="w-2/3">
                                    <input 
                                        type="text" 
                                        value={baseUrl} 
                                        onChange={(e) => setBaseUrl(e.target.value)} 
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#2e2691] focus:outline-none font-mono text-sm"
                                        placeholder="https://site.com/api/callback"
                                    />
                                </div>
                            ) : (
                                <div className="w-2/3">
                                    <select 
                                        value={freebetRegion}
                                        onChange={handleRegionChange}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#2e2691] focus:outline-none text-sm bg-white"
                                    >
                                        {FREEBET_REGIONS.map(r => (
                                            <option key={r.name} value={r.url}>{r.name} ({r.url})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="w-1/3">
                                <select 
                                    value={selectedEndpoint}
                                    onChange={(e) => setSelectedEndpoint(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#2e2691] focus:outline-none text-sm bg-gray-50 font-medium"
                                >
                                    {(mode === "provider" ? PROVIDER_ENDPOINTS : FREEBET_ENDPOINTS).map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {baseUrl && (
                            <p className="text-[10px] text-gray-400 mt-1 break-all">
                                Full URL: <span className="font-mono text-gray-600">{baseUrl.trim().replace(/\/$/, "")}{selectedEndpoint}</span>
                            </p>
                        )}
                    </div>

                    {/* CLIENT SECRET */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client Secret <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            value={clientSecret} 
                            onChange={(e) => setClientSecret(e.target.value)} 
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#2e2691] focus:outline-none font-mono text-sm"
                            placeholder="Secret Key"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">X-Spribe-Client-TS <span className="text-red-500">*</span></label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={timestamp} 
                                onChange={(e) => setTimestamp(e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#2e2691] focus:outline-none font-mono text-sm"
                                placeholder="Timestamp"
                            />
                            <button onClick={handleTimestampNow} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold text-gray-600 transition">
                                Now
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase">
                                Request Body (Raw JSON) <span className="text-gray-400 font-normal normal-case text-[10px]">(optional)</span>
                            </label>
                            {/* КНОПКА MINIFY JSON */}
                            <button 
                                onClick={handleMinifyJson}
                                className="text-[10px] bg-indigo-50 text-[#2e2691] px-2 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors font-bold uppercase"
                                title="Remove spaces and newlines"
                            >
                                Minify JSON
                            </button>
                        </div>
                        <textarea 
                            value={body} 
                            onChange={(e) => setBody(e.target.value)} 
                            rows="4"
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#2e2691] focus:outline-none font-mono text-xs"
                            placeholder='{"key": "value"} or leave empty'
                        />
                    </div>
                </div>

                {/* RIGHT COLUMN: ANALYSIS & RESULTS */}
                <div className="space-y-6">
                    
                    {/* VALIDATION BOX */}
                    <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Validate Operator Signature</h2>
                        
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Received X-Spribe-Client-Signature</label>
                            <input 
                                type="text" 
                                value={operatorSignature} 
                                onChange={(e) => setOperatorSignature(e.target.value)} 
                                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#2e2691] focus:outline-none font-mono text-xs bg-gray-50"
                                placeholder="Paste the signature from the operator's log here..."
                            />
                        </div>

                        {operatorSignature && matchFound && (
                            <div className={`p-4 rounded-lg border flex items-start gap-3 ${matchFound.id === 'correct' ? 'bg-green-50 border-green-200 text-green-900' : (matchFound.id === 'unknown' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-yellow-50 border-yellow-200 text-yellow-900')}`}>
                                <div className="text-2xl">{matchFound.id === 'correct' ? '✅' : (matchFound.id === 'unknown' ? '❌' : '⚠️')}</div>
                                <div>
                                    <h4 className="font-bold text-sm">{matchFound.label}</h4>
                                    <p className="text-xs mt-1">{matchFound.desc}</p>
                                    {matchFound.pathUsed && (
                                        <div className="mt-2 text-xs">
                                            <span className="font-semibold">Path used: </span>
                                            <code className="bg-black/10 px-1 rounded">{matchFound.pathUsed}</code>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* GENERATED VARIANTS */}
                    <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Generated Variants</h2>
                        
                        <div className="space-y-4">
                            {calculatedSignatures.length > 0 ? (
                                <>
                                    {correctResult && (
                                        // === ОБНОВЛЕННЫЙ БЛОК ПРАВИЛЬНОЙ ПОДПИСИ ===
                                        <div className="bg-green-50 border-2 border-green-400 p-5 rounded-xl shadow-md">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-sm font-bold uppercase text-green-800 flex items-center gap-2">
                                                    ✅ Correct Signature
                                                </span>
                                            </div>
                                            
                                            {/* Signature Block */}
                                            <div className="bg-white/80 p-3 rounded-lg border border-green-200 mb-4 flex justify-between items-center gap-4">
                                                {/* ИЗМЕНЕНИЕ: Уменьшен шрифт до text-xs sm:text-sm */}
                                                <div className="font-mono text-xs sm:text-sm break-all text-green-900 font-bold leading-tight">
                                                    {correctResult.signature}
                                                </div>
                                                <CopyButton text={correctResult.signature} label="Copy" />
                                            </div>

                                            <div className="space-y-3">
                                                {/* Path Row */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-green-100/50 rounded-lg">
                                                    <div className="text-xs text-green-800">
                                                        <span className="font-bold block sm:inline mr-2">Path:</span> 
                                                        <span className="font-mono break-all">{correctResult.pathUsed}</span>
                                                    </div>
                                                    <div className="shrink-0">
                                                        <CopyButton text={correctResult.pathUsed} />
                                                    </div>
                                                </div>

                                                {/* String to Sign Row */}
                                                <div className="flex flex-col gap-2 p-2 bg-green-100/50 rounded-lg">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-green-800">String to sign:</span>
                                                        <CopyButton text={correctResult.stringToSign} />
                                                    </div>
                                                    <div className="font-mono text-[10px] sm:text-xs break-all text-gray-700 bg-white p-2 rounded border border-green-200">
                                                        {correctResult.stringToSign}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {incorrectResults.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 mt-4 border-t pt-2">Common Mistakes</h4>
                                            <div className="space-y-2">
                                                {incorrectResults.map((item) => (
                                                    <div key={item.id} className="p-3 rounded-lg border bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[10px] font-bold uppercase text-gray-600">{item.label}</span>
                                                        </div>
                                                        <div className="font-mono text-xs break-all text-gray-800 font-medium mb-1">
                                                            {item.signature}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500">
                                                            <p><span className="font-semibold">Path:</span> <span className="font-mono break-all">{item.pathUsed}</span></p>
                                                            <p className="mt-1"><span className="font-semibold">String to sign:</span> <span className="font-mono break-all opacity-80">{item.stringToSign}</span></p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-center text-gray-400 text-sm py-4">
                                    Fill in all required fields (<span className="text-red-400">*</span>) to generate signatures.
                                </p>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SignatureGenerator;