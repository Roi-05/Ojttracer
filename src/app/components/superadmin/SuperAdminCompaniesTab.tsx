import { useState, useMemo } from "react";
import { Search, Building2, CheckCircle, Clock, MapPin, Mail, ExternalLink } from "lucide-react";
import { Input } from "../ui/input";
import { AdminCompany } from "../../hooks/useAdminData";

interface SuperAdminCompaniesTabProps {
  companies: AdminCompany[];
}

export function SuperAdminCompaniesTab({ companies }: SuperAdminCompaniesTabProps) {
  const [search, setSearch] = useState("");
  const [moaFilter, setMoaFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (moaFilter !== "ALL") {
        if (moaFilter === "active" && c.moaStatus !== "active") return false;
        if (moaFilter === "pending" && c.moaStatus === "active") return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchInd = c.industry?.toLowerCase().includes(q);
        const matchLoc = c.location?.toLowerCase().includes(q);
        if (!matchName && !matchInd && !matchLoc) return false;
      }
      return true;
    });
  }, [companies, moaFilter, search]);

  return (
    <div className="space-y-4">
      {/* Controls & Filter bar */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by company name, industry, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium mr-1">MOA:</span>
            {["ALL", "active", "pending"].map((m) => (
              <button
                key={m}
                onClick={() => setMoaFilter(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  moaFilter === m
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {m === "ALL" ? "All Companies" : m === "active" ? "Accredited (Active)" : "Pending MOA"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">
            Displaying {filtered.length} of {companies.length} partner host establishments
          </p>
          <span className="text-[11px] text-muted-foreground">University-wide partnerships</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold text-sm text-foreground">No companies found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Industry</th>
                  <th className="py-3 px-4">Address / Location</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">MOA Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground text-sm leading-tight">{c.name}</div>
                      {c.signedMoaUrl && (
                        <a
                          href={c.signedMoaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-0.5"
                        >
                          View Signed MOA <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground font-medium">
                      {c.industry || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground max-w-[200px] truncate">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                        <span className="truncate">{c.location || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-foreground">{c.contactPerson || c.hrContact || "—"}</p>
                      {c.hrEmail && (
                        <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground/50" /> {c.hrEmail}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                        c.moaStatus === "active" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                        "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}>
                        {c.moaStatus === "active" ? "Active (Accredited)" : "Pending MOA"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

