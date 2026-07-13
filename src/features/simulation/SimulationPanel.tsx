import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { runMonteCarloSimulation, type SimulationResult } from '../../lib/simulation';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import { Play, HelpCircle, AlertTriangle, TrendingUp } from 'lucide-react';

export default function SimulationPanel() {
  const exams = useLiveQuery(() => db.exams.toArray()) || [];
  const targetNetSetting = useLiveQuery(() => db.settings.get('targetNet'));
  const dailyPageRateSetting = useLiveQuery(() => db.settings.get('dailyPageRate'));
  const examDateSetting = useLiveQuery(() => db.settings.get('examDate'));

  const targetNet = targetNetSetting?.value || 85;
  const examDateStr = examDateSetting?.value || '2026-09-06T10:15:00';
  const examDate = new Date(examDateStr);

  const [driftPerWeek, setDriftPerWeek] = useState(0.4); // learning drift default
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Calculate remaining Sundays
  const calculateRemainingSundays = (): number => {
    const now = new Date();
    if (now >= examDate) return 0;
    let count = 0;
    const tempDate = new Date(now.getTime());
    tempDate.setDate(tempDate.getDate() + 1);
    while (tempDate <= examDate) {
      if (tempDate.getDay() === 0) {
        count++;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return count;
  };

  const remainingSundays = calculateRemainingSundays();

  const netsArray = exams.map(e => e.toplamNet);

  const handleRunSimulation = () => {
    if (netsArray.length < 3) return;
    setIsRunning(true);
    
    // Tiny delay to simulate CPU intensive task
    setTimeout(() => {
      const simResult = runMonteCarloSimulation(
        netsArray,
        remainingSundays,
        driftPerWeek,
        targetNet,
        5000
      );
      setResult(simResult);
      setIsRunning(false);
    }, 300);
  };

  const maxBinCount = result ? Math.max(...result.histogram.map(b => b.count)) : 1;

  return (
    <div className="kp-simulation-section">
      <div className="kp-section-header">
        <div>
          <h2 className="kp-section-title">NET TAHMİN SİMÜLATÖRÜ</h2>
          <p className="kp-section-subtitle">Monte Carlo Yöntemiyle Sınav Günü Başarı Olasılık Hesaplayıcısı</p>
        </div>
      </div>

      {netsArray.length < 3 ? (
        <EmptyState
          title="Simülatör Kilitli"
          description={`Monte Carlo istatistiksel projeksiyonunun kararlı çalışabilmesi için sistemde en az 3 adet deneme sınavı kaydı bulunmalıdır. Mevcut sınav sayısı: ${netsArray.length}`}
          action={
            <div className="flex gap-2">
              <Badge variant="stamp">MINIMUM SART SAĞLANMADI</Badge>
            </div>
          }
        />
      ) : (
        <div className="kp-simulation-grid">
          {/* Controls Panel */}
          <Card header={<div className="kp-card-header-mono">SİMÜLASYON AYAR PARAMETRELERİ</div>}>
            <div className="kp-form-group">
              <div className="kp-label-with-desc">
                <label>Haftalık Öğrenme Katsayısı (Drift)</label>
                <span className="kp-form-desc">Kalan her Pazar günü için beklenen net artış miktarı.</span>
              </div>
              <div className="kp-input-slider-row">
                <input
                  type="range"
                  min="0.0"
                  max="1.5"
                  step="0.1"
                  value={driftPerWeek}
                  onChange={e => setDriftPerWeek(parseFloat(e.target.value))}
                />
                <span className="kp-slider-val kp-lbl-mono">{driftPerWeek.toFixed(1)} net / hafta</span>
              </div>
            </div>

            <div className="kp-sim-metadata-box">
              <div className="kp-sim-meta-item">
                <span className="kp-lbl-soft">TARİHSEL ORTALAMA (μ):</span>
                <strong className="kp-lbl-mono">
                  {(netsArray.reduce((a, b) => a + b, 0) / netsArray.length).toFixed(2)} Net
                </strong>
              </div>
              <div className="kp-sim-meta-item">
                <span className="kp-lbl-soft">KALAN PAZAR SAYISI:</span>
                <strong className="kp-lbl-mono">{remainingSundays} Hafta</strong>
              </div>
              <div className="kp-sim-meta-item">
                <span className="kp-lbl-soft">TOPLAM HEDEF DRIFT:</span>
                <strong className="kp-lbl-mono">{(remainingSundays * driftPerWeek).toFixed(2)} Net Artış</strong>
              </div>
              <div className="kp-sim-meta-item">
                <span className="kp-lbl-soft">HEDEF NET BARİYERİ:</span>
                <strong className="kp-lbl-mono text-stamp">{targetNet} Net</strong>
              </div>
            </div>

            <Button
              variant="stamp"
              className="w-full py-3 text-base font-semibold"
              onClick={handleRunSimulation}
              disabled={isRunning}
            >
              <Play size={16} /> {isRunning ? '5,000 Iterasyon Hesaplanıyor...' : 'Monte Carlo Simülasyonunu Çalıştır'}
            </Button>

            <div className="kp-honesty-disclaimer">
              <AlertTriangle size={14} className="text-stamp flex-shrink-0" />
              <span>
                <strong>Dürüstlük Şerhi:</strong> Bu hesaplama geçmiş deneme varyansınızın matematiksel projeksiyonudur; kesin bir sınav sonucu vaat etmez. Psikolojik etkenleri, konu eksikliklerini ve sınav günü koşullarını modellemez.
              </span>
            </div>
          </Card>

          {/* Results Panel */}
          {result ? (
            <div className="kp-simulation-results-container">
              {/* Giant Success Probability Stamp */}
              <Card className="kp-prob-card" header={<div className="kp-card-header-mono">HEDEFE ULAŞMA OLASILIĞI</div>}>
                <div className="kp-stamp-percentage-display">
                  <div className="kp-stamp-percent kp-lbl-mono">%{result.successProbability}</div>
                  <p className="kp-stamp-percent-desc">
                    Yapılan 5,000 yapay sınav simülasyonunda <strong>{targetNet} net</strong> barajının aşıldığı denemelerin yüzdesi.
                  </p>
                </div>
              </Card>

              {/* Confidence Intervals Percentiles */}
              <div className="kp-percentiles-grid">
                <Card className="kp-percentile-box bad">
                  <span className="kp-lbl-soft">KÖTÜ GÜN (P5)</span>
                  <div className="kp-percentile-val kp-lbl-mono">{result.p5}</div>
                  <span className="kp-percentile-desc">%95 olasılıkla bu netin üzerinde yaparsınız.</span>
                </Card>
                
                <Card className="kp-percentile-box expected">
                  <span className="kp-lbl-soft">BEKLENEN GÜN (P50)</span>
                  <div className="kp-percentile-val kp-lbl-mono">{result.p50}</div>
                  <span className="kp-percentile-desc">%50 olasılıkla bu netin üzerinde yaparsınız (Ortanca).</span>
                </Card>

                <Card className="kp-percentile-box good">
                  <span className="kp-lbl-soft">İYİ GÜN (P95)</span>
                  <div className="kp-percentile-val kp-lbl-mono">{result.p95}</div>
                  <span className="kp-percentile-desc">%5 olasılıkla bu netin de üzerine çıkarsınız (Zirve).</span>
                </Card>
              </div>

              {/* Histogram Distribution Graph */}
              <Card header={<div className="kp-card-header-mono">5,000 YAPAY SINAV NET DAĞILIM HİSTOGRAMI</div>}>
                <div className="kp-histogram-chart">
                  <div className="kp-histogram-bars">
                    {result.histogram.map((bin, idx) => {
                      const pctHeight = (bin.count / maxBinCount) * 100;
                      return (
                        <div
                          key={idx}
                          className={`kp-histogram-bar-col ${bin.isTargetBin ? 'target' : ''}`}
                          style={{ height: `${Math.max(4, pctHeight)}%` }}
                          title={`Net Aralığı: ${bin.binStart.toFixed(0)}-${bin.binEnd.toFixed(0)} | Sınav Sayısı: ${bin.count}`}
                        />
                      );
                    })}
                  </div>
                  <div className="kp-histogram-labels">
                    <span className="kp-lbl-mono">0 Net</span>
                    <span className="kp-lbl-mono text-stamp font-bold">{targetNet} Net (Hedef)</span>
                    <span className="kp-lbl-mono">120 Net</span>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="kp-sim-prompt-run">
              <TrendingUp size={48} className="kp-lbl-soft mb-2" />
              <h4>Simülasyon Hazır</h4>
              <p>Öğrenme katsayısını ayarladıktan sonra simülasyonu başlatarak dağılım modelini hesaplayabilirsiniz.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
