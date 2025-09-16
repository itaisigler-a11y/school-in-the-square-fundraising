// Re-export the enhanced auth context
// This maintains backward compatibility while using the new RBAC system
export { useAuth, usePermissions } from "@/lib/auth-context";
