export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          level: number
          xp: number
          title: string | null
          created_at: string
        }
        Insert: { /* ... */ }
        Update: { /* ... */ }
      }
      // other tables to be generated
    }
  }
}
