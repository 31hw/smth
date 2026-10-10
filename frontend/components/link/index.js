import NextLink from 'next/link';

// ZekoroV2 page sources use the Pages Router's legacy pattern of placing an
// <a> element inside Link. Keep those exact page sources working on current
// Next.js while preserving their native anchor attributes and styling.
const Link = props => {
  return <NextLink legacyBehavior href={props.href}>
    {props.children}
  </NextLink>
}

export default Link;
