import { Loc } from './loc';

/** 비공개 모드: 플레이어 이름을 "플레이어 N"으로 치환(번호는 ID별로 고정). */
class AnonymizerClass {
  enabled = false;
  private numbers: ReadonlyMap<string, number> = new Map();

  /** 로그를 새로 열 때 그 세션의 플레이어 번호 맵을 넣어준다. */
  setNumbers(numbers: ReadonlyMap<string, number>): void {
    this.numbers = numbers;
  }

  labelFor(playerId: string | null | undefined): string | null {
    if (playerId == null) return null;
    const n = this.numbers.get(playerId);
    return n != null ? Loc.t('player_n', n) : null;
  }

  /** 비공개 모드면 플레이어 라벨로, 아니면 실제 이름으로. */
  display(realName: string, playerId: string | null | undefined): string {
    if (this.enabled) {
      const label = this.labelFor(playerId);
      if (label != null) return label;
    }
    return realName;
  }
}

export const Anonymizer = new AnonymizerClass();
