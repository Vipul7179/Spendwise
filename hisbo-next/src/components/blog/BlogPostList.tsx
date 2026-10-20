'use client';

import { useRef, useState } from 'react';
import BlogCard from './BlogCard';
import { BLOG_PAGE_SIZE, getPublishedBlogPosts } from '@/lib/blog';
import type { BlogCategory, BlogPost } from '@/types/blog';

interface BlogPostListProps {
  initialPosts: BlogPost[];
  total: number;
  categories: BlogCategory[];
  categoryId?: string;
  search?: string;
}

export default function BlogPostList({ initialPosts, total, categories, categoryId, search }: BlogPostListProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialPosts.length < total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const offset = useRef(initialPosts.length);
  const pending = useRef(false);
  const categoryMap = Object.fromEntries(categories.map(category => [category.id, category]));

  const loadMore = async () => {
    if (pending.current || !hasMore) return;
    pending.current = true;
    setLoading(true);
    setError(false);
    try {
      const result = await getPublishedBlogPosts({ limit: BLOG_PAGE_SIZE, offset: offset.current, categoryId, search });
      if (result.error) {
        setError(true);
        return;
      }
      offset.current += result.posts.length;
      setPosts(previous => {
        const ids = new Set(previous.map(post => post.id));
        return [...previous, ...result.posts.filter(post => !ids.has(post.id))];
      });
      setHasMore(result.posts.length > 0 && offset.current < result.total);
    } catch {
      setError(true);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  return (
    <>
      <div className="blog-grid" aria-busy={loading}>
        {posts.map(post => <BlogCard key={post.id} post={post} category={categoryMap[post.category_id || '']} />)}
      </div>
      {error && <div className="blog-error" role="alert">We couldn&apos;t load more articles. Please try again.</div>}
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <button type="button" className="b" disabled={loading} onClick={loadMore}>
            {loading ? 'Loading…' : error ? 'Try again' : 'Load more'}
          </button>
        </div>
      )}
    </>
  );
}
