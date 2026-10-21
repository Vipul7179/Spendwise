
import SkeletonImage from '@/components/common/SkeletonImage';
import Link from 'next/link';
import { LinkFeedback } from '@/components/common/NavigationFeedback';
import { BlogPost, BlogCategory } from '@/types/blog';
import { blogTimestampMeta, safeBlogImage } from '@/lib/blog';

interface BlogCardProps {
  post: BlogPost;
  category?: BlogCategory;
  compact?: boolean;
}

export default function BlogCard({ post, category, compact = false }: BlogCardProps) {
  const ts = blogTimestampMeta(post);
  const rawImage = safeBlogImage(post.cover_image_url);
  const image = rawImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80';
  const excerpt = post.excerpt ? post.excerpt.trim() : 'Practical ideas for a healthier financial life.';
  const maxLen = compact ? 125 : 170;
  const displayExcerpt = excerpt.length > maxLen ? `${excerpt.slice(0, maxLen - 3)}…` : excerpt;
  const href = `/blog/${encodeURIComponent(post.slug)}`;

  return (
    <article className="blog-card">
      <Link href={href} aria-label={`Read ${post.title}`}>
        {/* Using standard img with loading="lazy" for external dynamic images */}
        <SkeletonImage native
          src={image}
          alt={post.cover_alt || post.title}
          loading="lazy"
        />
        <LinkFeedback />
      </Link>
      <div className="content">
        <div className="meta">
          <span className="tag">{category ? category.name : 'General'}</span>
          <span title={ts.cardTitle}>{ts.cardLabel}</span>
        </div>
        <h3>
          <Link href={href}>{post.title}<LinkFeedback /></Link>
        </h3>
        <p>{displayExcerpt}</p>
      </div>
      <div className="foot">
        <span>{post.author_name || 'Hisbo Team'}</span>
        <Link href={href} className="g" aria-label="Read article">
          Read article &rarr;<LinkFeedback />
        </Link>
      </div>
    </article>
  );
}

