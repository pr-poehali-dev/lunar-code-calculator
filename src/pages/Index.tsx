import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

type Mode = "calc" | "validate";

interface HistoryEntry {
  id: string;
  input: string;
  result: number;
  algorithm: string;
  timestamp: number;
  mode?: Mode;
  valid?: boolean;
}

function luhnCheckDigit(num: string): number {
  const digits = num.replace(/\D/g, "").split("").map(Number);
  let sum = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if ((digits.length - i) % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}

function mod10CheckDigit(num: string): number {
  const digits = num.replace(/\D/g, "").split("").map(Number);
  const sum = digits.reduce((acc, d, i) => {
    const weight = i % 2 === 0 ? 1 : 2;
    const val = d * weight;
    return acc + (val > 9 ? val - 9 : val);
  }, 0);
  return (10 - (sum % 10)) % 10;
}

function mod11CheckDigit(num: string): number {
  const digits = num.replace(/\D/g, "").split("").map(Number).reverse();
  const weights = [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7];
  const sum = digits.reduce((acc, d, i) => acc + d * (weights[i] || 2), 0);
  const rem = sum % 11;
  return rem < 2 ? 0 : 11 - rem;
}

const ALGORITHMS: Record<string, { label: string; fn: (s: string) => number; desc: string }> = {
  luhn: { label: "Луна", fn: luhnCheckDigit, desc: "Алгоритм Луна — банковские карты, IMEI, паспорта" },
  mod10: { label: "Mod 10", fn: mod10CheckDigit, desc: "Модуль 10 — штрихкоды EAN-13, ISBN" },
  mod11: { label: "Mod 11", fn: mod11CheckDigit, desc: "Модуль 11 — ИНН, КПП, паспорт РФ" },
};

const STORAGE_KEY = "check_digit_history";

export default function Index() {
  const [input, setInput] = useState("");
  const [algo, setAlgo] = useState("luhn");
  const [mode, setMode] = useState<Mode>("calc");
  const [result, setResult] = useState<number | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (_e) {
        // ignore parse errors
      }
    }
  }, []);

  const saveHistory = (entries: HistoryEntry[]) => {
    setHistory(entries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  };

  const calculate = () => {
    const clean = input.replace(/\D/g, "");
    if (!clean) return;

    if (mode === "calc") {
      const res = ALGORITHMS[algo].fn(clean);
      setResult(res);
      setIsValid(null);
      setAnimKey((k) => k + 1);
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        input: clean,
        result: res,
        algorithm: algo,
        timestamp: Date.now(),
        mode: "calc",
      };
      saveHistory([entry, ...history].slice(0, 50));
    } else {
      if (clean.length < 2) return;
      const body = clean.slice(0, -1);
      const lastDigit = Number(clean.slice(-1));
      const expected = ALGORITHMS[algo].fn(body);
      const valid = lastDigit === expected;
      setIsValid(valid);
      setResult(expected);
      setAnimKey((k) => k + 1);
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        input: clean,
        result: expected,
        algorithm: algo,
        timestamp: Date.now(),
        mode: "validate",
        valid,
      };
      saveHistory([entry, ...history].slice(0, 50));
    }
  };

  const deleteEntry = (id: string) => {
    saveHistory(history.filter((e) => e.id !== id));
  };

  const clearHistory = () => saveHistory([]);

  const copyResult = () => {
    if (result === null) return;
    navigator.clipboard.writeText(String(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") calculate();
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] font-ibm">
      <header className="bg-white border-b border-[#ebebeb] px-6 py-5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[#111]">
              Контрольная цифра
            </h1>
            <p className="text-[10px] text-[#aaa] mt-0.5 tracking-widest uppercase">Калькулятор</p>
          </div>
          <div className="w-7 h-7 bg-[#111] flex items-center justify-center">
            <span className="text-white text-[9px] font-bold tracking-widest">КЦ</span>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-10 space-y-px">
        {/* Calculator block */}
        <div className="bg-white border border-[#ebebeb] p-7">
          {/* Mode toggle */}
          <div className="flex gap-px mb-7 border border-[#ddd] w-fit">
            {([["calc", "Расчёт"], ["validate", "Проверка"]] as [Mode, string][]).map(([m, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setResult(null); setIsValid(null); }}
                className={`px-5 py-2 text-[10px] uppercase tracking-[0.14em] font-semibold transition-all duration-150 ${
                  mode === m
                    ? "bg-[#111] text-white"
                    : "bg-white text-[#777] hover:text-[#111]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-[#bbb] mb-6 leading-relaxed min-h-[1.5em]">
            {mode === "calc"
              ? "Введите число без контрольной цифры — она будет рассчитана"
              : "Введите полное число с последней цифрой — будет проверена её корректность"}
          </p>

          <p className="text-[10px] uppercase tracking-[0.22em] text-[#bbb] mb-3 font-medium">
            Алгоритм
          </p>

          <div className="flex gap-2 mb-6">
            {Object.entries(ALGORITHMS).map(([key, { label, desc }]) => (
              <button
                key={key}
                title={desc}
                onClick={() => { setAlgo(key); setResult(null); setIsValid(null); }}
                className={`px-4 py-2 text-[10px] uppercase tracking-[0.14em] font-semibold border transition-all duration-150 ${
                  algo === key
                    ? "bg-[#111] text-white border-[#111]"
                    : "bg-white text-[#777] border-[#ddd] hover:border-[#999] hover:text-[#111]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value.replace(/[^0-9\s-]/g, "")); setResult(null); setIsValid(null); }}
              onKeyDown={handleKey}
              placeholder={mode === "calc" ? "Число без контрольной цифры..." : "Полное число для проверки..."}
              className="flex-1 border border-[#ddd] bg-[#fafafa] px-4 py-3.5 text-[14px] font-mono text-[#111] placeholder-[#ccc] outline-none focus:border-[#111] focus:bg-white transition-all duration-200"
            />
            <button
              onClick={calculate}
              disabled={mode === "calc" ? !input.replace(/\D/g, "") : input.replace(/\D/g, "").length < 2}
              className="px-5 py-3.5 bg-[#111] text-white text-[10px] uppercase tracking-[0.16em] font-semibold hover:bg-[#333] disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {mode === "calc" ? "Считать" : "Проверить"}
            </button>
          </div>
        </div>

        {/* Result block */}
        <div
          className={`bg-white border overflow-hidden transition-all duration-300 ${
            result !== null ? "max-h-48 opacity-100" : "max-h-0 opacity-0 border-0"
          } ${
            mode === "validate" && isValid !== null
              ? isValid ? "border-[#22c55e]" : "border-[#ef4444]"
              : "border-[#ebebeb]"
          }`}
        >
          {result !== null && (
            <div key={animKey} className="px-7 py-6 flex items-center justify-between animate-fade-in">
              <div>
                {mode === "validate" && isValid !== null ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${isValid ? "bg-[#22c55e]" : "bg-[#ef4444]"}`} />
                      <p className={`text-[10px] uppercase tracking-[0.22em] font-semibold ${isValid ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                        {isValid ? "Верно" : "Ошибка"}
                      </p>
                    </div>
                    <p className="text-[12px] font-mono text-[#999]">
                      {isValid
                        ? <>Контрольная цифра <span className="text-[#111] font-bold">{result}</span> корректна</>
                        : <>Ожидалась <span className="text-[#111] font-bold">{result}</span>, введена <span className="text-[#ef4444] font-bold">{input.replace(/\D/g, "").slice(-1)}</span></>
                      }
                    </p>
                    <p className="text-[11px] font-mono text-[#ccc] mt-1.5">
                      {input.replace(/\D/g, "").slice(0, -1)}
                      <span className={`font-bold ${isValid ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                        {input.replace(/\D/g, "").slice(-1)}
                      </span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#bbb] mb-2 font-medium">
                      Результат
                    </p>
                    <div className="flex items-baseline gap-4">
                      <span className="text-[52px] leading-none font-extralight text-[#111] tabular-nums">
                        {result}
                      </span>
                      <span className="text-[12px] font-mono text-[#ccc]">
                        {input.replace(/\D/g, "")}
                        <span className="text-[#111] font-bold">{result}</span>
                      </span>
                    </div>
                  </>
                )}
              </div>
              {mode === "calc" && (
                <button
                  onClick={copyResult}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 border text-[10px] uppercase tracking-[0.14em] font-semibold transition-all duration-200 ${
                    copied
                      ? "border-[#111] bg-[#111] text-white"
                      : "border-[#ddd] text-[#999] hover:border-[#111] hover:text-[#111]"
                  }`}
                >
                  <Icon name={copied ? "Check" : "Copy"} size={11} />
                  {copied ? "Готово" : "Копировать"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* History block */}
        <div className="bg-white border border-[#ebebeb]">
          <div className="px-7 py-5 flex items-center justify-between border-b border-[#f2f2f2]">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#bbb] font-medium">
              История
              {history.length > 0 && (
                <span className="ml-2 text-[#ddd] font-normal">{history.length}</span>
              )}
            </p>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-[10px] uppercase tracking-[0.14em] text-[#ccc] hover:text-[#e44] transition-colors duration-150 font-semibold"
              >
                Очистить всё
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="px-7 py-14 text-center">
              <Icon name="ClockFading" fallback="Clock" size={20} className="text-[#e0e0e0] mx-auto mb-3" />
              <p className="text-[11px] text-[#ccc] tracking-widest uppercase">Нет записей</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#f5f5f5]">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="px-7 py-3.5 flex items-center justify-between group hover:bg-[#fafafa] transition-colors duration-100"
                >
                  <div className="flex items-center gap-5 min-w-0">
                    {entry.mode === "validate" ? (
                      <div className="w-5 flex justify-center shrink-0">
                        <div className={`w-2 h-2 rounded-full ${entry.valid ? "bg-[#22c55e]" : "bg-[#ef4444]"}`} />
                      </div>
                    ) : (
                      <span className="text-[22px] font-extralight text-[#111] tabular-nums w-5 text-center shrink-0">
                        {entry.result}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-[12px] font-mono text-[#555] truncate max-w-[200px]">
                        {entry.mode === "validate" ? (
                          <>
                            {entry.input.slice(0, -1)}
                            <span className={`font-bold ${entry.valid ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                              {entry.input.slice(-1)}
                            </span>
                          </>
                        ) : (
                          <>
                            {entry.input}
                            <span className="font-bold text-[#111]">{entry.result}</span>
                          </>
                        )}
                      </p>
                      <p className="text-[10px] text-[#ccc] mt-0.5 tracking-wide">
                        {ALGORITHMS[entry.algorithm]?.label ?? entry.algorithm}
                        {entry.mode === "validate" && (
                          <span className={`ml-1 ${entry.valid ? "text-[#86efac]" : "text-[#fca5a5]"}`}>
                            · {entry.valid ? "верно" : "ошибка"}
                          </span>
                        )}
                        {" · "}{formatTime(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#ddd] hover:text-[#e44] transition-all duration-150 shrink-0"
                  >
                    <Icon name="X" size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}