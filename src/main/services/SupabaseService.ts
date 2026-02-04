// STUB: This file is replaced during the Open Source sync process.
// The real implementation handles encrypted cloud synchronization.
export class SupabaseService {
  constructor() {}
  async initialize() { console.log('Cloud Sync not available in Core Edition'); }
  async signIn() { return { error: 'Not available' }; }
  async signOut() { return { error: null }; }
  async uploadFile() { return null; }
  async downloadFile() { return null; }
}
export const supabaseService = new SupabaseService();
