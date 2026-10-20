/**
 * Tenant isolation utilities.
 *
 * company_id is stored on the User record.
 * - Platform Master Admin has role="admin" and company_id="__master__"
 * - All other users have a company_id set at registration
 *
 * Usage:
 *   const { companyId, tenantFilter, stampRecord } = useTenant();
 *
 *   // Filter a query:
 *  
 *
 *   // Stamp a new record before creating:
 *  
 */

import { useAuth } from "@/lib/AuthContext";

export const MASTER_ADMIN_COMPANY = "__master__";

/**
 * Returns true if this user is the platform master admin
 * (can see all companies' data).
 */
export function isMasterAdmin(user) {
  return user?.company_id === MASTER_ADMIN_COMPANY;
}

/**
 * React hook — returns tenant helpers for the current user.
 */
export function useTenant() {
  const { user } = useAuth();
  const companyId = user?.company_id || null;
  const master = isMasterAdmin(user);

  /**
   * Returns a filter object to pass to entity.filter({ ...tenantFilter() })
   * Master admin gets no filter (sees all data).
   */
  function tenantFilter(extra = {}) {
    if (master || !companyId) return extra;
    return { company_id: companyId, ...extra };
  }

  /**
   * Stamps a new record with company_id before create/update.
   */
  function stampRecord(data) {
    if (!companyId) return data;
    return { ...data, company_id: companyId };
  }

  return { companyId, tenantFilter, stampRecord, isMaster: master, user };
}