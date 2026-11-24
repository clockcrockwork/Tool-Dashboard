/** 見本データ (prototype `renderVals()` の wd). Replaced by the adapter in P4. */
import type { WxIcon } from './weather';

/** 朝・昼・夜: [label, icon, °C]. */
export const SAMPLE_PARTS: readonly (readonly [string, WxIcon, number])[] = [['朝', 'sun', 12], ['昼', 'cloud', 21], ['夜', 'rain', 14]];
export const SAMPLE_HUM = '58%';
/** 3時間ごと 8枠: [icon, °C]. */
export const SAMPLE_HOURS: readonly (readonly [WxIcon, number])[] = [['cloud', 20], ['cloud', 18], ['rain', 16], ['rain', 14], ['cloud', 13], ['moon', 12], ['sun', 13], ['sun', 17]];
/** 週間 7日: [icon, 最高, 最低]. */
export const SAMPLE_WEEK: readonly (readonly [WxIcon, number, number])[] = [['cloud', 21, 12], ['rain', 17, 11], ['sun', 19, 9], ['sun', 20, 10], ['cloud', 18, 11], ['rain', 15, 10], ['sun', 18, 8]];
