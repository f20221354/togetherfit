import { getPool } from "@/lib/db";

/**
 * Everything the server stores about one user, for the data export (DPDP Act
 * right to access). Other people appear only by name and friend code, never
 * by email. Workouts, wellness and breathing data live in the browser and are
 * added to the export client-side.
 */
export async function exportAccountData(userId: string) {
  const pool = getPool();
  const q = async <T extends Record<string, unknown>>(sql: string) => (await pool.query<T>(sql, [userId])).rows;

  const [profile, connections, messages, searches, groups, groupMessages, activities, milestones, winterArc, sessions, photo, verification, reportsMade, appState] =
    await Promise.all([
      q(`select name, email, code, created_at, email_verified_at, onboarding_completed_at, wellness_setup,
                gender, gender_changed_at, match_preference, verified_only, photo_on_radar, verified_at
         from app_users where id = $1`),
      q(`select c.status, c.source, c.created_at, case when c.requester_id = $1 then 'sent' else 'received' end as direction,
                u.name as other_name, u.code as other_code
         from connections c join app_users u on u.id = case when c.requester_id = $1 then c.receiver_id else c.requester_id end
         where c.requester_id = $1 or c.receiver_id = $1 order by c.created_at`),
      q(`select m.created_at, m.type, m.body, m.reaction, case when m.sender_id = $1 then 'me' else u.name end as sender,
                o.name as conversation_with
         from messages m
         join connections c on c.id = m.connection_id
         join app_users u on u.id = m.sender_id
         join app_users o on o.id = case when c.requester_id = $1 then c.receiver_id else c.requester_id end
         where c.requester_id = $1 or c.receiver_id = $1 order by m.created_at`),
      q(`select sport, area_label, area_lat, area_lng, radius_km, mode, start_time, status, created_at
         from activity_intents where user_id = $1 order by created_at`),
      q(`select g.name, g.sport, g.mode, g.start_time, g.status, gm.joined_at, g.created_by = $1 as created_by_me
         from group_members gm join groups g on g.id = gm.group_id where gm.user_id = $1 order by gm.joined_at`),
      q(`select g.name as group_name, m.body, m.created_at
         from messages m join groups g on g.id = m.group_id where m.sender_id = $1 order by m.created_at`),
      q(`select sport, completed_at from activity_sessions where user_id = $1 order by completed_at`),
      q(`select key, sport, achieved_at from milestones where user_id = $1 order by achieved_at`),
      q(`select e.event, e.props, e.occurred_at from winter_arc_events e
         join app_users u on u.email = e.user_email where u.id = $1 order by e.occurred_at`),
      q(`select created_at, last_seen_at, expires_at, user_agent, ip from auth_sessions where user_id = $1 order by created_at`),
      q(`select created_at, encode(large, 'base64') as webp_base64 from profile_photos where user_id = $1`),
      q(`select created_at, provider, status, liveness_confidence, similarity from verification_attempts where user_id = $1 order by created_at`),
      q(`select r.created_at, r.category, r.reason, u.name as reported_name from reports r
         join app_users u on u.id = r.reported_id where r.reporter_id = $1 order by r.created_at`),
      q(`select store, data, revision, updated_at from user_app_state where user_id = $1 order by store`),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: profile[0] ?? null,
    connections,
    messages,
    findAFriendSearches: searches,
    groups,
    groupMessagesSent: groupMessages,
    activities,
    milestones,
    winterArcEvents: winterArc,
    signedInDevices: sessions,
    profilePhoto: photo[0] ?? null,
    // Scores and decisions only: selfies are never stored.
    verificationAttempts: verification,
    reportsYouMade: reportsMade,
    // Wellness, workouts and goals, breathing and settings, as synced from your devices.
    appData: appState,
  };
}

/**
 * Permanently deletes the account. Connections, messages, searches, groups
 * the user created, memberships, activities, milestones and sessions go with
 * it via `on delete cascade`; the rows keyed by email are removed here.
 */
export async function deleteAccount(userId: string, email: string): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("delete from winter_arc_events where user_email = $1", [email]);
    await client.query("delete from auth_otps where email = $1", [email]);
    await client.query("delete from rate_limits where key = any($1)", [[`login:email:${email}`, `otp:email:${email}`]]);
    await client.query("delete from app_users where id = $1", [userId]);
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
