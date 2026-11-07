import { useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import getFlag from "../../../lib/getFlag";
import { getRoles, getRolesetMembers } from "../../../services/groups";
import BcOverlay from "../../bcOverlay";
import GenericPagination from "../../genericPagination";
import PlayerImage from "../../playerImage";
import Link from "../../link";

const useStyles = createUseStyles({
  select: {
    float: 'right',
  },
  membersRow: {
    minHeight: '174px',
  },
})

const MembersRow = props => {
  const { groupId } = props;
  const [roles, setRoles] = useState(null);
  const [members, setMembers] = useState(null);
  const [page, setPage] = useState(1);
  const asyncRoleId = useRef({ id: 0 });
  const limit = getFlag('groupsPageMemberCountLimit', 10);

  const loadMembers = (id, cursor) => {
    asyncRoleId.current.id = id;
    getRolesetMembers({
      groupId,
      roleSetId: id,
      cursor: cursor,
      limit,
      sortOrder: 'desc',
    }).then(d => {
      if (asyncRoleId.current.id !== id) return
      setMembers(d);
      if (cursor === null) {
        setPage(1);
      }
    });
  }

  useEffect(() => {
    getRoles({ groupId }).then(r => {
      const sorted = (r || []).sort((a, b) => (a.rank > b.rank ? 1 : -1));
      const nonGuestRoles = sorted.filter(v => v.rank > 0);
      const displayRoles = nonGuestRoles.length > 0 ? nonGuestRoles : sorted;
      setRoles(displayRoles);
      const memberRole = displayRoles[0];
      if (!memberRole) return;
      asyncRoleId.current.id = memberRole.id;
      getRolesetMembers({
        groupId,
        roleSetId: memberRole.id,
        limit,
        cursor: null,
        sortOrder: 'Desc',
      }).then(setMembers);
    });
  }, [groupId]);

  const s = useStyles();

  // conditionals
  const canPaginate = members && (members.nextPageCursor || members.previousPageCursor);

  if (!roles) return null;
  return <div className='row'>
    <div className='col-12 pe-0'>
      <select className={s.select} onChange={(e) => {
        const id = parseInt(e.currentTarget.value, 10);
        loadMembers(id, null);
      }}>
        {roles.map(v => {
          return <option key={v.id} value={v.id}>{v.name} ({v.memberCount ?? 0})</option>
        })}
      </select>
    </div>
    <div className='col-12'>
      <div className={'row ' + s.membersRow}>
        {
          members && members.data && members.data.map(v => {
            const uid = v.user?.userId ?? v.userId;
            const uname = v.user?.username ?? v.username;
            return <div className='col-2' key={uid}>
              <Link href={`/users/${uid}/profile`}>
                <a>
                  <PlayerImage id={uid} name={uname} />
                  <p className='mb-0 text-left font-size-14 text-truncate'>{uname}</p>
                </a>
              </Link>
            </div>
          })
        }
      </div>
      <div className='row'>
        <div className='col-12 col-lg-6 mx-auto mt-4'>
          {canPaginate ? <GenericPagination page={page} onClick={(mode) => {
            return e => {
              e.preventDefault();
              if (mode === 1) {
                if (!members.nextPageCursor) return;
                loadMembers(asyncRoleId.current.id, members.nextPageCursor);
                setPage(page + 1);
              } else if (mode === -1) {
                if (!members.previousPageCursor) return;
                loadMembers(asyncRoleId.current.id, members.previousPageCursor);
                setPage(page - 1);
              }
            }
          }} /> : null}
        </div>
      </div>
    </div>
  </div>
}

export default MembersRow;