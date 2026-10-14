import type { RealtimeServerDriver } from "../types";

/** Nothing to push: browsers ask GET …/messages?since= every few seconds instead. */
export const pollDriver: RealtimeServerDriver = {
  mode: "poll",
  async publish() {},
  async clientConfig() {
    return { mode: "poll" };
  },
};
