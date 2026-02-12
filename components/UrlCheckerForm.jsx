// components/UrlCheckerForm.jsx

import { useState } from "react";
import { validateLaunchURLProd } from "../utils/validators/validateLaunchURLProd.js";
import { validateLaunchURLStage } from "../utils/validators/validateLaunchURLStage.js";
import { validateRoundDetailsUrl } from "../utils/validators/validateRoundDetailsUrl.js";
import { validateLaunchURL_SG_Digital_LNW } from "../utils/validators/validateLaunchURL_SG_Digital_LNW.js";
import { detectUrlType } from "../utils/helpers/urlTypeDetector.js";

import ValidationResult from "./ValidationResult.jsx";
import OperatorConfigViewer from "./OperatorConfigViewer.jsx";
import LogCommandGenerator from "./LogCommandGenerator.jsx";

const UrlCheckerForm = () => {
    const [urlInput, setUrlInput] = useState('');
    const [validationType, setValidationType] = useState(''); 
    const [parsedParams, setParsedParams] = useState(null);
    const [error, setError] = useState(null);
    const [warnings, setWarnings] = useState([]);
    const [detectedRegion, setDetectedRegion] = useState(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isMirror, setIsMirror] = useState(false);

    const checkIfMirror = (url) => {
        if (!url) return false;
        try {
            const host = new URL(url).host.toLowerCase();
            return (
                host.includes('spribelaunch.com') || 
                /spribegaming\d+\.click/.test(host)
            );
        } catch (e) {
            return false;
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setUrlInput(value);

        if (parsedParams || error) {
            setParsedParams(null);
            setError(null);
            setWarnings([]);
            setDetectedRegion(null);
        }

        try {
            const detected = detectUrlType(value);
            setValidationType(detected || '');
            setIsMirror(checkIfMirror(value));
        } catch (err) {
            console.warn("Auto-detection error:", err);
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                handleInputChange({ target: { value: text } });
            }
        } catch (err) {
            console.error('Failed to read clipboard:', err);
        }
    };

    const handleCheckUrl = () => {
        setError(null);
        setWarnings([]);
        setParsedParams(null);
        setDetectedRegion(null);

        if (!urlInput.trim()) {
            setError('URL field cannot be empty.');
            return;
        }

        let currentType = validationType;
        if (!currentType) {
            currentType = detectUrlType(urlInput);
            if (!currentType) {
                let baseUrlPart = urlInput;
                try {
                    const u = new URL(urlInput);
                    baseUrlPart = u.origin + u.pathname;
                } catch (e) {
                    baseUrlPart = urlInput.split('?')[0];
                }
                setError(`Could not detect URL type.\nPlease ensure the URL is correct: ${baseUrlPart}`);
                return;
            }
            setValidationType(currentType);
            setIsMirror(checkIfMirror(urlInput));
        }
        
        let result;
        if (currentType === 'prodLaunchURLValidation') {
            result = validateLaunchURLProd(urlInput);
        } else if (currentType === 'stageLaunchURLValidation') {
            result = validateLaunchURLStage(urlInput);
        } else if (currentType === 'roundDetailsValidation') {
            result = validateRoundDetailsUrl(urlInput);
        } else if (currentType === 'sgLaunchURLValidation') {
            result = validateLaunchURL_SG_Digital_LNW(urlInput);
        }

        if (result.components) {
            setParsedParams(result.components);
        }

        if (result.errors && result.errors.length > 0) {
            setError(result.errors.join(' | '));
        }

        if (result.warnings && result.warnings.length > 0) {
            setWarnings(result.warnings);
        }
    };

    const handleClear = () => {
        setUrlInput('');
        setError(null);
        setWarnings([]);
        setParsedParams(null);
        setValidationType('');
        setIsMirror(false);
        setIsCopied(false);
        setDetectedRegion(null);
    };

    const handleCopy = () => {
        if (!urlInput) return;
        navigator.clipboard.writeText(urlInput).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCheckUrl();
        }
    };

    const getTypeLabel = () => {
        switch (validationType) {
            case 'prodLaunchURLValidation':
                // === ОБНОВЛЕННАЯ ЛОГИКА ДЛЯ DEMO ===
                let isDemo = false;

                // 1. Если уже нажали Check и есть распарсенные данные
                if (parsedParams) {
                    const isDemoHost = parsedParams.host?.includes('demo');
                    const isDemoOp = parsedParams.payload?.operator === 'demo';
                    isDemo = isDemoHost || isDemoOp;
                } 
                // 2. Если просто вставили ссылку (еще не парсили), проверяем сырую строку
                else if (urlInput) {
                    const lowerInput = urlInput.toLowerCase();
                    // Ищем ключевые слова в URL
                    const hasDemoHost = lowerInput.includes('demo.spribegaming.com') || lowerInput.includes('aviator-demo');
                    const hasDemoOp = lowerInput.includes('operator=demo');
                    isDemo = hasDemoHost || hasDemoOp;
                }
                
                if (isDemo) {
                    return { text: 'Demo Launch', color: 'bg-orange-100 text-orange-800 border-orange-200' };
                }
                return { text: 'Prod Launch', color: 'bg-green-100 text-green-800 border-green-200' };
                
            case 'stageLaunchURLValidation':
                return { text: 'Stage Launch', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
            case 'roundDetailsValidation':
                return { text: 'Round History', color: 'bg-blue-100 text-blue-800 border-blue-200' };
            case 'sgLaunchURLValidation':
                // Для SG Digital тоже лучше проверять сырую строку, если parsedParams нет
                let isSgStage = false;
                let isSgDemo = false;

                if (parsedParams) {
                    isSgStage = parsedParams.payload?._environment === 'STAGE';
                    isSgDemo = parsedParams.payload?._mode?.toLowerCase() === 'demo';
                } else if (urlInput) {
                    const lowerInput = urlInput.toLowerCase();
                    isSgStage = lowerInput.includes('stage') || lowerInput.includes('dev') || lowerInput.includes('test');
                    isSgDemo = lowerInput.includes('mode=demo') || lowerInput.includes('nogsmode=demo');
                }
                
                const envBadge = isSgStage ? 'STAGE' : 'PROD';
                const modeBadge = isSgDemo ? ' | DEMO' : '';

                return { 
                    text: `Reverse: SG Digital (${envBadge}${modeBadge})`, 
                    color: isSgStage ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-indigo-100 text-indigo-800 border-indigo-200' 
                };
            default:
                return null;
        }
    };

    const typeLabel = getTypeLabel();

    return (
        <div className="font-sans w-full max-w-7xl mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
                Universal URL Validator
            </h1>
            
            <div className="flex flex-col space-y-4 p-6 bg-white rounded-xl shadow-2xl border border-gray-200">
                <div className="flex flex-col space-y-4">
                    <textarea
                        rows="4"
                        placeholder="Paste URL here (Launch URL or Round Details)..."
                        value={urlInput}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        className={`w-full px-4 py-3 text-gray-900 bg-gray-50 border ${error ? 'border-red-500' : (warnings.length > 0 ? 'border-yellow-500' : 'border-gray-300')} rounded-lg focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500' : (warnings.length > 0 ? 'focus:ring-yellow-500' : 'focus:ring-[#2e2691]')} focus:border-transparent transition duration-150 ease-in-out text-sm md:text-base resize-none min-h-[6rem] shadow-inner`} 
                    />
                    
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                        <div className="w-full sm:w-auto h-10 flex items-center gap-2">
                            {urlInput.trim() ? (
                                typeLabel ? (
                                    <>
                                        <span className={`px-4 py-2 rounded-lg text-sm font-bold border ${typeLabel.color} animate-fade-in shadow-sm whitespace-nowrap`}>
                                            {typeLabel.text}
                                        </span>
                                        {isMirror && (
                                            <span className="px-3 py-2 rounded-lg text-sm font-bold border bg-orange-100 text-orange-800 border-orange-200 animate-fade-in shadow-sm whitespace-nowrap flex items-center gap-1">
                                                Mirror Domain
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="px-4 py-2 rounded-lg text-sm font-bold border bg-gray-100 text-gray-500 border-gray-300 shadow-sm whitespace-nowrap flex items-center gap-2">
                                        Unknown Link Type
                                    </span>
                                )
                            ) : null}
                        </div>

                        <div className="flex w-full sm:w-auto gap-2 justify-end">
                            <button type="button" onClick={handleClear} className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-600 border border-gray-300 font-medium rounded-lg shadow-sm hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-all focus:outline-none" title="Clear">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                            <button type="button" onClick={handlePaste} className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-600 border border-gray-300 font-medium rounded-lg shadow-sm hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition-all focus:outline-none" title="Paste">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            </button>
                            <button type="button" onClick={handleCopy} className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-600 border border-gray-300 font-medium rounded-lg shadow-sm hover:bg-gray-50 hover:text-[#2e2691] hover:border-[#2e2691] transition-all focus:outline-none" title="Copy">
                                {isCopied ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                            </button>
                            <button type="button" onClick={handleCheckUrl} className="flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold bg-[#2e2691] rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none transition duration-150 transform hover:scale-[1.01] active:scale-95">
                                <span className="hidden sm:inline">Check URL</span><span className="sm:hidden">Check</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-6 p-4 bg-red-100 text-red-800 border border-red-500 rounded-xl shadow-md animate-fade-in-up">
                    <div className="flex items-start">
                        <span className="text-2xl mr-3">❌</span>
                        <div><h4 className="font-bold text-lg mb-1">Validation Error:</h4><p className="whitespace-pre-wrap text-sm">{error}</p></div>
                    </div>
                </div>
            )}

            {warnings.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 border border-yellow-400 rounded-xl shadow-md animate-fade-in-up">
                    <div className="flex items-start">
                        <span className="text-2xl mr-3">⚠️</span>
                        <div>
                            <h4 className="font-bold text-lg mb-1">Warning:</h4>
                            {warnings.map((warn, index) => (<p key={index} className="whitespace-pre-wrap text-sm mb-1">{warn}</p>))}
                        </div>
                    </div>
                </div>
            )}

            {parsedParams && (
                <>
                    <ValidationResult data={parsedParams} validationType={validationType} />
                    
                    <OperatorConfigViewer 
                        gameId={parsedParams.gameId} 
                        operator={parsedParams.payload?._operator || parsedParams.payload?.operator} 
                        validationType={validationType}
                        analyzedHost={parsedParams.host} 
                        onRegionDetected={setDetectedRegion}
                    />

                    <LogCommandGenerator 
                        payload={parsedParams.payload} 
                        host={parsedParams.host}
                        region={detectedRegion}
                    />
                </>
            )}

            <div className="mt-6 p-4 text-center text-gray-500 text-sm">
                <p>This validator automatically detects the URL type and performs the corresponding checks.</p>
            </div>
        </div>
    );
};

export default UrlCheckerForm;