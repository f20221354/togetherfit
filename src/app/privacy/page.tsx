import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT_EMAIL, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · togetherfit",
  description: "What togetherfit collects, why, who it is shared with, and your rights.",
};

export default function PrivacyPage() {
  const mail = <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>;
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <p>
          togetherfit (&quot;we&quot;, &quot;us&quot;) is a wellness app for posture, movement, recovery and finding
          real people to be active with. This policy explains what personal data we collect, why, who we share it
          with, and the rights you have, including under India&apos;s Digital Personal Data Protection Act, 2023
          (&quot;DPDP Act&quot;). For the purposes of that Act, togetherfit is the Data Fiduciary for your data.
        </p>
      </section>

      <section>
        <h2>1. What we collect</h2>
        <ul>
          <li>
            <b>Account:</b> your name, email address, a password (stored only as a one-way scrypt hash, never in
            readable form) and a friend code we generate for you.
          </li>
          <li>
            <b>Profile photo (optional):</b> re-saved by our servers so that hidden data in the original file, such as
            the GPS location where it was taken, is removed. Only your accepted friends see it, unless you turn on
            &quot;Show my photo on Find a Friend&quot;. It&apos;s checked automatically for a clear face and
            inappropriate content.
          </li>
          <li>
            <b>Gender and matching preference (optional):</b> used only so that matching respects both people&apos;s
            comfort preferences. Your gender is never shown to other members.
          </li>
          <li>
            <b>Verification (optional):</b> to earn the ✓ badge you take a live selfie, which is compared
            automatically with your profile photo. The selfie is deleted immediately after the check; we keep only
            the result, the date and the match scores. We never use it to guess your gender or anything else.
          </li>
          <li>
            <b>Wellness setup:</b> the answers you give during onboarding, such as wake and sleep times, work hours,
            preferred walk length and whether you allow the camera.
          </li>
          <li>
            <b>Find a Friend location:</b> when you start a search, the area you choose, rounded on our server to
            roughly a few hundred metres before it is stored. We never store your exact position. Other people see
            only an approximate distance (for example &quot;~2 km away&quot;), never your location.
          </li>
          <li>
            <b>Social activity:</b> friend requests, connections, 1:1 and group chat messages, groups you create or
            join, activities you log and milestones you unlock. Celebration cards in chat are deleted automatically
            after 24 hours.
          </li>
          <li>
            <b>Safety reports:</b> if you block or report someone, we keep a record of the report and the reason you
            give.
          </li>
          <li>
            <b>Security data:</b> for each signed-in device, the IP address, browser user agent and sign-in times;
            and short-lived counters used to stop password guessing and spam.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Data that never leaves your device</h2>
        <ul>
          <li>
            <b>Camera:</b> Posture &amp; Gaze Guard analyses your camera on your device, in the browser. Video and
            images are never recorded, stored or uploaded. Your browser downloads the face-landmark model file from
            Google&apos;s servers the first time you use it.
          </li>
          <li>
            <b>Workouts, wellness scores, breathing patterns and reminder settings</b> are saved to your account on
            our servers, so they follow you to a new phone or browser, and kept in your browser as a cache
            (separately for each account). They are included in your data download and deleted with your account.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Why we use it</h2>
        <ul>
          <li>To create and secure your account, including emailing one-time codes when you sign up, sign in or reset your password.</li>
          <li>To match you with nearby people for the same activity and time, and to deliver your messages.</li>
          <li>To show your progress, streaks and milestones.</li>
          <li>To keep the community safe: preventing abuse, acting on reports and blocking accounts that misuse the service.</li>
          <li>To answer AI Coach questions (see section 4).</li>
        </ul>
        <p>
          We use your data only for these purposes, on the basis of the consent you give when you create an account
          and use each feature. We do not sell your data and we do not use it for advertising.
        </p>
      </section>

      <section>
        <h2>4. Who we share it with</h2>
        <ul>
          <li><b>Other members:</b> your name and friend code are shown to people you connect with. Your email address is never shown to other members.</li>
          <li><b>Hosting and database providers</b> that run togetherfit and store its data on our behalf.</li>
          <li><b>Email delivery:</b> Google (Gmail) or Amazon Web Services (SES) send our one-time codes and account emails.</li>
          <li><b>Live notifications:</b> Ably delivers &quot;you have a new message&quot; signals to your open app, identified by your account id. They never contain the message text, which stays on our servers.</li>
          <li><b>Identity checks:</b> when automatic verification is enabled, your live selfie and profile photo are processed by Amazon Web Services (Amazon Rekognition) only to confirm they show the same real person, then deleted.</li>
          <li><b>AI Coach:</b> the question you type is sent to Groq, Inc. to generate an answer. Don&apos;t include personal details you don&apos;t want to share.</li>
          <li><b>Maps:</b> place searches are sent from our server to OpenStreetMap&apos;s Nominatim service, and your browser loads map tiles from OpenStreetMap, which sees your IP address.</li>
          <li><b>Legal requirements:</b> we may disclose data when required by law or a valid order from an authority.</li>
        </ul>
        <p>Some of these providers may process data outside India, subject to the DPDP Act.</p>
      </section>

      <section>
        <h2>5. How long we keep it</h2>
        <p>
          We keep your account data until you delete your account. One-time codes expire after 10 minutes, sessions
          after 30 days without use, and Find a Friend searches end when you stop them or when they expire. When you
          delete your account, your profile, connections, messages, searches, groups you created, activities and
          milestones are deleted permanently from our database.
        </p>
      </section>

      <section>
        <h2>6. Your rights</h2>
        <ul>
          <li><b>Access:</b> download a copy of your data any time from <Link href="/settings">Settings → Your Data</Link>.</li>
          <li><b>Erasure:</b> delete your account and its data from <Link href="/settings">Settings → Your Data</Link>.</li>
          <li><b>Correction:</b> ask us to correct inaccurate data by writing to {mail}.</li>
          <li><b>Withdraw consent:</b> stop using a feature, revoke camera access in your browser settings, or delete your account.</li>
          <li><b>Nominate:</b> you may nominate someone to exercise these rights on your behalf in case of death or incapacity, by writing to {mail}.</li>
          <li><b>Grievances:</b> write to {mail}. We aim to respond within 7 days. If you are not satisfied, you may complain to the Data Protection Board of India.</li>
        </ul>
      </section>

      <section>
        <h2>7. Security</h2>
        <p>
          Passwords are hashed with scrypt, sign-in requires a one-time code sent to your email, sessions use secure
          httpOnly cookies, and all traffic is encrypted with HTTPS. No system is perfectly secure; if we learn of a
          breach affecting your data, we will notify you and the Data Protection Board as the law requires.
        </p>
      </section>

      <section>
        <h2>8. Age</h2>
        <p>togetherfit is for people aged 18 and over. We do not knowingly collect data from children.</p>
      </section>

      <section>
        <h2>9. Changes</h2>
        <p>
          If we change this policy in a way that matters, we will tell you in the app or by email before the change
          takes effect. Questions: {mail}.
        </p>
      </section>
    </LegalPage>
  );
}
