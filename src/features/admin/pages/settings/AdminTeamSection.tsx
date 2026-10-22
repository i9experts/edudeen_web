import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

/**
 * Admin team — new admin accounts are staff invitations now (Collaboration). The old "add an admin with a
 * temporary password" endpoint was removed: it created owner-level accounts with no second step.
 */
export function AdminTeamSection() {
  return (
    <div className="bg-white border border-bone rounded-xl px-4 sm:px-[26px] py-6">
      <p className="text-[15px] font-semibold text-charcoal mb-1">Add a team member</p>
      <p className="text-[12.5px] text-slate mb-5 max-w-[60ch]">
        People are added by invitation, with a role that limits what they can do and a sign-in code sent to their email every time.
        Only the owner can invite.
      </p>
      <Link to="/admin/collaboration" className="inline-flex items-center gap-1.5 px-4 py-[9px] rounded-lg bg-brand-orange text-white text-[13px] font-semibold no-underline">
        <UserPlus size={13} /> Open Collaboration
      </Link>
    </div>
  );
}
