import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

export default function CountdownStamp() {
  const [now, setNow] = useState(new Date());

  // Keep clock live
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const examDateSetting = useLiveQuery(() => db.settings.get('examDate'));
  const examDateStr = examDateSetting?.value || '2026-09-06T10:15:00';
  const examDate = new Date(examDateStr);

  const diffMs = examDate.getTime() - now.getTime();
  const isPast = diffMs < 0;
  
  // Calculate days remaining
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  // Calculate remaining Sundays (Deneme Pazarı)
  const calculateRemainingSundays = (startDate: Date, endDate: Date): number => {
    if (startDate >= endDate) return 0;
    let count = 0;
    const tempDate = new Date(startDate.getTime());
    // Move to next day first so we don't double count today if today is Sunday
    tempDate.setDate(tempDate.getDate() + 1);
    while (tempDate <= endDate) {
      if (tempDate.getDay() === 0) {
        count++;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return count;
  };

  const remainingSundays = calculateRemainingSundays(now, examDate);

  // Update document title
  useEffect(() => {
    if (daysRemaining > 0) {
      document.title = `${daysRemaining} gün — Kokpit`;
    } else {
      document.title = 'Sınav Günü! — Kokpit';
    }
  }, [daysRemaining]);

  return (
    <div className="kp-header-container">
      <div className="kp-header-left">
        <span className="kp-eyebrow">DOSYA № KPSS-2026 · GEÇİŞ DÖNEMİ KOKPİTİ</span>
        <h1 className="kp-title">KOKPİT</h1>
        <p className="kp-subtitle">Kişisel Sınav Hazırlık ve Stratejik Takip Masası</p>
      </div>

      <div className="kp-countdown-stamp">
        <div className="kp-stamp-inner">
          <div className="kp-stamp-eyebrow">KPSS VADE SAYACI</div>
          {isPast ? (
            <div className="kp-stamp-value">SINAV GÜNÜ</div>
          ) : (
            <>
              <div className="kp-stamp-days">
                <span className="kp-stamp-num">{daysRemaining}</span>
                <span className="kp-stamp-lbl">GÜN KALDI</span>
              </div>
              <div className="kp-stamp-sundays">
                <span className="kp-stamp-mono">{remainingSundays}</span> deneme pazarı
              </div>
            </>
          )}
          <div className="kp-stamp-date">
            {examDate.toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })} · {examDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}
