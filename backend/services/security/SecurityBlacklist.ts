// /backend/services/security/SecurityBlacklist.ts
export type SecurityBlacklistEntry = {
  ip_address: string;
  user_id?: string | null;
  reason: string;
};

export async function logSecurityBlacklist(
  supabase: { from: (table: string) => { insert: (row: SecurityBlacklistEntry) => Promise<{ error?: { message: string } | null }> } },
  entry: SecurityBlacklistEntry
): Promise<void> {
  const { error } = await supabase.from('security_blacklist').insert(entry);
  if (error) {
    throw new Error(`Failed to write security_blacklist: ${error.message}`);
  }
}
