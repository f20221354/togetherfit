/**
 * The mutual comfort rule, as SQL over two `app_users` aliases. Two people
 * may see each other only if each one's preference fits the other's gender,
 * and "verified only" (if either side turned it on) is met by both.
 * Used by the Find a Friend radar, radar requests and photo permissions, so
 * the rule lives in one place.
 */
function fits(prefAlias: string, genderAlias: string): string {
  return `(${prefAlias}.match_preference = 'anyone'
    or (${prefAlias}.match_preference = 'women' and ${genderAlias}.gender = 'woman')
    or (${prefAlias}.match_preference = 'men' and ${genderAlias}.gender = 'man'))`;
}

export function mutualMatchSql(a: string, b: string): string {
  return `(${fits(a, b)} and ${fits(b, a)}
    and (not ${a}.verified_only or ${b}.verified_at is not null)
    and (not ${b}.verified_only or ${a}.verified_at is not null))`;
}
