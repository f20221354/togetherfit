import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT_EMAIL, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service · togetherfit",
  description: "The rules for using togetherfit.",
};

export default function TermsPage() {
  const mail = <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>;
  return (
    <LegalPage title="Terms of Service">
      <section>
        <p>
          These terms are an agreement between you and togetherfit. By creating an account or using the app, you
          agree to them and to our <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t
          use togetherfit.
        </p>
      </section>

      <section>
        <h2>1. Who can use togetherfit</h2>
        <p>
          You must be at least 18 years old and able to enter a binding agreement. Give accurate information, keep
          your password and email account secure, and tell us at {mail} if you think someone else has accessed your
          account. One person, one account.
        </p>
      </section>

      <section>
        <h2>2. Not medical advice</h2>
        <p>
          togetherfit offers general wellness features: posture and gaze reminders, workouts, breathing exercises,
          sleep and light guidance, and an AI Coach. None of this is medical advice, diagnosis or treatment, and AI
          Coach answers can be wrong. Talk to a doctor before starting a new exercise programme, especially if you
          have a health condition, and stop if you feel pain, dizziness or shortness of breath. If you are in crisis
          or having an emergency, contact local emergency services.
        </p>
      </section>

      <section>
        <h2>3. Meeting people in person</h2>
        <p>
          Find a Friend helps you meet real people for activities. We don&apos;t run background checks and we
          can&apos;t guarantee anyone&apos;s identity or behaviour. Meet in public places, tell someone where you&apos;re
          going, and trust your instincts. You are responsible for your own safety and for your interactions with
          other members. Use Block and Report if someone makes you uncomfortable.
        </p>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p>Don&apos;t use togetherfit to:</p>
        <ul>
          <li>harass, threaten, stalk, impersonate or discriminate against anyone;</li>
          <li>send spam, advertising, scams or sexual content;</li>
          <li>try to find out another member&apos;s exact location or personal details;</li>
          <li>break the law or encourage others to;</li>
          <li>access other accounts, probe or disrupt the service, or scrape it with automated tools.</li>
        </ul>
        <p>
          When someone reports you, the two of you are blocked from each other straight away. A single report never
          restricts your account. If several different members report you within 30 days, or after our team reviews a
          serious report, your account may be restricted: hidden from Find a Friend and unable to send requests or
          messages, for 7 days the first time, 30 days the second time, and permanently the third time. While
          restricted you can still sign in, see why, export your data and appeal by writing to {mail}. We may also
          remove content or close accounts for serious or repeated violations.
        </p>
      </section>

      <section>
        <h2>5. Your content</h2>
        <p>
          You own the messages and other content you post. You give togetherfit permission to store, process and
          display it only as needed to run the service for you and the people you share it with. You can delete
          your content by deleting your account.
        </p>
      </section>

      <section>
        <h2>6. The service</h2>
        <p>
          togetherfit is provided &quot;as is&quot;. We work to keep it available and secure, but we may change,
          suspend or discontinue features, and we don&apos;t promise it will be error-free or always available. Changes
          made while offline are saved to your account when you reconnect; if you edit the same data on two
          devices at once, the most recent edit is kept.
        </p>
      </section>

      <section>
        <h2>7. Liability</h2>
        <p>
          To the extent the law allows, togetherfit is not liable for indirect or consequential losses, for injuries
          from exercise or activities, or for the conduct of other members, online or offline. Nothing in these terms
          limits rights you have under applicable consumer protection law.
        </p>
      </section>

      <section>
        <h2>8. Ending your account</h2>
        <p>
          You can delete your account any time in <Link href="/settings">Settings → Your Data</Link>. We may end or
          suspend accounts that break these terms.
        </p>
      </section>

      <section>
        <h2>9. Changes and contact</h2>
        <p>
          We may update these terms; if a change matters, we will tell you before it takes effect, and continuing to
          use togetherfit means you accept it. These terms are governed by the laws of India. Questions or
          complaints: {mail}.
        </p>
      </section>
    </LegalPage>
  );
}
