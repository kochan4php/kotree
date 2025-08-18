'use client';

import { ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/60 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-purple-500/60 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-pink-500/60 rounded-full blur-xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-cyan-500/60 rounded-full blur-xl animate-pulse delay-3000"></div>
      </div>

      <div className="relative z-10 max-w-md w-full">
        <div className="bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl text-center">
          <div className="text-8xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4 animate-gradient bg-[length:400%_400%] drop-shadow-lg">
            404
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">Halaman Tidak Ditemukan</h1>

          <p className="text-white/80 mb-8 leading-relaxed">Oops! Halaman yang Anda cari tidak dapat ditemukan. Mungkin halaman telah dipindahkan atau URL salah.</p>

          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg animate-gradientShift">
              <Home size={20} />
              Kembali ke Beranda
            </Link>

            <Link
              href="/"
              className="flex cursor-pointer items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30">
              <ArrowLeft size={20} />
              Kembali ke Halaman Sebelumnya
            </Link>
          </div>
        </div>

        <p className="text-center text-white/60 text-sm mt-6">Jika masalah berlanjut, silakan hubungi administrator</p>
      </div>
    </div>
  );
}
