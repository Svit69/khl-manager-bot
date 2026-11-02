const confirmedTypes = {
  'Дамир Бритиков': 'two-way', 'Асанали Саркенов': 'two-way', 'Абзал Алибек': 'two-way',
  'Максим Мальцев': 'two-way', 'Виктор Андрейченко': 'two-way', 'Артём Вильчинский': 'two-way',
  'Александр Мирзабалаев': 'two-way', 'Даниил Лазутин': 'two-way', 'Денис Габдрахманов': 'two-way',
  'Иван Рябов': 'two-way', 'Амир Гизятов': 'three-way', 'Ян Мельников': 'three-way',
};

export const applyRosterResearchCorrections = record => {
  const corrected = { ...record };
  if (['Остап Сафин', 'Иван Ежов'].includes(record.name)) corrected.status = 'freeAgent';
  if (confirmedTypes[record.name]) {
    corrected.contractType = confirmedTypes[record.name];
    corrected.contractTypeStatus = 'confirmed';
  }
  if (record.name === 'Абзал Алибек') {
    corrected.positions = ['ЦТР'];
    corrected.positionStatus = 'secondary-source';
    corrected.sources = [...record.sources, 'https://mail.marqueur.com/hockey/stats/nhl/player/Abzal-Alibek-71818'];
    corrected.notes += ' В EP указан только нападающий (F); игровая позиция ЦТР взята из Markerzone. Официальный клуб подтверждает амплуа нападающего.';
  }
  if (record.name === 'Глеб Бурлака') {
    corrected.sources = [...record.sources, 'https://shl.fhr.ru/players/burlaka-gleb-alekseevich-400411/'];
    corrected.notes += ' Дата 20.02.2007 дополнительно подтверждена официальным профилем ФХР.';
  }
  if (record.loanUntil || ['Максим Кровяков', 'Вячеслав Бутеец'].includes(record.name)) {
    corrected.parentContractUntil = record.contractUntil;
    corrected.contractUntil = record.loanUntil || null;
    corrected.notes += ' В игре срок соглашения текущего клуба ограничен арендой; если ее срок не опубликован, назначен один оценочный сезон. Родительский контракт сохранен отдельно в исследовании.';
  }
  return corrected;
};
