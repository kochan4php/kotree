"use client";

import ProfileActions from "@/components/profile-actions";
import { Card } from "@/components/ui/card";
import { profile } from "@/data/profile";
import { useState, useEffect } from "react";
import Tilt from "react-parallax-tilt";
import QRCode from "react-qr-code";
import { Code2, X } from "lucide-react";
import Image from "next/image";


export default function CardProfile() {
  const [isDesktop, setIsDesktop] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(window.location.href);
    const checkScreen = () => setIsDesktop(window.innerWidth >= 768);
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  return (
    <>
      <Tilt
        tiltEnable={isDesktop}
        glareEnable={isDesktop}
        glareMaxOpacity={0.15}
        glareColor="#ff6a33"
        glarePosition="all"
        tiltMaxAngleX={isDesktop ? 5 : 0}
        tiltMaxAngleY={isDesktop ? 5 : 0}
        scale={isDesktop ? 1.02 : 1}
        transitionSpeed={2500}
        className="mb-6"
      >
        <Card className="text-center p-6 shadow-2xl shadow-accent/5 relative z-10 gap-4 border-2 border-border/40 bg-card/80 backdrop-blur-xl">
            <div className="relative w-fit mx-auto mb-1">
              <div className="absolute -inset-4 rounded-full bg-accent/15 blur-2xl"></div>
              <div className="relative flex justify-center">
                <Image
                  src={profile.avatarUrl}
                  alt={profile.name}
                  width={96}
                  height={96}
                  priority
                  className="rounded-full shadow-lg shadow-accent/20 object-cover border-2 border-accent/30 pointer-events-none w-24 h-24"
                />
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{profile.name}</h1>
              <p className="text-base text-muted-foreground">{profile.handle}</p>
            </div>

            <span className="inline-flex items-center justify-center gap-1.5 bg-accent/15 text-accent border border-accent/30 rounded-full px-3.5 py-1 text-base font-medium w-fit mx-auto cursor-pointer">
              <Code2 className="w-4 h-4" />
              {profile.role}
            </span>

            <p className="text-foreground/90 max-w-sm mx-auto text-lg leading-snug cursor-pointer">{profile.bio}</p>

            <div className="relative z-20">
              <ProfileActions onToggleQR={() => setIsFlipped(true)} />
            </div>
        </Card>
      </Tilt>

      {/* Centered Modal for QR Code */}
      <div 
        className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
          isFlipped ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        <div 
          className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
          onClick={() => setIsFlipped(false)} 
        />
        <Card 
          className={`relative w-full max-w-sm text-center p-8 flex flex-col items-center justify-center shadow-2xl transition-all duration-300 ${
            isFlipped ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'
          }`}
        >
          <button
            onClick={() => setIsFlipped(false)}
            aria-label="Close QR"
            className="absolute top-4 right-4 p-2 rounded-full bg-accent/10 hover:bg-red-500/20 text-accent hover:text-red-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="text-2xl font-bold mb-6 text-foreground">Scan QR Code</h3>
          <div className="bg-white p-4 rounded-xl shadow-inner ring-4 ring-white/10 w-fit mx-auto mb-6">
            <QRCode value={url} size={180} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
          </div>
          <p className="text-base text-muted-foreground leading-relaxed">
            Point your camera at the QR code to open this profile on another device.
          </p>
        </Card>
      </div>
    </>
  );
}
