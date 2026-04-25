import { useState, useEffect, useCallback } from "react";
import { UserPlus, Check, X, Search, Loader2, Users, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import ScrollReveal from "@/components/ScrollReveal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
}

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
}

const Friends = () => {
  const { user } = useAuth();
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: rows } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    const list = (rows || []) as Friendship[];
    setFriendships(list);

    const otherIds = Array.from(
      new Set(list.map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id)))
    );
    if (otherIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, full_name, email")
        .in("id", otherIds);
      const map: Record<string, Profile> = {};
      (profs || []).forEach((p: any) => (map[p.id] = p));
      setProfiles(map);
    } else {
      setProfiles({});
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !user) return;
    setSearching(true);
    const q = query.trim().toLowerCase();
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, email")
      .or(`username.ilike.%${q}%,email.ilike.%${q}%`)
      .neq("id", user.id)
      .limit(10);
    setResults((data || []) as Profile[]);
    setSearching(false);
  };

  const sendRequest = async (addresseeId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: addresseeId, status: "pending" } as any);
    if (error) {
      toast({ title: "Couldn't send request", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Request sent" });
      load();
    }
  };

  const respond = async (id: string, accept: boolean) => {
    if (accept) {
      await supabase.from("friendships").update({ status: "accepted" } as any).eq("id", id);
    } else {
      await supabase.from("friendships").delete().eq("id", id);
    }
    load();
  };

  const removeFriend = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    load();
  };

  if (!user) return null;

  const accepted = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter((f) => f.status === "pending" && f.addressee_id === user.id);
  const outgoing = friendships.filter((f) => f.status === "pending" && f.requester_id === user.id);

  const otherId = (f: Friendship) => (f.requester_id === user.id ? f.addressee_id : f.requester_id);
  const label = (p?: Profile) =>
    p?.username ? `@${p.username}` : p?.full_name || p?.email || "Unknown";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <ScrollReveal>
            <h1 className="text-3xl font-bold text-foreground mb-2" style={{ lineHeight: "1.15" }}>
              Friends
            </h1>
            <p className="text-muted-foreground mb-6">Find study buddies and keep each other on streak.</p>
          </ScrollReveal>

          <ScrollReveal delay={60}>
            <form onSubmit={handleSearch} className="coffee-card p-4 mb-6 flex gap-2">
              <div className="flex items-center gap-2 flex-1 px-3 rounded-xl border border-border bg-background">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by username or email"
                  className="flex-1 py-2 bg-transparent outline-none text-sm text-foreground"
                />
              </div>
              <button type="submit" className="coffee-btn text-sm" disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </button>
            </form>
          </ScrollReveal>

          {results.length > 0 && (
            <ScrollReveal delay={80}>
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Search results
                </h2>
                <div className="space-y-2">
                  {results.map((p) => {
                    const existing = friendships.find(
                      (f) => f.requester_id === p.id || f.addressee_id === p.id
                    );
                    return (
                      <div key={p.id} className="coffee-card p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{label(p)}</p>
                          {p.full_name && p.username && (
                            <p className="text-xs text-muted-foreground">{p.full_name}</p>
                          )}
                        </div>
                        {existing ? (
                          <span className="text-xs text-muted-foreground">
                            {existing.status === "accepted" ? "Friends" : "Pending"}
                          </span>
                        ) : (
                          <button
                            onClick={() => sendRequest(p.id)}
                            className="coffee-btn text-sm flex items-center gap-1"
                          >
                            <UserPlus className="w-4 h-4" /> Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {incoming.length > 0 && (
                <section className="mb-6">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Incoming requests
                  </h2>
                  <div className="space-y-2">
                    {incoming.map((f) => (
                      <div key={f.id} className="coffee-card p-4 flex items-center justify-between">
                        <p className="font-medium text-foreground">{label(profiles[otherId(f)])}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => respond(f.id, true)}
                            className="coffee-btn text-sm flex items-center gap-1"
                          >
                            <Check className="w-4 h-4" /> Accept
                          </button>
                          <button
                            onClick={() => respond(f.id, false)}
                            className="coffee-btn-outline text-sm flex items-center gap-1"
                          >
                            <X className="w-4 h-4" /> Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {outgoing.length > 0 && (
                <section className="mb-6">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Sent requests
                  </h2>
                  <div className="space-y-2">
                    {outgoing.map((f) => (
                      <div key={f.id} className="coffee-card p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <p className="font-medium text-foreground">{label(profiles[otherId(f)])}</p>
                        </div>
                        <button
                          onClick={() => removeFriend(f.id)}
                          className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Your friends ({accepted.length})
                </h2>
                {accepted.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No friends yet</p>
                    <p className="text-sm mt-1">Search above to find study buddies.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accepted.map((f) => {
                      const p = profiles[otherId(f)];
                      return (
                        <div key={f.id} className="coffee-card p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{label(p)}</p>
                            {p?.full_name && p?.username && (
                              <p className="text-xs text-muted-foreground">{p.full_name}</p>
                            )}
                          </div>
                          <button
                            onClick={() => removeFriend(f.id)}
                            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Friends;
