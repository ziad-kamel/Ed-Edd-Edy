"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

interface BotStatus {
  status: string;
  qr: string | null;
  isRunning: boolean;
  logs?: string[];
  lastUpdate?: string;
}

interface FileData {
  name: string;
  size: number;
  mtime: string;
}

export default function Home() {
  const [status, setStatus] = useState<BotStatus>({
    status: "disconnected",
    qr: null,
    isRunning: false,
    logs: [],
  });
  const [files, setFiles] = useState<FileData[]>([]);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/bot/action");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/files");
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error("Failed to fetch files:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchFiles();
    const interval = setInterval(() => {
      fetchStatus();
      fetchFiles();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    try {
      const res = await fetch("/api/bot/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (res.ok) fetchStatus();
    } catch (err) {
      console.error("Failed to start bot:", err);
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch("/api/bot/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      if (res.ok) fetchStatus();
    } catch (err) {
      console.error("Failed to stop bot:", err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <main className='min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8'>
      <div className='max-w-6xl w-full'>
        <header className='mb-12 text-center'>
          <h1 className='text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-4'>
            WhatsApp Bot Dashboard
          </h1>
          <p className='text-slate-400 text-lg'>
            Monitor and manage your Baileys-powered automation.
          </p>
        </header>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {/* Status Card */}
          <div className='bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl hover:border-blue-500/50 transition-all group'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-xl font-semibold text-slate-200'>
                Bot Status
              </h2>
              <div
                className={`w-3 h-3 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)] ${status.isRunning && status.status === "connected" ? "bg-emerald-500" : status.isRunning ? "bg-amber-500" : "bg-red-500"}`}
              ></div>
            </div>
            <p className='text-3xl font-bold capitalize text-emerald-400'>
              {status.status}
            </p>
            <p className='text-slate-500 mt-2 text-sm italic group-hover:text-slate-400 transition-colors'>
              {status.isRunning ? "Child Process Active" : "Status: Dormant"}
            </p>
          </div>

          <div className='bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl hover:border-blue-500/50 transition-all group'>
            <h2 className='text-xl font-semibold text-slate-200 mb-4'>
              Config Check
            </h2>
            <div className='bg-slate-800/50 p-3 rounded-lg border border-slate-700'>
              <code className='text-blue-300 text-sm break-all font-mono'>
                baileys.childProcess
              </code>
            </div>
            <p className='text-slate-500 mt-4 text-sm italic group-hover:text-slate-400 transition-colors'>
              Reverted Mode
            </p>
          </div>

          <div className='bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl hover:border-blue-500/50 transition-all group'>
            <h2 className='text-xl font-semibold text-slate-200 mb-4'>
              Files Stats
            </h2>
            <div className='space-y-2'>
              <div className='flex justify-between'>
                <span className='text-slate-400'>Total Found</span>
                <span className='font-mono text-emerald-400'>
                  {files.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Auth QR Code */}
        {status.qr && (
          <section className='mt-8 bg-white border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700 mx-auto max-w-sm'>
            <h2 className='text-2xl font-bold text-slate-900 mb-6 font-sans'>
              Authenticate
            </h2>
            <div className='p-2 bg-white rounded-lg shadow-inner border border-slate-100'>
              <QRCodeSVG value={status.qr} size={240} />
            </div>
          </section>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8'>
          <div className='space-y-8'>
            <section className='bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm'>
              <h2 className='text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2'>
                Control
              </h2>
              <div className='grid grid-cols-2 gap-4'>
                <button
                  onClick={handleStart}
                  disabled={status.isRunning}
                  className={`px-6 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
                    status.isRunning
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
                  }`}
                >
                  Launch
                </button>
                <button
                  onClick={handleStop}
                  disabled={!status.isRunning}
                  className={`px-6 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
                    !status.isRunning
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                      : "bg-red-600 hover:bg-red-500 text-white shadow-red-900/20"
                  }`}
                >
                  Kill
                </button>
              </div>
            </section>
          </div>

          <section className='bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm flex flex-col h-full overflow-hidden'>
            <h2 className='text-2xl font-bold text-slate-100 mb-6 flex justify-between items-center'>
              Files List
              <span className='text-xs text-slate-500 font-normal'>
                {files.length} items
              </span>
            </h2>
            <div className='flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-800 min-h-[300px]'>
              {files.length > 0 ? (
                files.map((file, i) => (
                  <div
                    key={i}
                    className='bg-slate-800/40 border border-slate-700 p-4 rounded-xl flex items-center justify-between hover:border-slate-500 transition-colors group'
                  >
                    <div className='flex items-center gap-4 overflow-hidden'>
                      <h3 className='text-sm font-semibold text-slate-200 truncate pr-2 group-hover:text-blue-400 transition-colors'>
                        {file.name}
                      </h3>
                    </div>
                    <a
                      href={`/api/files/${encodeURIComponent(file.name)}`}
                      className='bg-slate-700 hover:bg-blue-600 text-white p-2 rounded-lg transition-all active:scale-90 flex-shrink-0'
                    >
                      📥
                    </a>
                  </div>
                ))
              ) : (
                <div className='flex flex-col items-center justify-center h-full text-slate-600 italic py-10'>
                  No files.
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className='mt-16 text-center text-slate-600 text-sm'>
          Baileys Manager (External Process Mode)
        </footer>
      </div>
    </main>
  );
}
