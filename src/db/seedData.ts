export const SEED_PLACES = [
  {
    id: '1',
    ad: 'Atatürk Kitaplığı',
    ilce: 'Beyoğlu',
    kurum: 'İBB',
    acilis: 0,
    kapanis: 24,
    yediYirmiDort: true,
    notum: 'Boğaz manzaralı, sabah erken gitmek gerekiyor.'
  },
  {
    id: '2',
    ad: 'Beyazıt Devlet Kütüphanesi',
    ilce: 'Fatih',
    kurum: 'Devlet',
    acilis: 9,
    kapanis: 22,
    yediYirmiDort: false,
    notum: 'Tarihi atmosfer, sessizlik mükemmel.'
  },
  {
    id: '3',
    ad: 'İPA İstanbul Kitaplığı',
    ilce: 'Florya',
    kurum: 'İBB',
    acilis: 9,
    kapanis: 18,
    yediYirmiDort: false,
    notum: 'Doğa içinde sakin bir çalışma ortamı.'
  },
  {
    id: '4',
    ad: 'Sultanbeyli İlçe Halk Kütüphanesi',
    ilce: 'Sultanbeyli',
    kurum: 'Diğer',
    acilis: 9,
    kapanis: 19,
    yediYirmiDort: false,
    notum: 'Sessiz ve düzenli çalışma alanları.'
  }
] as const;

export const SEED_FEATURES = [
  {
    id: 'd1',
    category: 'daglar',
    ad: 'Ağrı Dağı',
    x: 920,
    y: 190,
    detay: 'Türkiye’nin en yüksek dağıdır (5137 m). Iğdır-Ağrı sınırında yer alır.',
    kpssNotu: 'Volkanik oluşumludur. Üzerinde Türkiye’nin en büyük buzul örtüsü yer alır.'
  },
  {
    id: 'd2',
    category: 'daglar',
    ad: 'Erciyes Dağı',
    x: 530,
    y: 240,
    detay: 'Kayseri ilinde yer alan, İç Anadolu Bölgesi’nin en yüksek sönmüş volkanik dağıdır.',
    kpssNotu: 'Kış turizmi gelişmiştir. Volkanik kökenlidir ve volkan konisi üzerinde buzul izleri bulunur.'
  },
  {
    id: 'd3',
    category: 'daglar',
    ad: 'Uludağ',
    x: 210,
    y: 140,
    detay: 'Bursa sınırlarında yer alan, Marmara Bölgesi’nin en yüksek dağıdır (2543 m).',
    kpssNotu: 'Oluşumu derinlik volkanizması (Batolit) şeklindedir, dış püskürük değil iç püskürüktür.'
  },
  {
    id: 'd4',
    category: 'daglar',
    ad: 'Kaçkar Dağı',
    x: 770,
    y: 110,
    detay: 'Doğu Karadeniz sıradağlarının en yüksek noktasıdır (3937 m).',
    kpssNotu: 'Kıvrım dağı kökenlidir (Alp-Himalaya kıvrım kuşağı). Yoğun buzul aşındırma şekilleri taşır.'
  },
  {
    id: 'd5',
    category: 'daglar',
    ad: 'Cilo Dağı',
    x: 920,
    y: 310,
    detay: 'Hakkari il sınırlarında bulunur, Türkiye’nin en yüksek ikinci zirvesidir (Reşko zirvesi).',
    kpssNotu: 'Kıvrım kökenlidir ve Türkiye’nin en büyük güncel vadi buzulunu (Uludoruk) barındırır.'
  },
  {
    id: 'd6',
    category: 'daglar',
    ad: 'Yunt Dağı',
    x: 120,
    y: 230,
    detay: 'Ege Bölgesi’nde İzmir-Manisa arasında yer alan kırık dağ grubudur.',
    kpssNotu: 'Kırıklı yapıdadır (Horst). Ege’deki Horst-Graben sistemine örnektir.'
  },
  {
    id: 'a1',
    category: 'akarsular',
    ad: 'Kızılırmak',
    x: 520,
    y: 100,
    detay: 'Sivas Kızıldağ’dan doğup Karadeniz’e dökülen, Türkiye sınırları içerisindeki en uzun nehirdir.',
    kpssNotu: 'Bafra Delta Ovası’nı oluşturur. Su potansiyeli yüksek olup üzerinde çok sayıda baraj kurulu.'
  },
  {
    id: 'a2',
    category: 'akarsular',
    ad: 'Fırat Nehri',
    x: 740,
    y: 280,
    detay: 'Erzurum-Erzincan’dan doğan kolların birleşmesiyle oluşan, Basra Körfezi’ne dökülen nehir.',
    kpssNotu: 'Keban, Karakaya ve Atatürk Barajları bu nehir üzerindedir. GAP kapsamındaki ana hayat damarıdır.'
  },
  {
    id: 'a3',
    category: 'akarsular',
    ad: 'Dicle Nehri',
    x: 820,
    y: 290,
    detay: 'Doğu Anadolu’dan doğup Irak topraklarına geçen ve Fırat ile birleşip denize dökülen nehir.',
    kpssNotu: 'Üzerinde Ilısu Barajı (Veysel Eroğlu) yer alır. Basra Körfezi’ne dökülerek açık havza özelliği taşır.'
  },
  {
    id: 'a4',
    category: 'akarsular',
    ad: 'Meriç Nehri',
    x: 60,
    y: 90,
    detay: 'Bulgaristan’dan doğup Edirne üzerinden Ege Denizi’ne dökülen sınır nehrimizdir.',
    kpssNotu: 'Yunanistan ile doğal sınırımızı çizer. Sık sık taşkın yapmasıyla ünlüdür.'
  },
  {
    id: 'p1',
    category: 'platolar',
    ad: 'Teke Platosu',
    x: 270,
    y: 310,
    detay: 'Antalya’nın batısında yer alan karstik yapılı platodur.',
    kpssNotu: 'Karstik oluşumludur. Nüfus kıl keçisi yetiştiriciliği nedeniyle seyrektir.'
  },
  {
    id: 'p2',
    category: 'platolar',
    ad: 'Taşeli Platosu',
    x: 390,
    y: 330,
    detay: 'Antalya ile Mersin arasında yer alan engebeli karstik platodur.',
    kpssNotu: 'Teke Platosu gibi karstik aşınım yüzeyidir, nüfus ve tarım çok sınırlıdır.'
  },
  {
    id: 'p3',
    category: 'platolar',
    ad: 'Ardahan Platosu',
    x: 860,
    y: 115,
    detay: 'Doğu Anadolu Bölgesi’nin kuzeydoğusunda yer alan yüksek lav düzlüğü platosudur.',
    kpssNotu: 'Lav örtüsü (volkanik) kökenlidir. Yaz yağışları nedeniyle gür çayırlar bulunur, büyükbaş hayvancılık yapılır.'
  },
  {
    id: 'p4',
    category: 'platolar',
    ad: 'Çatalca-Kocaeli Platosu',
    x: 180,
    y: 100,
    detay: 'Marmara Bölgesi’nde İstanbul ve Kocaeli illerini kapsayan alçak platodur.',
    kpssNotu: 'Aşınım düzlüğü kökenlidir. Türkiye’nin en alçak, en gelişmiş, en yoğun nüfuslu ve sanayileşmiş platosudur.'
  }
] as const;
