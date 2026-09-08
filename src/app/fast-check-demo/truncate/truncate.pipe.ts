import { Pipe, PipeTransform } from '@angular/core';

export function truncate(value: string, limit: number, trail = '…'): string {
  const max = Math.max(0, Math.trunc(limit));
  if (value.length <= max) {
    return value;
  }
  return value.slice(0, max) + trail;
}

@Pipe({ name: 'truncate' })
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit: number, trail = '…'): string {
    return truncate(value, limit, trail);
  }
}
