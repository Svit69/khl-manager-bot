import { writeFile } from 'node:fs/promises';

export class RosterExpansionReportWriter {
  async writeReport(entries) {
    const headers = ['Команда из списка', 'Статус в игре', 'Игрок', 'Дата рождения', 'Позиции', 'ОБЩ', 'Потенциал', 'Характеристики', 'Статистика', 'Контракт по сезонам, млн руб', 'Статус зарплаты', 'Срок подтвержден', 'Тип подтвержден', 'Карьера КХЛ полная', 'Источники', 'Примечания'];
    const statusLabels = { estimated: 'Игровая оценка', reported: 'Опубликовано в СМИ', confirmed: 'Подтверждено клубом' };
    const rows = entries.map(({ player, contract, research }) => {
      const stats = research.stats || {};
      const statistics = `${stats.season || '-'} ${stats.league || '-'}: ${stats.games ?? '-'} И, ${stats.goals ?? '-'} Г, ${stats.assists ?? '-'} П${stats.savePercentage != null ? `, ${stats.savePercentage} ОБ%` : ''}${stats.gaa != null ? `, ${stats.gaa} КН` : ''}`;
      return [player.team, player.status === 'freeAgent' ? 'Свободный агент' : 'В клубе', `${player.firstName} ${player.lastName}`, player.birthDate, player.positions.join(', '),
        Math.round(player.attributes.reduce((sum, value) => sum + value, 0) / 5), player.potential, player.attributes.join(' / '), statistics,
        contract.salaries.map(([season, salary]) => `${season}: ${salary}`).join('; ') || 'Нет контракта', player.status === 'freeAgent' ? 'Нет контракта' : statusLabels[contract.salaryStatus],
        contract.contractUntilConfirmed ? 'Да' : 'Игровая оценка', contract.contractTypeStatus === 'confirmed' ? 'Да' : 'Игровая оценка',
        player.careerCountsComplete ? 'Да' : 'Нет, подтвержденный минимум', research.sources.join(' '), research.notes || ''];
    });
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\r\n');
    const markdownRows = [headers, headers.map(() => '---'), ...rows];
    const introduction = '# Дополнение составов: 106 игроков\n\nПроверка источников: 2026-11-02. Позиции и даты рождения взяты из профилей и официальных составов. ОБЩ, потенциал и характеристики - игровые оценки с учетом уровня лиги, возраста, роли и доступной результативности. Статистика источников является снимком и может отставать от последнего матча. Отсутствующие показатели обозначены прочерком.\n\nКонтракты добавлены с 2026/2027. Неопубликованные оклады, неизвестный срок (один сезон) и неподтвержденный тип контракта назначены для игры и отдельно помечены. Сообщения СМИ не являются официальным раскрытием оклада клубом. Бонусы в зарплату не включены. Пробное соглашение Жеренко не выдается за подтвержденный полноценный контракт. Полные карьерные счетчики КХЛ внесены только при наличии данных; иначе указан подтвержденный минимум, не все матчи карьеры.\n\nХарактеристики полевых: бросок / скорость / физика / защита / скилл. Вратарей: реакция / позиционирование / атлетизм / контроль шайбы / психология.\n\n';
    await writeFile('reports/roster-expansion.csv', '\uFEFF' + csv, 'utf8');
    await writeFile('reports/roster-expansion.md', introduction + markdownRows.map(row => `| ${row.map(value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')).join(' | ')} |`).join('\n') + '\n', 'utf8');
  }
}
