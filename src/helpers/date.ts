import { dayjs } from '@/config/dayjs';
import { APP_TIMEZONE } from '@/config/locale';

/** Offset fixo de Brasília. O Brasil não adota mais horário de verão. */
const BRASILIA_OFFSET = '-03:00';

/**
 * Monta o `startsAt` canônico a partir dos campos do formulário.
 * `2026-10-15` + `19:30` → `2026-10-15T19:30:00-03:00`.
 */
export function toStartsAt(date: string, time: string): string {
  return `${date}T${time.length === 5 ? `${time}:00` : time}${BRASILIA_OFFSET}`;
}

/** Caminho inverso: quebra o `startsAt` nos dois campos do formulário. */
export function fromStartsAt(startsAt: string): { date: string; time: string } {
  const parsed = dayjs(startsAt).tz(APP_TIMEZONE);
  return {
    date: parsed.format('YYYY-MM-DD'),
    time: parsed.format('HH:mm'),
  };
}

/** Ex.: "quinta-feira, 15 de outubro de 2026". */
export function formatFullDate(startsAt: string): string {
  return dayjs(startsAt).tz(APP_TIMEZONE).format('dddd, D [de] MMMM [de] YYYY');
}

/** Ex.: "15 out 2026". */
export function formatShortDate(startsAt: string): string {
  return dayjs(startsAt).tz(APP_TIMEZONE).format('DD MMM YYYY');
}

/** Ex.: "19:30". */
export function formatTime(startsAt: string): string {
  return dayjs(startsAt).tz(APP_TIMEZONE).format('HH:mm');
}

/** Ex.: "19:30 – 21:30". */
export function formatTimeRange(startsAt: string, durationMinutes: number): string {
  const start = dayjs(startsAt).tz(APP_TIMEZONE);
  return `${start.format('HH:mm')} – ${start.add(durationMinutes, 'minute').format('HH:mm')}`;
}

/** Ex.: "em 12 dias" / "há 3 meses". */
export function formatRelative(millisOrIso: number | string): string {
  return dayjs(millisOrIso).tz(APP_TIMEZONE).fromNow();
}

/** `true` enquanto o encontro ainda não começou, no relógio de Brasília. */
export function isUpcoming(startsAt: string): boolean {
  return dayjs(startsAt).isSameOrAfter(dayjs());
}

/** Início do dia de hoje em Brasília, já no formato canônico de comparação. */
export function todayStartsAtBoundary(): string {
  return `${dayjs().tz(APP_TIMEZONE).format('YYYY-MM-DD')}T00:00:00${BRASILIA_OFFSET}`;
}
