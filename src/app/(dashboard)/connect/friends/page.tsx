import { PageHeader } from "@/components/shell/PageHeader";
import { RealFriendNetwork } from "@/components/connect/RealFriendNetwork";

export default function ConnectFriendsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader icon="people.friends" title="Friends" subtitle="Your friends, and requests you've received or sent." />
      <RealFriendNetwork />
    </div>
  );
}
