import React, { useEffect } from 'react';

function extractText(children) {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  return '';
}

export default function Head({ children }) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;
      if (child.type === 'title') {
        const title = extractText(child.props.children).trim();
        if (title) {
          document.title = title;
        }
      }
    });
  }, [children]);

  return null;
}
