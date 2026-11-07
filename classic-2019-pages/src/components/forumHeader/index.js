import Link from '../link';

const ForumHeader = (props) => (
  <div className="row">
    <div className="col-6">{props.children}</div>
    <div className="col-6">
      <p className="text-end fw-bold mb-0">
        <span>
          <Link href="/Forum/Default.aspx">
            <a className="normal">Home</a>
          </Link>
        </span>
        <span className="pe-1 ps-1">|</span>
        <span>
          <Link href="/Forum/MyForums.aspx">
            <a className="normal">MyForums</a>
          </Link>
        </span>
        <span className="pe-1 ps-1">|</span>
        <a
          className="normal"
          href="https://devforum.roblox.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          DevForum
        </a>
      </p>
    </div>
  </div>
);

export default ForumHeader;

export const ForumHeaderSubCategory = ({ cat, sub }) => (
  <ForumHeader>
    <p className="fw-bold mb-0">
      <Link href="/Forum/Default.aspx">
        <a>ROBLOX Forum</a>
      </Link>
      {' \u00BB '}
      <Link href="/Forum/Default.aspx">
        <a>{cat.name}</a>
      </Link>
      {' \u00BB '}
      <Link href={`/Forum/ShowForum.aspx?ForumID=${sub.id}`}>
        <a>{sub.name}</a>
      </Link>
    </p>
  </ForumHeader>
);
