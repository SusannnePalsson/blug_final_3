import { readFileSync } from "fs";

const accessListUrl = new URL("./access-list.json", import.meta.url);
const accessListPath = accessListUrl.pathname;

// Läs som text (stabilt)
const accessList = JSON.parse(readFileSync(accessListUrl, "utf8"));

console.log("ACL loaded access-list from:", accessListPath);

function normalizePath(p) {
  // "/users/" -> "/users"
  if (!p) return "/";
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

function matchPath(pattern, actualPath) {
  const p = normalizePath(pattern).split("/").filter(Boolean);
  const a = normalizePath(actualPath).split("/").filter(Boolean);
  if (p.length !== a.length) return false;

  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) continue;
    if (p[i] !== a[i]) return false;
  }
  return true;
}

export default function acl(req, res, next) {
  const method = String(req.method || "").toUpperCase();
  const path = normalizePath(req.path);
  const url = req.url;

  const userRoles = [];
  const sessionRole = req.session?.user?.role;

  // Roller som "får" testas
  userRoles.push(sessionRole ?? "anonymous");
  // Behåll stöd för access.roles=["*"]
  userRoles.push("*");

  // 1) Hitta route-match
  const matchedRoutes = accessList.filter((r) => matchPath(r.url, path));

  // 2) För varje match, se om nån access matchar method + role
  for (const route of matchedRoutes) {
    for (const access of route.accesses) {
      const methodAllowed = (access.methods || []).includes(method);
      const roleAllowed =
        (access.roles || []).includes("*") ||
        userRoles.some((r) => (access.roles || []).includes(r));

      if (methodAllowed && roleAllowed) {
        return next();
      }
    }
  }

  // DEBUG (bara när block)
  console.log("ACL BLOCK:", {
    method,
    path,
    url,
    sessionUser: req.session?.user ?? null,
    userRoles,
    matchedRouteUrls: matchedRoutes.map((r) => r.url),
    matchedRouteAccesses: matchedRoutes.map((r) => r.accesses),
    accessListPath,
  });

  return res.status(403).json({ message: "Access forbidden" });
}
