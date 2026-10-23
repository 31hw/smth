import React from 'react';
import { createUseStyles } from 'react-jss';

const useStyles = createUseStyles({
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  item: {
    padding: '8px 0',
    borderBottom: '1px solid var(--text-color-quinary)',
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  link: {
    color: 'var(--primary-color)',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    '&:hover': {
      textDecoration: 'underline',
    },
  },
});

const BLOG_ITEMS = [
  { title: 'Roblox Official Blog & Newsroom', url: 'https://corp.roblox.com/newsroom' },
  { title: 'Roblox Developer Forum Announcements', url: 'https://devforum.roblox.com/c/announcements/36' },
  { title: 'Community Safety & Civility Updates', url: 'https://en.help.roblox.com/' },
];

const BlogNews = () => {
  const s = useStyles();
  return (
    <ul className={s.list}>
      {BLOG_ITEMS.map((item) => (
        <li className={s.item} key={item.url}>
          <a className={s.link} href={item.url} target="_blank" rel="noreferrer">
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  );
};

export default BlogNews;
