import {
  LayoutDashboard,
  Store,
  Link2,
  ArrowLeftRight,
  Wallet,
  BarChart3,
  UserCircle,
  Megaphone,
  Package,
  BadgeCheck,
  Users,
  Banknote,
  ShieldCheck,
  ScrollText,
  Coins,
  Ticket,
  Sparkles,
  Network,
  Plug,
  UserCog,
  Contact,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from './types';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** shown in the mobile bottom bar (max 4 + "More") */
  primary?: boolean;
  exact?: boolean;
}

/** Route map per role. The backend is authoritative for permissions; this only shapes navigation. */
export const navByRole: Record<Role, NavItem[]> = {
  AFFILIATE: [
    { href: '/affiliate', label: 'Home', icon: LayoutDashboard, primary: true, exact: true },
    { href: '/marketplace', label: 'Marketplace', icon: Store, primary: true },
    { href: '/affiliate/links', label: 'My links', icon: Link2, primary: true },
    { href: '/affiliate/wallet', label: 'Wallet', icon: Wallet, primary: true },
    { href: '/affiliate/coupons', label: 'Coupons', icon: Ticket },
    { href: '/affiliate/conversions', label: 'Conversions', icon: ArrowLeftRight },
    { href: '/affiliate/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/affiliate/creator', label: 'Creator profile', icon: Sparkles },
    { href: '/affiliate/creator-payments', label: 'Creator payments', icon: Banknote },
    { href: '/affiliate/profile', label: 'Profile', icon: UserCircle },
  ],
  BUSINESS: [
    { href: '/business', label: 'Home', icon: LayoutDashboard, primary: true, exact: true },
    { href: '/business/campaigns', label: 'Campaigns', icon: Megaphone, primary: true },
    { href: '/business/conversions', label: 'Conversions', icon: ArrowLeftRight, primary: true },
    { href: '/business/programmes', label: 'Programmes', icon: Network },
    { href: '/business/integrations', label: 'Integrations', icon: Plug },
    { href: '/business/crm', label: 'Affiliate CRM', icon: Contact },
    { href: '/business/team', label: 'Team', icon: UserCog },
    { href: '/business/creators', label: 'Find creators', icon: Sparkles },
    { href: '/business/products', label: 'Products', icon: Package },
    { href: '/business/analytics', label: 'Analytics', icon: BarChart3, primary: true },
    { href: '/business/verification', label: 'Verification', icon: BadgeCheck },
    { href: '/business/profile', label: 'Business profile', icon: UserCircle },
    { href: '/marketplace', label: 'Marketplace', icon: Store },
  ],
  ADMIN: [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard, primary: true, exact: true },
    { href: '/admin/businesses', label: 'Verification', icon: BadgeCheck, primary: true },
    { href: '/admin/campaigns', label: 'Campaigns', icon: ShieldCheck, primary: true },
    { href: '/admin/withdrawals', label: 'Withdrawals', icon: Banknote, primary: true },
    { href: '/admin/commissions', label: 'Commissions', icon: Coins },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
    { href: '/marketplace', label: 'Marketplace', icon: Store },
  ],
};

export function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');
}
