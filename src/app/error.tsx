'use client';

import {AlertTriangle, Home, RefreshCw} from 'lucide-react';
import Link from 'next/link';
import {useEffect} from 'react';

export default function Error({error}: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error('[v0] Error occurred:', error);
  }, [error]);

  const reset = () => window.location.reload();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/60 rounded-full blur-md animate-pulse"></div>
        <div
          className="absolute top-40 right-20 w-24 h-24 bg-purple-500/60 rounded-full blur-md animate-pulse delay-1000"></div>
        <div
          className="absolute bottom-32 left-1/4 w-40 h-40 bg-pink-500/60 rounded-full blur-md animate-pulse delay-2000"></div>
        <div
          className="absolute bottom-20 right-1/3 w-28 h-28 bg-cyan-500/60 rounded-full blur-md animate-pulse delay-3000"></div>
      </div>

      <div className="relative z-10 max-w-md w-full">
        <div className="bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-red-400 to-orange-500 rounded-full animate-gradientShift">
              <AlertTriangle size={48} className="text-white"/>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">Terjadi Kesalahan</h1>

          <p className="text-white/80 mb-2 leading-relaxed">Maaf, terjadi kesalahan yang tidak terduga. Silakan coba
            lagi atau kembali ke halaman utama.</p>

          {error.digest &&
            <p className="text-white/60 text-xs mb-6 font-mono bg-black/20 p-2 rounded-lg">Error ID: {error.digest}</p>}

          <div className="flex flex-col gap-3">
            <button
              onClick={reset}
              className="flex cursor-pointer items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg animate-gradientShift">
              <RefreshCw size={20}/>
              Coba Lagi
            </button>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30">
              <Home size={20}/>
              Kembali ke Beranda
            </Link>
          </div>
        </div>

        <p className="text-center text-white/60 text-sm mt-6">Jika masalah terus berlanjut, silakan laporkan kepada
          administrator</p>
      </div>
    </div>
  );
}
