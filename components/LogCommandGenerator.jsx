// components/LogCommandGenerator.jsx
import { useState, useEffect } from "react";

const LogCommandGenerator = ({ payload }) => {
    const [copiedId, setCopiedId] = useState(null);

    // === УЛУЧШЕННОЕ ИЗВЛЕЧЕНИЕ ПАРАМЕТРОВ ===
    // Поддержка как Launch URL (user, token), так и Round Details (op_player_id, player_token)
    const token = payload?.token || payload?.player_token || payload?.session_token || "TOKEN_NOT_FOUND";
    const user = payload?.user || payload?.op_player_id || "USER_NOT_FOUND";
    const operator = payload?.operator || "OPERATOR_NOT_FOUND";
    
    const [searchTerm, setSearchTerm] = useState(token);
    const [searchType, setSearchType] = useState("token"); 

    const [editedCommands, setEditedCommands] = useState({});

    // === СОСТОЯНИЕ ВРЕМЕНИ ===
    const [selectedDate, setSelectedDate] = useState('');
    
    // Время "С" (Start)
    const [fromHour, setFromHour] = useState('');
    const [fromMinute, setFromMinute] = useState('');
    const [fromSecond, setFromSecond] = useState('');
    const [fromMs, setFromMs] = useState('');
    
    // Время "По" (End)
    const [toHour, setToHour] = useState('');
    const [toMinute, setToMinute] = useState('');
    const [toSecond, setToSecond] = useState('');
    const [toMs, setToMs] = useState('');

    const [activeGroupPrefix, setActiveGroupPrefix] = useState("sf");

    // 1. Инициализация времени
    useEffect(() => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        
        const currentHour = now.getHours();
        const prevHourNum = currentHour > 0 ? currentHour - 1 : 0;
        const prevHourStr = String(prevHourNum).padStart(2, '0');

        setSelectedDate(`${yyyy}-${mm}-${dd}`);
        
        // Старт: XX:00:00.000
        setFromHour(prevHourStr);
        setFromMinute("00");
        setFromSecond("00");
        setFromMs("000");
        
        // Конец: XX:59:59.999
        setToHour(prevHourStr);
        setToMinute("59");
        setToSecond("59");
        setToMs("999");
    }, []);

    // 2. Обновляем searchTerm при изменении параметров
    useEffect(() => {
        if (searchType === 'token') setSearchTerm(token);
        else if (searchType === 'user') setSearchTerm(user);
        else if (searchType === 'operator') setSearchTerm(operator);
        
        setEditedCommands({});
    }, [payload, searchType, token, user, operator]);

    const handleCopy = (text, uniqueId) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(uniqueId);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const handleCommandEdit = (uniqueId, value) => {
        setEditedCommands(prev => ({
            ...prev,
            [uniqueId]: value
        }));
    };

    const handleMsChange = (setter, value) => {
        const numericValue = value.replace(/\D/g, '').slice(0, 3);
        setter(numericValue);
    };

    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
    const seconds = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    const logGroups = [
        {
            title: "Game Server (Smartfox)",
            shortTitle: "Game Server",
            filename: "smartfox.log",
            prefix: "sf"
        },
        {
            title: "CA / GA / Public GA",
            shortTitle: "App Logs",
            filename: "app.log",
            prefix: "app"
        }
    ];

    const getCommandTemplates = (filename) => {
        const startTime = `${selectedDate} ${fromHour}:${fromMinute}:${fromSecond}.${fromMs.padEnd(3, '0')}`;
        const endTime = `${selectedDate} ${toHour}:${toMinute}:${toSecond}.${toMs.padEnd(3, '0')}`;
        
        let fileHourPart = "";

        if (fromHour === toHour) {
            fileHourPart = fromHour;
        } else if (parseInt(toHour) === parseInt(fromHour) + 1 && toMinute === "00" && toSecond === "00") {
            fileHourPart = fromHour;
        } else {
            fileHourPart = `{${fromHour},${toHour}}`;
        }

        const fileTarget = `${filename}.${selectedDate}-${fileHourPart}.gz`;

        return [
            {
                label: "Текущий лог (Live)",
                desc: `Поиск в активном файле`,
                cmd: `grep "${searchTerm}" ${filename}`
            },
            {
                label: "Точный диапазон (AWK)",
                desc: `Поиск с ${fromHour}:${fromMinute}:${fromSecond} по ${toHour}:${toMinute}:${toSecond}`,
                cmd: `zcat ${fileTarget} | awk '$0 >= "${startTime}" && $0 <= "${endTime}"' | grep "${searchTerm}"`
            },
            {
                label: "Конкретный час (Весь файл)",
                desc: `Поиск в архиве ${selectedDate}-${fromHour}`,
                cmd: `zgrep "${searchTerm}" ${filename}.${selectedDate}-${fromHour}.gz`
            },
            {
                label: "Все архивы за день",
                desc: `Поиск по всем файлам ${selectedDate}`,
                cmd: `zgrep "${searchTerm}" ${filename}.${selectedDate}-*`
            }
        ];
    };

    const activeGroup = logGroups.find(g => g.prefix === activeGroupPrefix) || logGroups[0];

    if (!payload) return null;

    return (
        <div className="mt-6 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-fade-in-up">
            
            {/* ВЕРХНЯЯ ПАНЕЛЬ */}
            <div className="bg-gray-800 px-6 py-4 flex flex-col xl:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 min-w-max">
                    📜 Генератор команд
                </h3>
                
                <div className="flex bg-gray-700 rounded-lg p-1 text-xs">
                    {logGroups.map((group) => (
                        <button
                            key={group.prefix}
                            onClick={() => setActiveGroupPrefix(group.prefix)}
                            className={`px-4 py-1.5 rounded-md transition-all font-medium ${
                                activeGroupPrefix === group.prefix 
                                ? "bg-gray-500 text-white shadow" 
                                : "text-gray-400 hover:text-white"
                            }`}
                        >
                            {group.shortTitle}
                        </button>
                    ))}
                </div>

                <div className="flex bg-gray-700 rounded-lg p-1 text-xs">
                    {["token", "user", "operator"].map(type => (
                        <button
                            key={type}
                            onClick={() => setSearchType(type)}
                            className={`px-3 py-1.5 rounded-md transition-all ${searchType === type ? "bg-gray-500 text-white shadow" : "text-gray-400 hover:text-white"}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* ПАНЕЛЬ ВЫБОРА ВРЕМЕНИ */}
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row flex-wrap items-center gap-4 text-sm justify-center sm:justify-start">
                
                {/* Дата */}
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-600">Дата:</span>
                    <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-gray-700 focus:ring-2 focus:ring-[#2e2691] focus:outline-none h-8"
                    />
                </div>

                <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>

                {/* Время С (Start) */}
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-600">C:</span>
                    <div className="flex gap-0.5 items-center">
                        <select value={fromHour} onChange={(e) => setFromHour(e.target.value)} className="time-select rounded-l-md">
                            {hours.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="text-gray-400">:</span>
                        <select value={fromMinute} onChange={(e) => setFromMinute(e.target.value)} className="time-select">
                            {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <span className="text-gray-400">:</span>
                        <select value={fromSecond} onChange={(e) => setFromSecond(e.target.value)} className="time-select">
                            {seconds.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <span className="text-gray-400">.</span>
                        <input 
                            type="text" 
                            value={fromMs}
                            onChange={(e) => handleMsChange(setFromMs, e.target.value)}
                            placeholder="000"
                            className="w-10 px-1 py-1 border border-gray-300 rounded-r-md text-center text-gray-700 focus:ring-2 focus:ring-[#2e2691] focus:outline-none h-8 text-xs"
                        />
                    </div>
                </div>

                {/* Время ПО (End) */}
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-600">По:</span>
                    <div className="flex gap-0.5 items-center">
                        <select value={toHour} onChange={(e) => setToHour(e.target.value)} className="time-select rounded-l-md">
                            {hours.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="text-gray-400">:</span>
                        <select value={toMinute} onChange={(e) => setToMinute(e.target.value)} className="time-select">
                            {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <span className="text-gray-400">:</span>
                        <select value={toSecond} onChange={(e) => setToSecond(e.target.value)} className="time-select">
                            {seconds.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <span className="text-gray-400">.</span>
                        <input 
                            type="text" 
                            value={toMs}
                            onChange={(e) => handleMsChange(setToMs, e.target.value)}
                            placeholder="999"
                            className="w-10 px-1 py-1 border border-gray-300 rounded-r-md text-center text-gray-700 focus:ring-2 focus:ring-[#2e2691] focus:outline-none h-8 text-xs"
                        />
                    </div>
                </div>
                
                {/* Стили для селектов */}
                <style jsx>{`
                    .time-select {
                        @apply px-1 py-1 border border-gray-300 text-gray-700 focus:ring-2 focus:ring-[#2e2691] focus:outline-none h-8 text-xs appearance-none text-center min-w-[3rem];
                    }
                `}</style>
            </div>

            {/* СПИСОК КОМАНД */}
            <div className="p-6 space-y-6">
                <div className="flex items-center pb-2 border-b border-gray-100">
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                        {activeGroupPrefix === 'sf' ? '🎮' : '⚙️'} {activeGroup.title}
                    </span>
                </div>

                <div className="space-y-4">
                    {getCommandTemplates(activeGroup.filename).map((tpl, idx) => {
                        const uniqueId = `${activeGroup.prefix}-${idx}`;
                        const currentValue = editedCommands[uniqueId] !== undefined ? editedCommands[uniqueId] : tpl.cmd;

                        return (
                            <div key={uniqueId} className="flex flex-col space-y-1">
                                <div className="flex justify-between items-end px-1">
                                    <span className="text-xs font-bold text-gray-600">
                                        {tpl.label}
                                    </span>
                                    <span className="text-[10px] text-gray-400 italic">
                                        {tpl.desc}
                                    </span>
                                </div>
                                
                                <div className="relative group">
                                    <input 
                                        type="text"
                                        value={currentValue}
                                        onChange={(e) => handleCommandEdit(uniqueId, e.target.value)}
                                        className="w-full bg-gray-900 text-green-400 font-mono text-xs p-3 rounded-lg border border-gray-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors pr-10"
                                        spellCheck="false"
                                    />
                                    
                                    <button
                                        onClick={() => handleCopy(currentValue, uniqueId)}
                                        className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded transition-all shadow-sm"
                                        title="Копировать команду"
                                    >
                                        {copiedId === uniqueId ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default LogCommandGenerator;