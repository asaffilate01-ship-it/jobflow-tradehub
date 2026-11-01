/** A successful dispatch request is not evidence of email/SMS delivery. */
export type ChannelResult = { channel: string; success: boolean; error?: string };

export function summarizeDispatch(results: readonly ChannelResult[]): {
  success: boolean;
  failedChannels: string[];
  acceptedChannels: string[];
} {
  const failedChannels = results.filter(result => !result.success).map(result => result.channel);
  const acceptedChannels = results.filter(result => result.success).map(result => result.channel);
  return { success: failedChannels.length === 0, failedChannels, acceptedChannels };
}
