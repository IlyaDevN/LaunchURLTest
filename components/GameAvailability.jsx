// components/GameAvailability.jsx
import { useState, useEffect, useMemo, useCallback } from "react";

// ID таблицы
const SHEET_ID = "115rXeWjNXwrG499h7kSZtGimuAe6kPRxDp0afAnckYo";
const SHEET_GID = "0";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const GameAvailability = () => {
    const [data, setData] = useState([]);
    const [availableCertificates, setAvailableCertificates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Режим поиска: 'certificate' или 'game'
    const [searchMode, setSearchMode] = useState("certificate");
    const [selectedItem, setSelectedItem] = useState("");
    
    // Выбранная игра для отображения деталей
    const selectedGameData = useMemo(() => {
        if (searchMode === "game" && selectedItem) {
            return data.find(d => d.game === selectedItem);
        }
        return null;
    }, [searchMode, selectedItem, data]);

    // --- ПАРСЕР CSV ---
    const parseCSV = (text) => {
        const rows = [];
        let row = [];
        let cell = "";
        let insideQuote = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"') {
                if (insideQuote && nextChar === '"') {
                    cell += '"';
                    i++;
                } else {
                    insideQuote = !insideQuote;
                }
            } else if (char === "," && !insideQuote) {
                row.push(cell.trim());
                cell = "";
            } else if ((char === "\r" || char === "\n") && !insideQuote) {
                if (cell || row.length > 0) row.push(cell.trim());
                if (row.length > 0) rows.push(row);
                row = [];
                cell = "";
                if (char === "\r" && nextChar === "\n") i++;
            } else {
                cell += char;
            }
        }
        if (cell || row.length > 0) {
            row.push(cell.trim());
            rows.push(row);
        }
        return rows;
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(CSV_URL);
            if (!response.ok) throw new Error("Ошибка загрузки таблицы. Проверьте права доступа.");
            const text = await response.text();
            
            const rows = parseCSV(text);
            if (rows.length < 2) throw new Error("Таблица пуста или имеет неверный формат.");

            const originalHeaders = rows[0]; 
            const headerRowLower = originalHeaders.map(h => h.toLowerCase().trim());
            
            let certIndex = headerRowLower.findIndex(h => h.includes("certificates") || h.includes("certificate") || h.includes("cert"));
            let gameIndex = headerRowLower.findIndex(h => h.includes("game"));
            if (gameIndex === -1) gameIndex = 0; 

            if (certIndex === -1) {
                throw new Error("Не найдена колонка 'Certificates'. Проверьте заголовки в таблице.");
            }

            const parsedData = [];
            const allCertsSet = new Set();
            allCertsSet.add("Curacao");

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row[gameIndex]) continue;

                const gameName = row[gameIndex];
                const certRaw = row[certIndex] || "";

                const certs = certRaw
                    .split(/[\n,;]+/) 
                    .map(c => c.trim())
                    .filter(c => c.length > 0 && c !== "-");

                certs.forEach(c => allCertsSet.add(c));

                const details = {};
                originalHeaders.forEach((header, idx) => {
                    if (idx !== certIndex) {
                         const val = row[idx] || "";
                         if (val && val !== "-") { 
                             details[header] = val;
                         }
                    }
                });

                parsedData.push({
                    game: gameName,
                    certs: certs,
                    details: details 
                });
            }

            setData(parsedData);
            setAvailableCertificates(Array.from(allCertsSet).sort());
            setLastUpdated(new Date().toLocaleTimeString());

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []); 

    useEffect(() => {
        fetchData();
    }, [fetchData]); 

    // Списки для выпадающих меню (СОРТИРОВКА ПО АЛФАВИТУ)
    const gameList = useMemo(() => {
        // Используем localeCompare для корректной алфавитной сортировки строк
        return data.map(d => d.game).sort((a, b) => a.localeCompare(b));
    }, [data]);

    // Результаты поиска (для grid карточек)
    const results = useMemo(() => {
        if (!selectedItem) return [];

        if (searchMode === "certificate") {
            let foundGames = [];
            
            // === КЕЙС: CURACAO ===
            if (selectedItem.toLowerCase() === "curacao") {
                foundGames = data.map(item => ({ 
                    name: item.game, 
                    label: "All Allowed" 
                }));
            } else {
                // Обычный поиск
                foundGames = data
                    .filter(item => item.certs.some(c => c === selectedItem || c.includes(selectedItem)))
                    .map(item => ({ name: item.game, label: "Certified" }));
            }

            // СОРТИРОВКА РЕЗУЛЬТАТОВ ПО АЛФАВИТУ
            return foundGames.sort((a, b) => a.name.localeCompare(b.name));

        } else {
            // Режим Game: возвращаем сертификаты
            const gameData = data.find(d => d.game === selectedItem);
            if (!gameData) return [];
            
            // Сертификаты тоже сортируем для красоты
            const certs = gameData.certs.map(c => ({ name: c, label: "Active" }));
            return certs.sort((a, b) => a.name.localeCompare(b.name));
        }
    }, [searchMode, selectedItem, data]);

    return (
        <div className="max-w-7xl mx-auto pb-10">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900">
                    🌍 Game Availability Checker
                </h1>
                <button 
                    onClick={fetchData} 
                    className="text-sm text-[#2e2691] hover:underline flex items-center gap-1"
                    disabled={loading}
                >
                    <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    {loading ? "Updating..." : "Refresh Data"}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-200 mb-6">
                    <strong>Error:</strong> {error}
                    <p className="text-xs mt-1">Make sure the Google Sheet has &apos;Game&apos; and &apos;Certificates&apos; columns.</p>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200 min-h-[400px]">
                {/* TABS */}
                <div className="flex justify-center mb-8">
                    <div className="bg-gray-100 p-1 rounded-lg flex shadow-inner">
                        <button
                            onClick={() => { setSearchMode("certificate"); setSelectedItem(""); }}
                            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
                                searchMode === "certificate" 
                                    ? "bg-[#2e2691] text-white shadow" 
                                    : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            By Certificate 📜
                        </button>
                        <button
                            onClick={() => { setSearchMode("game"); setSelectedItem(""); }}
                            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
                                searchMode === "game" 
                                    ? "bg-[#2e2691] text-white shadow" 
                                    : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            By Game 🎰
                        </button>
                    </div>
                </div>

                {/* SEARCH INPUT */}
                <div className="max-w-md mx-auto mb-8">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                        Select {searchMode === "certificate" ? "Certificate" : "Game"}
                    </label>
                    <select
                        value={selectedItem}
                        onChange={(e) => setSelectedItem(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2e2691] focus:outline-none text-gray-800 font-medium bg-gray-50"
                        disabled={loading}
                    >
                        <option value="">-- Choose --</option>
                        {(searchMode === "certificate" ? availableCertificates : gameList).map(item => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>
                </div>

                {/* RESULTS */}
                {selectedItem && (
                    <div className="animate-fade-in">
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                            {searchMode === "certificate" 
                                ? <>Games certified for <span className="text-[#2e2691]">{selectedItem}</span>:</>
                                : <>Certificates for <span className="text-[#2e2691]">{selectedItem}</span>:</>
                            }
                            <span className="ml-auto text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                {results.length} found
                            </span>
                        </h3>

                        {/* GRID С КАРТОЧКАМИ */}
                        {results.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {results.map((res, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-100 transition-colors">
                                        <span className="font-bold text-gray-700">{res.name}</span>
                                        <span className={`text-[10px] uppercase font-bold text-white px-2 py-0.5 rounded-full ml-2 ${res.label === 'All Allowed' ? 'bg-blue-500' : 'bg-green-500'}`}>
                                            {res.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-400 italic">
                                No certificates found for this selection.
                            </div>
                        )}

                        {/* --- БЛОК ДЕТАЛЕЙ (ТОЛЬКО ДЛЯ РЕЖИМА BY GAME) --- */}
                        {searchMode === "game" && selectedGameData && (
                            <div className="mt-8 pt-6 border-t border-gray-200 animate-fade-in-up">
                                <h4 className="text-md font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Full Game Information
                                </h4>
                                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <tbody>
                                            {Object.entries(selectedGameData.details).map(([key, value], idx) => (
                                                <tr key={key} className={`border-b border-gray-100 last:border-0 ${idx % 2 === 0 ? '' : 'bg-gray-100/50'}`}>
                                                    <td className="py-2 pr-4 font-semibold text-gray-500 w-1/3 align-top">{key}</td>
                                                    <td className="py-2 text-gray-800 align-top break-words">{value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {!selectedItem && !loading && (
                    <div className="text-center py-20 text-gray-300">
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Select an item to view data
                    </div>
                )}
            </div>
            <div className="text-center mt-4 text-xs text-gray-400">
                Data source: Google Sheets (Last update: {lastUpdated || "-"})
            </div>
        </div>
    );
};

export default GameAvailability;