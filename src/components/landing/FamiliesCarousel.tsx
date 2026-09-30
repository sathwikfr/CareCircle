'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Home, Pill, HeartPulse, Globe2, Phone } from 'lucide-react';
import { TiltCard } from '@/components/motion/TiltCard';
import s from './home.module.css';

const CARDS = [
  {
    icon: Home,
    title: 'A parent living alone',
    body: 'A friendly voice every morning, and you know by 9 AM that she’s up and doing fine.',
    chat: ['Good morning Appa! Did you sleep well?', 'Haan beta, achhi neend aayi.'],
  },
  {
    icon: Pill,
    title: 'BP, sugar or thyroid tablets',
    body: 'Each medicine asked about at the right time, before or after food, every single day.',
    chat: ['Khana khane ke baad Metformin li?', 'Haan, abhi abhi li.'],
  },
  {
    icon: HeartPulse,
    title: 'Home after a hospital stay',
    body: 'Add extra check-ins for the first few weeks, then pause them when you visit.',
    chat: ['How is the stitch feeling today, Amma?', 'Better than yesterday.'],
  },
  {
    icon: Globe2,
    title: 'Children living abroad',
    body: 'Their morning is your midnight. Saathi calls on their clock, and the update waits for you.',
    chat: ['Vanakkam Amma, tiffin saapteengala?', 'Saapten, idli.'],
  },
  {
    icon: Phone,
    title: 'Parents who dislike apps',
    body: 'It’s just a phone call. Works on a keypad phone or a landline, nothing to install.',
    chat: ['Namaskara! BP maatre tagondra?', 'Haudu, tagonde.'],
  },
];

/** Horizontally scrolling scenario cards for the dark band. */
export function FamiliesCarousel({ ctaHref }: { ctaHref: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(360, el.clientWidth * 0.85), behavior: 'smooth' });
  };

  return (
    <>
      <div className={s.carouselNav}>
        <button type="button" onClick={() => scroll(-1)} aria-label="Previous"><ArrowLeft size={18} /></button>
        <button type="button" onClick={() => scroll(1)} aria-label="Next"><ArrowRight size={18} /></button>
      </div>
      <div className={s.track} ref={trackRef} tabIndex={0} aria-label="Families Aaptha is built for">
        {CARDS.map((c) => (
          <TiltCard key={c.title} className={s.famCard} max={5} role="article">
            <span className={s.famIcon}><c.icon size={22} /></span>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
            <div className={s.famChat} aria-label="Example exchange">
              <span>{c.chat[0]}</span>
              <span>{c.chat[1]}</span>
            </div>
            <Link href={ctaHref} className={s.famFoot}>
              Set this up <ArrowRight size={16} />
            </Link>
          </TiltCard>
        ))}
      </div>
    </>
  );
}
