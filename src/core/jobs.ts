import { Loc } from './loc';

/** ClassJob ID(1~43) 유효성·약어. 이름은 LocStrings(job.N), 아이콘은 public/jobs/job{id}.png. */
export interface Job {
  readonly id: number;
  readonly abbr: string;
}

const ABBRS = [
  'GLA', 'PGL', 'MRD', 'LNC', 'ARC', 'CNJ', 'THM', 'CRP', 'BSM', 'ARM',
  'GSM', 'LTW', 'WVR', 'ALC', 'CUL', 'MIN', 'BTN', 'FSH', 'PLD', 'MNK',
  'WAR', 'DRG', 'BRD', 'WHM', 'BLM', 'ACN', 'SMN', 'SCH', 'ROG', 'NIN',
  'MCH', 'DRK', 'AST', 'SAM', 'RDM', 'BLU', 'GNB', 'DNC', 'RPR', 'SGE',
  'VPR', 'PCT', 'BST',
];

const BY_ID: Record<number, Job> = {};
ABBRS.forEach((abbr, i) => {
  BY_ID[i + 1] = { id: i + 1, abbr };
});

export function getJob(id: number): Job | null {
  return BY_ID[id] ?? null;
}

/** 현재 언어의 직업 이름. */
export function jobDisplayName(id: number): string {
  return getJob(id) != null ? Loc.jobName(id) : `job ${id}`;
}
